import { FastifyInstance } from 'fastify'
import { EnergyPointsService } from './energy-points.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { z } from 'zod'

const service = new EnergyPointsService()

const schema = z.object({
  name: z.string().min(2),
  pointType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'RURAL', 'INDUSTRIAL']).optional(),
  hasSolar: z.boolean().optional(),
  solarPowerKwp: z.number().positive().optional(),
  panelsCount: z.number().int().positive().optional(),
  installDate: z.string().optional(),
  inverterModel: z.string().optional(),
  technicalNotes: z.string().optional(),
})

export async function energyPointsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /units/:unitId/points
  app.get('/units/:unitId/points', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { unitId } = req.params as { unitId: string }
    try {
      const points = await service.list(unitId, sub)
      return reply.send(points)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(404).send({ error: msg })
    }
  })

  // POST /units/:unitId/points
  app.post('/units/:unitId/points', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { unitId } = req.params as { unitId: string }
    const result = schema.safeParse(req.body)
    if (!result.success) return reply.status(400).send({ error: result.error.issues[0].message })
    try {
      const point = await service.create(unitId, sub, result.data)
      return reply.status(201).send(point)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(400).send({ error: msg })
    }
  })

  // PUT /points/:id
  app.put('/points/:id', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { id } = req.params as { id: string }
    const result = schema.partial().safeParse(req.body)
    if (!result.success) return reply.status(400).send({ error: result.error.issues[0].message })
    try {
      const point = await service.update(id, sub, result.data)
      return reply.send(point)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(404).send({ error: msg })
    }
  })

  // DELETE /points/:id
  app.delete('/points/:id', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { id } = req.params as { id: string }
    try {
      await service.remove(id, sub)
      return reply.status(204).send()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(404).send({ error: msg })
    }
  })
}
