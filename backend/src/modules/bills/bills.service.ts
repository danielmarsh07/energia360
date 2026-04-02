import { BillStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import path from 'path'
import fs from 'fs'

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
        files: { select: { id: true, originalName: true, uploadedAt: true } },
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
    return prisma.utilityBill.create({
      data: {
        addressUnitId: unitId,
        referenceMonth: data.referenceMonth,
        referenceYear: data.referenceYear,
        status: BillStatus.UPLOADED,
      },
    })
  }

  async attachFile(billId: string, fileData: {
    fileName: string
    originalName: string
    mimeType: string
    fileSize: number
    filePath: string
  }) {
    return prisma.utilityBillFile.create({
      data: { billId, ...fileData },
    })
  }

  async updateStatus(billId: string, status: BillStatus) {
    return prisma.utilityBill.update({ where: { id: billId }, data: { status } })
  }

  /**
   * Salva/atualiza os dados extraídos da conta.
   * Atualmente retorna dados mockados — preparado para integração com OCR real.
   */
  async saveExtractedData(billId: string, data: Record<string, unknown>) {
    return prisma.utilityBillExtractedData.upsert({
      where: { billId },
      create: { billId, ...data },
      update: { ...data, updatedAt: new Date() },
    })
  }

  /**
   * Simula extração de dados (mock).
   * Em produção: integrar com serviço de OCR / IA.
   */
  async mockExtract(billId: string) {
    const bill = await prisma.utilityBill.findUnique({ where: { id: billId } })
    if (!bill) throw new Error('Conta não encontrada.')

    // Simula um delay de processamento
    await new Promise(r => setTimeout(r, 500))

    const mockData = {
      consumptionKwh: Math.floor(Math.random() * 300) + 150,
      totalAmount: +(Math.random() * 300 + 80).toFixed(2),
      energyAmount: +(Math.random() * 200 + 50).toFixed(2),
      injectedEnergyKwh: Math.floor(Math.random() * 200) + 50,
      energyCreditsKwh: Math.floor(Math.random() * 100) + 20,
      previousReading: Math.floor(Math.random() * 10000) + 5000,
      currentReading: 0,
      avgConsumption: Math.floor(Math.random() * 50) + 180,
      confidence: 0.87,
      isManuallyReviewed: false,
    }
    mockData.currentReading = mockData.previousReading + mockData.consumptionKwh

    await this.saveExtractedData(billId, mockData)
    await this.updateStatus(billId, BillStatus.EXTRACTED)

    // Atualiza histórico de consumo
    const unit = await prisma.addressUnit.findUnique({ where: { id: bill.addressUnitId } })
    if (unit) {
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
          consumptionKwh: mockData.consumptionKwh,
          totalAmount: mockData.totalAmount,
          injectedKwh: mockData.injectedEnergyKwh,
          creditsKwh: mockData.energyCreditsKwh,
          estimatedSavings: +(mockData.injectedEnergyKwh * 0.85).toFixed(2),
        },
        update: {
          consumptionKwh: mockData.consumptionKwh,
          totalAmount: mockData.totalAmount,
          injectedKwh: mockData.injectedEnergyKwh,
          creditsKwh: mockData.energyCreditsKwh,
          estimatedSavings: +(mockData.injectedEnergyKwh * 0.85).toFixed(2),
        },
      })
    }

    return mockData
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

    // Remove o arquivo físico se existir
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath)
    }

    return prisma.utilityBillFile.delete({ where: { id: fileId } })
  }
}
