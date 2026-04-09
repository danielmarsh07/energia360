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

  // GET /admin/ai-usage - Resumo de uso de IA (tokens + custo)
  app.get('/ai-usage', async (req, reply) => {
    const { period = 'month' } = req.query as { period?: 'month' | 'all' }

    const now = new Date()
    const since = period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(0)

    const [totalStats, byPlan, byUser, dailyUsage] = await Promise.all([
      // Totais gerais
      prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { inputTokens: true, outputTokens: true, totalTokens: true, costUsd: true },
        _count: { id: true },
      }),

      // Agrupado por plano
      prisma.aiUsageLog.groupBy({
        by: ['planSlug'],
        where: { createdAt: { gte: since } },
        _sum: { totalTokens: true, costUsd: true },
        _count: { id: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
      }),

      // Top usuários
      prisma.aiUsageLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _sum: { totalTokens: true, costUsd: true },
        _count: { id: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
        take: 10,
      }),

      // Uso diário (últimos 30 dias)
      prisma.$queryRaw<{ date: string; tokens: bigint; cost: number; count: bigint }[]>`
        SELECT
          DATE(created_at)::text AS date,
          SUM(total_tokens) AS tokens,
          SUM(cost_usd) AS cost,
          COUNT(id) AS count
        FROM ai_usage_logs
        WHERE created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ])

    // Enriquecer byUser com email
    const userIds = byUser.map(u => u.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, profile: { select: { fullName: true } } },
    })
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    return reply.send({
      period,
      totals: {
        extractions: totalStats._count.id,
        inputTokens: totalStats._sum.inputTokens ?? 0,
        outputTokens: totalStats._sum.outputTokens ?? 0,
        totalTokens: totalStats._sum.totalTokens ?? 0,
        costUsd: +(totalStats._sum.costUsd ?? 0).toFixed(4),
      },
      byPlan: byPlan.map(p => ({
        planSlug: p.planSlug ?? 'sem-plano',
        extractions: p._count.id,
        totalTokens: p._sum.totalTokens ?? 0,
        costUsd: +(p._sum.costUsd ?? 0).toFixed(4),
      })),
      byUser: byUser.map(u => ({
        userId: u.userId,
        email: userMap[u.userId]?.email ?? '—',
        name: userMap[u.userId]?.profile?.fullName ?? '—',
        extractions: u._count.id,
        totalTokens: u._sum.totalTokens ?? 0,
        costUsd: +(u._sum.costUsd ?? 0).toFixed(4),
      })),
      daily: dailyUsage.map(d => ({
        date: d.date,
        tokens: Number(d.tokens),
        cost: +Number(d.cost).toFixed(4),
        count: Number(d.count),
      })),
    })
  })

  // GET /admin/ai-usage/by-unit - tokens agrupados por unidade consumidora
  app.get('/ai-usage/by-unit', async (req, reply) => {
    const { period = 'month' } = req.query as { period?: 'month' | 'all' }
    const now = new Date()
    const since = period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(0)

    const rows = await prisma.$queryRaw<{
      unit_id: string; unit_name: string; client_name: string
      extractions: bigint; total_tokens: bigint; cost_usd: number
    }[]>`
      SELECT
        au.id            AS unit_id,
        au.name          AS unit_name,
        cp.full_name     AS client_name,
        COUNT(al.id)     AS extractions,
        SUM(al.total_tokens) AS total_tokens,
        SUM(al.cost_usd)     AS cost_usd
      FROM ai_usage_logs al
      JOIN utility_bills ub ON al.bill_id = ub.id
      JOIN address_units au ON ub.address_unit_id = au.id
      JOIN client_profiles cp ON au.client_profile_id = cp.id
      WHERE al.created_at >= ${since}
      GROUP BY au.id, au.name, cp.full_name
      ORDER BY total_tokens DESC
    `

    return reply.send(rows.map(r => ({
      unitId: r.unit_id,
      unitName: r.unit_name,
      clientName: r.client_name,
      extractions: Number(r.extractions),
      totalTokens: Number(r.total_tokens),
      costUsd: +Number(r.cost_usd).toFixed(4),
    })))
  })

  // GET /admin/ai-usage/by-bill - detalhe de tokens por conta analisada
  app.get('/ai-usage/by-bill', async (req, reply) => {
    const { period = 'month' } = req.query as { period?: 'month' | 'all' }
    const now = new Date()
    const since = period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(0)

    const rows = await prisma.$queryRaw<{
      log_id: string; bill_id: string; ref_month: number; ref_year: number
      unit_name: string; client_name: string; model: string
      input_tokens: number; output_tokens: number; total_tokens: number
      cost_usd: number; success: boolean; created_at: Date
    }[]>`
      SELECT
        al.id            AS log_id,
        al.bill_id,
        ub.reference_month AS ref_month,
        ub.reference_year  AS ref_year,
        au.name            AS unit_name,
        cp.full_name       AS client_name,
        al.model,
        al.input_tokens,
        al.output_tokens,
        al.total_tokens,
        al.cost_usd,
        al.success,
        al.created_at
      FROM ai_usage_logs al
      JOIN utility_bills ub ON al.bill_id = ub.id
      JOIN address_units au ON ub.address_unit_id = au.id
      JOIN client_profiles cp ON au.client_profile_id = cp.id
      WHERE al.created_at >= ${since}
      ORDER BY al.created_at DESC
      LIMIT 100
    `

    return reply.send(rows.map(r => ({
      logId: r.log_id,
      billId: r.bill_id,
      refMonth: r.ref_month,
      refYear: r.ref_year,
      unitName: r.unit_name,
      clientName: r.client_name,
      model: r.model,
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      totalTokens: Number(r.total_tokens),
      costUsd: +Number(r.cost_usd).toFixed(4),
      success: r.success,
      createdAt: r.created_at,
    })))
  })

  // GET /admin/ai-usage/plans-quota - limites e uso por plano este mês
  app.get('/ai-usage/plans-quota', async (_req, reply) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: { userId: true },
        },
      },
      orderBy: { order: 'asc' },
    })

    const result = await Promise.all(plans.map(async (plan) => {
      const userIds = plan.subscriptions.map(s => s.userId)
      const usage = await prisma.aiUsageLog.aggregate({
        where: {
          userId: { in: userIds },
          createdAt: { gte: startOfMonth },
          success: true,
        },
        _sum: { totalTokens: true, costUsd: true },
        _count: { id: true },
      })

      return {
        planSlug: plan.slug,
        planName: plan.name,
        subscribers: userIds.length,
        aiExtractionsPerMonth: plan.aiExtractionsPerMonth,
        extractionsUsed: usage._count.id,
        totalTokens: usage._sum.totalTokens ?? 0,
        costUsd: +(usage._sum.costUsd ?? 0).toFixed(4),
      }
    }))

    return reply.send(result)
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
