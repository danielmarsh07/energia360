import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../shared/middleware/authenticate'

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /dashboard - Dados do dashboard principal
  app.get('/', async (req, reply) => {
    const { sub } = req.user as { sub: string }

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: sub },
      include: { addressUnits: { where: { isActive: true }, select: { id: true } } },
    })

    if (!profile || profile.addressUnits.length === 0) {
      return reply.send({
        totalUnits: 0,
        totalBills: 0,
        activeAlerts: 0,
        currentMonthConsumption: null,
        currentMonthAmount: null,
        totalSavings: null,
        monthlyHistory: [],
        recentAlerts: [],
        lastBill: null,
      })
    }

    const unitIds = profile.addressUnits.map(u => u.id)
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Histórico de consumo (últimos 12 meses)
    const history = await prisma.consumptionHistory.findMany({
      where: { addressUnitId: { in: unitIds } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })

    // Agrupa por mês/ano (soma de todas as unidades)
    const monthlyMap = new Map<string, {
      month: number; year: number; consumption: number; amount: number; savings: number
    }>()

    for (const h of history) {
      const key = `${h.year}-${h.month}`
      const existing = monthlyMap.get(key) || { month: h.month, year: h.year, consumption: 0, amount: 0, savings: 0 }
      monthlyMap.set(key, {
        ...existing,
        consumption: existing.consumption + (h.consumptionKwh || 0),
        amount: existing.amount + (h.totalAmount || 0),
        savings: existing.savings + (h.estimatedSavings || 0),
      })
    }

    const monthlyHistory = Array.from(monthlyMap.values()).slice(-12)

    // Mês atual
    const currentKey = `${currentYear}-${currentMonth}`
    const currentMonthData = monthlyMap.get(currentKey)

    // Total de economias
    const totalSavings = Array.from(monthlyMap.values()).reduce((sum, m) => sum + m.savings, 0)

    // Alertas ativos
    const activeAlerts = await prisma.alert.count({
      where: { addressUnitId: { in: unitIds }, isRead: false },
    })

    // Última conta validada
    const lastBill = await prisma.utilityBill.findFirst({
      where: {
        addressUnitId: { in: unitIds },
        status: { in: ['VALIDATED', 'EXTRACTED'] },
      },
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
      include: {
        extractedData: true,
        addressUnit: { select: { name: true } },
      },
    })

    // Alertas recentes
    const recentAlerts = await prisma.alert.findMany({
      where: { addressUnitId: { in: unitIds } },
      include: { addressUnit: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return reply.send({
      totalUnits: profile.addressUnits.length,
      totalBills: await prisma.utilityBill.count({ where: { addressUnitId: { in: unitIds } } }),
      activeAlerts,
      currentMonthConsumption: currentMonthData?.consumption || null,
      currentMonthAmount: currentMonthData?.amount || null,
      totalSavings,
      monthlyHistory,
      recentAlerts,
      lastBill,
    })
  })

  // GET /dashboard/reports - Dados de relatórios
  app.get('/reports', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { unitId, year } = req.query as { unitId?: string; year?: string }

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: sub },
      include: { addressUnits: { where: { isActive: true }, select: { id: true, name: true } } },
    })
    if (!profile) return reply.send({ units: [], history: [] })

    const unitIds = unitId
      ? [unitId]
      : profile.addressUnits.map(u => u.id)

    const history = await prisma.consumptionHistory.findMany({
      where: {
        addressUnitId: { in: unitIds },
        ...(year ? { year: parseInt(year) } : {}),
      },
      include: { addressUnit: { select: { name: true } } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })

    const totals = {
      totalPaid: history.reduce((s, h) => s + (h.totalAmount || 0), 0),
      totalConsumed: history.reduce((s, h) => s + (h.consumptionKwh || 0), 0),
      totalSavings: history.reduce((s, h) => s + (h.estimatedSavings || 0), 0),
    }

    return reply.send({ units: profile.addressUnits, history, totals })
  })
}
