import { prisma } from '../../lib/prisma'

interface CreateAddressInput {
  name: string
  consumerUnitCode?: string
  utility?: string
  zipCode?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  observations?: string
}

export class AddressesService {
  private async getProfileId(userId: string) {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } })
    if (!profile) throw new Error('Perfil do cliente não encontrado.')
    return profile.id
  }

  async list(userId: string) {
    const profileId = await this.getProfileId(userId)
    return prisma.addressUnit.findMany({
      where: { clientProfileId: profileId, isActive: true },
      include: {
        _count: { select: { energyPoints: true, utilityBills: true } },
        energyPoints: { where: { isActive: true }, select: { hasSolar: true, solarPowerKwp: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string, userId: string) {
    const profileId = await this.getProfileId(userId)
    const unit = await prisma.addressUnit.findFirst({
      where: { id, clientProfileId: profileId },
      include: {
        energyPoints: { where: { isActive: true } },
        _count: { select: { utilityBills: true } },
      },
    })
    if (!unit) throw new Error('Unidade não encontrada.')
    return unit
  }

  async create(userId: string, data: CreateAddressInput) {
    const profileId = await this.getProfileId(userId)
    return prisma.addressUnit.create({
      data: { ...data, clientProfileId: profileId },
    })
  }

  async update(id: string, userId: string, data: Partial<CreateAddressInput>) {
    const profileId = await this.getProfileId(userId)
    const unit = await prisma.addressUnit.findFirst({ where: { id, clientProfileId: profileId } })
    if (!unit) throw new Error('Unidade não encontrada.')
    return prisma.addressUnit.update({ where: { id }, data })
  }

  async remove(id: string, userId: string) {
    const profileId = await this.getProfileId(userId)
    const unit = await prisma.addressUnit.findFirst({ where: { id, clientProfileId: profileId } })
    if (!unit) throw new Error('Unidade não encontrada.')
    return prisma.addressUnit.update({ where: { id }, data: { isActive: false } })
  }
}
