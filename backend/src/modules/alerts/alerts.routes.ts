import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../shared/middleware/authenticate'

export async function alertsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /alerts - todos os alertas do usuário
  app.get('/', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const profile = await prisma.clientProfile.findUnique({ where: { userId: sub } })
    if (!profile) return reply.send([])

    const units = await prisma.addressUnit.findMany({
      where: { clientProfileId: profile.id },
      select: { id: true },
    })
    const unitIds = units.map(u => u.id)

    const alerts = await prisma.alert.findMany({
      where: { addressUnitId: { in: unitIds } },
      include: { addressUnit: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return reply.send(alerts)
  })

  // PATCH /alerts/:id/read - Marca como lido
  app.patch('/:id/read', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { id } = req.params as { id: string }

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: { addressUnit: { include: { clientProfile: true } } },
    })

    if (!alert || alert.addressUnit.clientProfile.userId !== sub) {
      return reply.status(404).send({ error: 'Alerta não encontrado.' })
    }

    await prisma.alert.update({ where: { id }, data: { isRead: true } })
    return reply.status(204).send()
  })

  // PATCH /alerts/read-all - Marca todos como lidos
  app.patch('/read-all', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const profile = await prisma.clientProfile.findUnique({ where: { userId: sub } })
    if (!profile) return reply.status(204).send()

    const units = await prisma.addressUnit.findMany({
      where: { clientProfileId: profile.id },
      select: { id: true },
    })
    const unitIds = units.map(u => u.id)

    await prisma.alert.updateMany({
      where: { addressUnitId: { in: unitIds }, isRead: false },
      data: { isRead: true },
    })

    return reply.status(204).send()
  })
}
