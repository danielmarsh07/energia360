import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../shared/middleware/authenticate'

export async function plansRoutes(app: FastifyInstance) {
  // GET /plans - lista todos os planos ativos (público)
  app.get('/', async (_req, reply) => {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        modules: {
          include: { module: { select: { slug: true, name: true } } },
        },
      },
      orderBy: { order: 'asc' },
    })
    return reply.send(plans)
  })

  // GET /plans/subscription - assinatura do usuário logado
  app.get('/subscription', { preHandler: [authenticate] }, async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const subscription = await prisma.subscription.findUnique({
      where: { userId: sub },
      include: {
        plan: {
          include: {
            modules: {
              include: { module: { select: { slug: true, name: true } } },
            },
          },
        },
      },
    })
    return reply.send(subscription)
  })

  // PATCH /plans/subscription - trocar de plano
  app.patch('/subscription', { preHandler: [authenticate] }, async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { planSlug } = req.body as { planSlug: string }

    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado.' })

    const subscription = await prisma.subscription.upsert({
      where: { userId: sub },
      update: { planId: plan.id, status: 'ACTIVE' },
      create: { userId: sub, planId: plan.id, status: 'ACTIVE' },
      include: { plan: true },
    })

    return reply.send(subscription)
  })
}
