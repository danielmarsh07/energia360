import { FastifyInstance } from 'fastify'
import { AddressesService } from './addresses.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { z } from 'zod'

const service = new AddressesService()

const createSchema = z.object({
  name: z.string().min(2),
  consumerUnitCode: z.string().optional(),
  utility: z.string().optional(),
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  observations: z.string().optional(),
})

export async function addressesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const units = await service.list(sub)
    return reply.send(units)
  })

  app.get('/:id', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { id } = req.params as { id: string }
    try {
      const unit = await service.findById(id, sub)
      return reply.send(unit)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(404).send({ error: msg })
    }
  })

  app.post('/', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = createSchema.safeParse(req.body)
    if (!result.success) return reply.status(400).send({ error: result.error.issues[0].message })
    const unit = await service.create(sub, result.data)
    return reply.status(201).send(unit)
  })

  app.put('/:id', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { id } = req.params as { id: string }
    const result = createSchema.partial().safeParse(req.body)
    if (!result.success) return reply.status(400).send({ error: result.error.issues[0].message })
    try {
      const unit = await service.update(id, sub, result.data)
      return reply.send(unit)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(404).send({ error: msg })
    }
  })

  app.delete('/:id', async (req, reply) => {
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
