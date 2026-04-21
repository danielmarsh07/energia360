import { BillStatus, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { env } from '../../config/env'
import Anthropic from '@anthropic-ai/sdk'
import { v2 as cloudinary } from 'cloudinary'
import { EXTRACTION_PROMPT_V2, mapV2ToSchema, parseExtractionResponse } from './extraction-prompt'
import { auditBill } from './audit'
import type { ExtractedBillV2, AuditReport } from './audit/types'

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

// Prompt v2 importado de extraction-prompt.ts

// =============================================
// Helper: download de URL para buffer (com redirect)
// =============================================
async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao baixar arquivo: HTTP ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length === 0) throw new Error('Arquivo baixado está vazio.')
  return buffer
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
          access_mode: 'public',
          type: 'upload',
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
    // Sanitiza campos antes de salvar — converte datas string para Date e remove campos desconhecidos
    const knownFields = [
      // v1 legacy
      'utilityName','consumerUnitCode','referenceMonthStr',
      'previousReading','currentReading','consumptionKwh',
      'injectedEnergyKwh','energyCreditsKwh','totalAmount',
      'energyAmount','networkUsageFee','avgConsumption',
      'dueDate','readingDate','isManuallyReviewed','confidence','rawJson',
      // v2 — identificação
      'utilityLegalName','utilityCnpj',
      'invoiceNumber','invoiceSeries','invoiceAccessKey','invoiceCfop',
      'invoiceAuthProtocol','invoiceIssueDate','barcodeLine','paymentMethod',
      // v2 — titular
      'holderName','holderTaxId','supplyAddress','supplyCity','supplyState','supplyZipCode',
      // v2 — classificação
      'tariffClass','tariffSubgroup','tariffModality','supplyPhase',
      'isDistributedGeneration','installedCapacityKwp',
      // v2 — período/bandeira
      'billingDays','nextReadingDate','tariffFlag','tariffFlagAmount',
      // v2 — consumo
      'meteredConsumptionKwh','billedConsumptionKwh',
      // v2 — SCEE
      'injectedKwhTusd','injectedTusdValue','injectedTusdUnitPrice',
      'injectedKwhTe','injectedTeValue','injectedTeUnitPrice',
      'suppliedKwhTusd','suppliedTusdValue','suppliedTusdUnitPrice',
      'suppliedKwhTe','suppliedTeValue','suppliedTeUnitPrice',
      'creditBalanceKwh','creditsUsedKwh','creditsExpiringKwh','creditsExpiringMonth',
      // v2 — tributos
      'icmsBase','icmsRate','icmsValue',
      'pisBase','pisRate','pisValue',
      'cofinsBase','cofinsRate','cofinsValue',
      'publicLightingFee','publicLightingMunicipality',
      // v2 — observações/meta
      'tariffAdjustmentNote','observations','isSampleBill','extractionModel',
    ]
    const dateFields = new Set([
      'dueDate', 'readingDate', 'invoiceIssueDate', 'nextReadingDate', 'creditsExpiringMonth',
    ])
    const sanitized: Record<string, unknown> = {}
    for (const key of knownFields) {
      if (!(key in data)) continue
      const val = data[key]
      if (dateFields.has(key) && typeof val === 'string') {
        sanitized[key] = val ? new Date(val) : null
      } else {
        sanitized[key] = val ?? null
      }
    }

    return prisma.utilityBillExtractedData.upsert({
      where: { billId },
      create: { billId, ...sanitized },
      update: { ...sanitized, updatedAt: new Date() },
    })
  }

  /**
   * Persiste a extração v2 completa: campos escalares + filhos em transação.
   * Limpa filhos anteriores da mesma conta (re-extração substitui tudo).
   */
  async saveFullV2Extraction(
    billId: string,
    mapped: ReturnType<typeof mapV2ToSchema>,
    rawJson: Record<string, unknown>,
  ) {
    // Prisma tipa Json como valor estrito — cast controlado apenas no campo rawJson.
    const rawJsonInput = rawJson as unknown as Prisma.InputJsonValue
    // O mapper já normalizou enums via asEnum(); `as any` é necessário porque
    // scalar é Record<string, unknown> genérico e não casa com o tipo gerado
    // do Prisma (que tem unions de enum). Sem casting, teríamos que duplicar
    // a lista de campos como literal para o TS inferir corretamente.
    const scalarInput = mapped.scalar as unknown as Prisma.UtilityBillExtractedDataUncheckedUpdateInput

    return prisma.$transaction(async (tx) => {
      const extracted = await tx.utilityBillExtractedData.upsert({
        where: { billId },
        create: {
          ...(scalarInput as unknown as Prisma.UtilityBillExtractedDataUncheckedCreateInput),
          billId,
          rawJson: rawJsonInput,
          isManuallyReviewed: false,
        },
        update: {
          ...scalarInput,
          rawJson: rawJsonInput,
          isManuallyReviewed: false,
          updatedAt: new Date(),
        },
      })

      // Substitui filhos (idempotente — re-extração limpa e recria)
      await tx.utilityBillLineItem.deleteMany({ where: { extractedDataId: extracted.id } })
      await tx.utilityBillMeter.deleteMany({ where: { extractedDataId: extracted.id } })
      await tx.utilityBillCreditLot.deleteMany({ where: { extractedDataId: extracted.id } })
      await tx.utilityBillMonthlyHistory.deleteMany({ where: { extractedDataId: extracted.id } })

      if (mapped.lineItems.length > 0) {
        await tx.utilityBillLineItem.createMany({
          data: mapped.lineItems.map((li) => ({
            ...li,
            lineType: li.lineType as Prisma.UtilityBillLineItemCreateManyInput['lineType'],
            creditGroup: li.creditGroup as Prisma.UtilityBillLineItemCreateManyInput['creditGroup'],
            extractedDataId: extracted.id,
          })),
        })
      }
      if (mapped.meters.length > 0) {
        await tx.utilityBillMeter.createMany({
          data: mapped.meters.map((m) => ({ ...m, extractedDataId: extracted.id })),
        })
      }
      if (mapped.creditLots.length > 0) {
        await tx.utilityBillCreditLot.createMany({
          data: mapped.creditLots.map((c) => ({
            ...c,
            group: c.group as Prisma.UtilityBillCreditLotCreateManyInput['group'],
            extractedDataId: extracted.id,
          })),
        })
      }
      if (mapped.monthlyHistory.length > 0) {
        await tx.utilityBillMonthlyHistory.createMany({
          data: mapped.monthlyHistory.map((h) => ({ ...h, extractedDataId: extracted.id })),
        })
      }

      return extracted
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
  // buffer opcional: se fornecido, usa direto (evita re-download do Cloudinary)
  // =============================================
  async extractWithAI(billId: string, userId: string, inlineBuffer?: Buffer, inlineMimeType?: string) {
    const bill = await prisma.utilityBill.findUnique({
      where: { id: billId },
      include: { files: true },
    })
    if (!bill) throw new Error('Conta não encontrada.')

    const file = bill.files[0]
    if (!file && !inlineBuffer) throw new Error('Nenhum arquivo encontrado. Faça o upload antes de extrair.')

    // Verificar limite do plano
    const { planSlug, withinLimit } = await this.checkExtractionLimit(userId)
    if (!withinLimit) {
      throw new Error('Limite de extrações com IA atingido para este mês. Faça upgrade do seu plano.')
    }

    await this.updateStatus(billId, BillStatus.PROCESSING)

    const model = env.AI_MODEL
    const mimeType = inlineMimeType ?? file?.mimeType ?? 'application/pdf'
    const isPdf = mimeType === 'application/pdf'

    let inputTokens = 0
    let outputTokens = 0
    let success = true
    let errorMessage: string | undefined

    try {
      let messageContent: Anthropic.MessageParam['content']

      if (isPdf) {
        // PDFs precisam de base64 — usa buffer inline (upload recente) ou baixa do Cloudinary
        let pdfBuffer: Buffer
        if (inlineBuffer) {
          pdfBuffer = inlineBuffer
        } else {
          const fileUrl = file?.cloudinaryUrl
          if (!fileUrl) throw new Error('Arquivo não disponível. Reenvie o PDF.')
          // Gera URL assinada do Cloudinary para evitar 401 em raw files
          const signedUrl = cloudinary.utils.private_download_url(
            file!.cloudinaryPublicId ?? fileUrl,
            'pdf',
            { resource_type: 'raw', attachment: false }
          )
          pdfBuffer = await downloadBuffer(signedUrl)
        }
        const base64 = pdfBuffer.toString('base64')
        messageContent = [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as Anthropic.DocumentBlockParam,
          { type: 'text', text: EXTRACTION_PROMPT_V2 },
        ]
      } else {
        // Imagens: URL direta do Cloudinary (sem download)
        const fileUrl = inlineBuffer
          ? `data:${mimeType};base64,${inlineBuffer.toString('base64')}`
          : file?.cloudinaryUrl
        if (!fileUrl) throw new Error('Arquivo não disponível. Reenvie a imagem.')
        messageContent = [
          {
            type: 'image',
            source: inlineBuffer
              ? { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png', data: inlineBuffer.toString('base64') }
              : { type: 'url', url: fileUrl },
          } as Anthropic.ImageBlockParam,
          { type: 'text', text: EXTRACTION_PROMPT_V2 },
        ]
      }

      const response = await anthropic.messages.create({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: messageContent }],
      })

      inputTokens = response.usage.input_tokens
      outputTokens = response.usage.output_tokens

      // Parsear o JSON v2 retornado pelo Claude
      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const v2 = parseExtractionResponse(rawText)
      if (!v2) throw new Error('Resposta da IA não contém JSON válido.')

      // Mapeia v2 completo → campos escalares + filhos + salva em transação
      const mapped = mapV2ToSchema(v2, model)
      await this.saveFullV2Extraction(billId, mapped, {
        model,
        v2,
        rawText,
        extractedAt: new Date().toISOString(),
      })

      await this.updateStatus(billId, BillStatus.EXTRACTED)

      // Atualizar histórico de consumo (tabela agregada)
      const billedKwh = (mapped.scalar.consumptionKwh ?? mapped.scalar.billedConsumptionKwh) as number | null
      const total = mapped.scalar.totalAmount as number | null
      if (billedKwh !== null && total !== null) {
        const injected = mapped.scalar.injectedEnergyKwh as number | null
        const credits = mapped.scalar.energyCreditsKwh as number | null
        const savings = injected ? +(injected * 0.85).toFixed(2) : null

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
            consumptionKwh: billedKwh,
            totalAmount: total,
            injectedKwh: injected,
            creditsKwh: credits,
            estimatedSavings: savings,
          },
          update: {
            consumptionKwh: billedKwh,
            totalAmount: total,
            injectedKwh: injected,
            creditsKwh: credits,
            estimatedSavings: savings,
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

      return v2

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

  /**
   * Roda as regras de auditoria contra o JSON v2 já persistido em rawJson.
   * Não chama a API Anthropic — só processamento local. Se a conta ainda não
   * tiver extração v2 (bills antigas), retorna INSUFFICIENT_DATA.
   */
  async auditExtracted(billId: string, userId: string): Promise<AuditReport> {
    const bill = await this.findById(billId, userId)
    const raw = bill.extractedData?.rawJson as { v2?: ExtractedBillV2 } | null
    const v2 = raw?.v2 ?? null

    if (!v2) {
      throw new Error(
        'Esta conta foi extraída com o formato antigo. Reenvie o arquivo (botão "Reenviar") para habilitar a auditoria.'
      )
    }

    const utility = bill.extractedData?.utilityName ?? 'Conta'
    const ref = `${utility} ${bill.referenceMonth}/${bill.referenceYear}`
    return auditBill(v2, ref)
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
