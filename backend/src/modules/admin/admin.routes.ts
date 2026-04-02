import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireAdmin } from '../../shared/middleware/requireAdmin'

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  // GET /admin/stats - Métricas gerais
  app.get('/stats', async (_req, reply) => {
    const [totalUsers, totalUnits, totalBills, failedBills, pendingBills] = await Promise.all([
      prisma.user.count(),
      prisma.addressUnit.count({ where: { isActive: true } }),
      prisma.utilityBill.count(),
      prisma.utilityBill.count({ where: { status: 'FAILED' } }),
      prisma.utilityBill.count({ where: { status: { in: ['UPLOADED', 'PROCESSING'] } } }),
    ])

    return reply.send({ totalUsers, totalUnits, totalBills, failedBills, pendingBills })
  })

  // GET /admin/users - Lista usuários
  app.get('/users', async (req, reply) => {
    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string }
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: parseInt(limit),
        include: {
          profile: {
            select: {
              fullName: true,
              _count: { select: { addressUnits: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ])

    return reply.send({
      data: users.map(u => ({ ...u, password: undefined })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    })
  })

  // PATCH /admin/users/:id/toggle - Ativa/desativa usuário
  app.patch('/users/:id/toggle', async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' })
    if (user.role === 'ADMIN') return reply.status(403).send({ error: 'Não é possível desativar administradores.' })
    const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } })
    return reply.send({ id: updated.id, isActive: updated.isActive })
  })

  // POST /admin/bills/:id/reprocess - Reprocessa conta com falha
  app.post('/bills/:id/reprocess', async (req, reply) => {
    const { id } = req.params as { id: string }
    const bill = await prisma.utilityBill.findUnique({ where: { id } })
    if (!bill) return reply.status(404).send({ error: 'Conta não encontrada.' })
    const updated = await prisma.utilityBill.update({ where: { id }, data: { status: 'UPLOADED' } })
    return reply.send(updated)
  })

  // GET /admin/bills - Lista uploads recentes com status
  app.get('/bills', async (req, reply) => {
    const { page = '1', status } = req.query as { page?: string; status?: string }
    const skip = (parseInt(page) - 1) * 20

    const where = status ? { status: status as never } : {}

    const [bills, total] = await Promise.all([
      prisma.utilityBill.findMany({
        where,
        skip,
        take: 20,
        include: {
          addressUnit: {
            include: {
              clientProfile: { select: { fullName: true } },
            },
          },
          files: { select: { originalName: true, uploadedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.utilityBill.count({ where }),
    ])

    return reply.send({ data: bills, total, pages: Math.ceil(total / 20) })
  })
}
