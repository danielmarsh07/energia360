import { EnergyPointType } from '@prisma/client'
import { prisma } from '../../lib/prisma'

interface CreateEnergyPointInput {
  name: string
  pointType?: EnergyPointType
  hasSolar?: boolean
  solarPowerKwp?: number
  panelsCount?: number
  installDate?: string
  inverterModel?: string
  technicalNotes?: string
}

export class EnergyPointsService {
  private async verifyUnitOwnership(unitId: string, userId: string) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } })
    if (!profile) throw new Error('Perfil não encontrado.')
    const unit = await prisma.addressUnit.findFirst({
      where: { id: unitId, clientProfileId: profile.id },
    })
    if (!unit) throw new Error('Unidade não encontrada.')
    return unit
  }

  async list(unitId: string, userId: string) {
    await this.verifyUnitOwnership(unitId, userId)
    return prisma.energyPoint.findMany({
      where: { addressUnitId: unitId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(unitId: string, userId: string, data: CreateEnergyPointInput) {
    await this.verifyUnitOwnership(unitId, userId)
    return prisma.energyPoint.create({
      data: {
        ...data,
        installDate: data.installDate ? new Date(data.installDate) : undefined,
        addressUnitId: unitId,
      },
    })
  }

  async update(id: string, userId: string, data: Partial<CreateEnergyPointInput>) {
    const point = await prisma.energyPoint.findUnique({
      where: { id },
      include: { addressUnit: { include: { clientProfile: true } } },
    })
    if (!point || point.addressUnit.clientProfile.userId !== userId) {
      throw new Error('Ponto de energia não encontrado.')
    }
    return prisma.energyPoint.update({
      where: { id },
      data: {
        ...data,
        installDate: data.installDate ? new Date(data.installDate) : undefined,
      },
    })
  }

  async remove(id: string, userId: string) {
    const point = await prisma.energyPoint.findUnique({
      where: { id },
      include: { addressUnit: { include: { clientProfile: true } } },
    })
    if (!point || point.addressUnit.clientProfile.userId !== userId) {
      throw new Error('Ponto de energia não encontrado.')
    }
    return prisma.energyPoint.update({ where: { id }, data: { isActive: false } })
  }
}
