import { BillStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { env } from '../../config/env'
import Anthropic from '@anthropic-ai/sdk'
import { v2 as cloudinary } from 'cloudinary'
import https from 'https'
import http from 'http'

// =============================================
// Configuração Cloudinary
// =============================================
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

// =============================================
// Configuração Anthropic
// =============================================
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

// Taxas de custo por modelo (USD por token)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.0000008, output: 0.000004 },
  'claude-sonnet-4-6':        { input: 0.000003,  output: 0.000015 },
  'claude-opus-4-6':          { input: 0.000015,  output: 0.000075 },
}

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = MODEL_COSTS[model] ?? MODEL_COSTS['claude-haiku-4-5-20251001']
  return +(inputTokens * rates.input + outputTokens * rates.output).toFixed(6)
}

// =============================================
// Prompt de extração
// =============================================
const EXTRACTION_PROMPT = `Você é um especialista em análise de contas de energia elétrica brasileiras.
Analise a imagem/documento desta conta e extraia os dados estruturados abaixo.
Retorne APENAS um JSON válido, sem texto adicional, com exatamente este formato:

{
  "utilityName": "nome da concessionária (ex: CEMIG, ENEL, LIGHT, COPEL)",
  "consumerUnitCode": "código da unidade consumidora (UC)",
  "referenceMonthStr": "mês/ano de referência (ex: 03/2025)",
  "previousReading": número ou null,
  "currentReading": número ou null,
  "consumptionKwh": número ou null,
  "injectedEnergyKwh": número ou null,
  "energyCreditsKwh": número ou null,
  "totalAmount": número ou null,
  "energyAmount": número ou null,
  "networkUsageFee": número ou null,
  "avgConsumption": número ou null,
  "dueDate": "YYYY-MM-DD" ou null,
  "readingDate": "YYYY-MM-DD" ou null,
  "confidence": número entre 0 e 1 indicando sua confiança na extração
}

Regras:
- Todos os valores numéricos em kWh ou R$ devem ser números (não strings)
- dueDate e readingDate devem estar no formato ISO YYYY-MM-DD ou null
- Se um campo não existir na conta, use null
- confidence deve refletir a qualidade da imagem e clareza dos dados`

// =============================================
// Helper: download de URL para buffer
// =============================================
function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// =============================================
// BillsService
// =============================================
export class BillsService {
  private async verifyUnitOwnership(unitId: string, userId: string) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } })
    if (!profile) throw new Error('Perfil não encontrado.')
    const unit = await prisma.addressUnit.findFirst({
      where: { id: unitId, clientProfileId: profile.id },
    })
    if (!unit) throw new Error('Unidade não encontrada.')
    return unit
  }

  async listByUnit(unitId: string, userId: string, filters?: { year?: number }) {
    await this.verifyUnitOwnership(unitId, userId)
    return prisma.utilityBill.findMany({
      where: {
        addressUnitId: unitId,
        ...(filters?.year ? { referenceYear: filters.year } : {}),
      },
      include: {
        files: { select: { id: true, originalName: true, uploadedAt: true, cloudinaryUrl: true } },
        extractedData: true,
      },
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
    })
  }

  async findById(id: string, userId: string) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } })
    if (!profile) throw new Error('Perfil não encontrado.')

    const bill = await prisma.utilityBill.findFirst({
      where: {
        id,
        addressUnit: { clientProfileId: profile.id },
      },
      include: {
        files: true,
        extractedData: true,
        addressUnit: true,
      },
    })
    if (!bill) throw new Error('Conta não encontrada.')
    return bill
  }

  async create(unitId: string, userId: string, data: { referenceMonth: number; referenceYear: number }) {
    await this.verifyUnitOwnership(unitId, userId)

    const existing = await prisma.utilityBill.findFirst({
      where: { addressUnitId: unitId, referenceMonth: data.referenceMonth, referenceYear: data.referenceYear },
    })
    if (existing) {
      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
      throw new Error(`Já existe uma conta registrada para ${monthNames[data.referenceMonth - 1]}/${data.referenceYear}.`)
    }

    return prisma.utilityBill.create({
      data: {
        addressUnitId: unitId,
        referenceMonth: data.referenceMonth,
        referenceYear: data.referenceYear,
        status: BillStatus.UPLOADED,
      },
    })
  }

  // =============================================
  // Upload para Cloudinary
  // =============================================
  async uploadToCloudinary(buffer: Buffer, originalName: string, mimeType: string, billId: string) {
    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const ext = originalName.split('.').pop()?.toLowerCase() ?? 'pdf'
      const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image'

      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `energia360/bills/${billId}`,
          public_id: `${Date.now()}.${ext}`,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload falhou.'))
          resolve({ url: result.secure_url, publicId: result.public_id })
        }
      )
      stream.end(buffer)
    })
  }

  async attachFile(billId: string, fileData: {
    fileName: string
    originalName: string
    mimeType: string
    fileSize: number
    filePath: string
    cloudinaryUrl?: string
    cloudinaryPublicId?: string
  }) {
    return prisma.utilityBillFile.create({
      data: { billId, ...fileData },
    })
  }

  async updateStatus(billId: string, status: BillStatus) {
    return prisma.utilityBill.update({ where: { id: billId }, data: { status } })
  }

  async saveExtractedData(billId: string, data: Record<string, unknown>) {
    return prisma.utilityBillExtractedData.upsert({
      where: { billId },
      create: { billId, ...data },
      update: { ...data, updatedAt: new Date() },
    })
  }

  // =============================================
  // Verificar limite de extrações do plano
  // =============================================
  private async checkExtractionLimit(userId: string): Promise<{ planSlug: string | null; withinLimit: boolean }> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    })

    if (!subscription) return { planSlug: null, withinLimit: true }

    const plan = subscription.plan
    if (plan.aiExtractionsPerMonth === null) return { planSlug: plan.slug, withinLimit: true }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const usedThisMonth = await prisma.aiUsageLog.count({
      where: {
        userId,
        action: 'bill_extraction',
        success: true,
        createdAt: { gte: startOfMonth },
      },
    })

    return {
      planSlug: plan.slug,
      withinLimit: usedThisMonth < plan.aiExtractionsPerMonth,
    }
  }

  // =============================================
  // Extração real com Claude AI
  // =============================================
  async extractWithAI(billId: string, userId: string) {
    const bill = await prisma.utilityBill.findUnique({
      where: { id: billId },
      include: { files: true },
    })
    if (!bill) throw new Error('Conta não encontrada.')

    const file = bill.files[0]
    if (!file) throw new Error('Nenhum arquivo encontrado. Faça o upload antes de extrair.')

    // Verificar limite do plano
    const { planSlug, withinLimit } = await this.checkExtractionLimit(userId)
    if (!withinLimit) {
      throw new Error('Limite de extrações com IA atingido para este mês. Faça upgrade do seu plano.')
    }

    await this.updateStatus(billId, BillStatus.PROCESSING)

    const model = env.AI_MODEL

    // Obter a URL do arquivo
    const fileUrl = file.cloudinaryUrl
    if (!fileUrl) throw new Error('Arquivo não disponível no Cloudinary. Reenvie o arquivo.')

    let inputTokens = 0
    let outputTokens = 0
    let success = true
    let errorMessage: string | undefined

    try {
      // Baixar o arquivo para enviar como base64
      const buffer = await downloadBuffer(fileUrl)
      const base64 = buffer.toString('base64')
      const isPdf = file.mimeType === 'application/pdf'

      // Montar o conteúdo para a API do Claude
      const messageContent: Anthropic.MessageParam['content'] = isPdf
        ? [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as Anthropic.DocumentBlockParam,
            { type: 'text', text: EXTRACTION_PROMPT },
          ]
        : [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            } as Anthropic.ImageBlockParam,
            { type: 'text', text: EXTRACTION_PROMPT },
          ]

      const response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: messageContent }],
      })

      inputTokens = response.usage.input_tokens
      outputTokens = response.usage.output_tokens

      // Parsear o JSON retornado pelo Claude
      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido.')

      const extracted = JSON.parse(jsonMatch[0]) as Record<string, unknown>

      // Salvar dados extraídos
      await this.saveExtractedData(billId, {
        ...extracted,
        isManuallyReviewed: false,
        rawJson: { model, rawText, extractedAt: new Date().toISOString() },
      })

      await this.updateStatus(billId, BillStatus.EXTRACTED)

      // Atualizar histórico de consumo
      if (extracted.consumptionKwh !== null && extracted.totalAmount !== null) {
        await prisma.consumptionHistory.upsert({
          where: {
            addressUnitId_month_year: {
              addressUnitId: bill.addressUnitId,
              month: bill.referenceMonth,
              year: bill.referenceYear,
            },
          },
          create: {
            addressUnitId: bill.addressUnitId,
            month: bill.referenceMonth,
            year: bill.referenceYear,
            consumptionKwh: extracted.consumptionKwh as number ?? null,
            totalAmount: extracted.totalAmount as number ?? null,
            injectedKwh: extracted.injectedEnergyKwh as number ?? null,
            creditsKwh: extracted.energyCreditsKwh as number ?? null,
            estimatedSavings: extracted.injectedEnergyKwh
              ? +((extracted.injectedEnergyKwh as number) * 0.85).toFixed(2)
              : null,
          },
          update: {
            consumptionKwh: extracted.consumptionKwh as number ?? null,
            totalAmount: extracted.totalAmount as number ?? null,
            injectedKwh: extracted.injectedEnergyKwh as number ?? null,
            creditsKwh: extracted.energyCreditsKwh as number ?? null,
            estimatedSavings: extracted.injectedEnergyKwh
              ? +((extracted.injectedEnergyKwh as number) * 0.85).toFixed(2)
              : null,
          },
        })
      }

      // Registrar log de uso
      await prisma.aiUsageLog.create({
        data: {
          userId,
          billId,
          model,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          costUsd: calcCost(model, inputTokens, outputTokens),
          action: 'bill_extraction',
          planSlug,
          success: true,
        },
      })

      return extracted

    } catch (err) {
      success = false
      errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'

      // Log mesmo em caso de falha (para auditoria)
      await prisma.aiUsageLog.create({
        data: {
          userId,
          billId,
          model,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          costUsd: calcCost(model, inputTokens, outputTokens),
          action: 'bill_extraction',
          planSlug,
          success,
          errorMessage,
        },
      })

      await this.updateStatus(billId, BillStatus.FAILED)
      throw new Error(errorMessage)
    }
  }

  async validateBill(billId: string, userId: string, data: Record<string, unknown>) {
    const bill = await this.findById(billId, userId)
    if (!bill) throw new Error('Conta não encontrada.')

    await this.saveExtractedData(billId, { ...data, isManuallyReviewed: true })
    await this.updateStatus(billId, BillStatus.VALIDATED)

    return prisma.utilityBill.findUnique({
      where: { id: billId },
      include: { extractedData: true },
    })
  }

  async getHistory(unitId: string, userId: string) {
    await this.verifyUnitOwnership(unitId, userId)
    return prisma.consumptionHistory.findMany({
      where: { addressUnitId: unitId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await prisma.utilityBillFile.findUnique({
      where: { id: fileId },
      include: {
        bill: {
          include: { addressUnit: { include: { clientProfile: true } } },
        },
      },
    })
    if (!file || file.bill.addressUnit.clientProfile.userId !== userId) {
      throw new Error('Arquivo não encontrado.')
    }

    // Remove do Cloudinary se existir
    if (file.cloudinaryPublicId) {
      const resourceType = file.mimeType === 'application/pdf' ? 'raw' : 'image'
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: resourceType }).catch(() => null)
    }

    return prisma.utilityBillFile.delete({ where: { id: fileId } })
  }
}
