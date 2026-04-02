import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../shared/middleware/authenticate'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const updateProfileSchema = z.object({
  fullName: z.string().min(3).optional(),
  document: z.string().optional(),
  documentType: z.enum(['CPF', 'CNPJ']).optional(),
  responsibleName: z.string().optional(),
  observations: z.string().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function profileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /profile
  app.get('/', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const profile = await prisma.clientProfile.findUnique({
      where: { userId: sub },
      include: {
        contacts: true,
        _count: { select: { addressUnits: true } },
      },
    })
    return reply.send(profile)
  })

  // PUT /profile
  app.put('/', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = updateProfileSchema.safeParse(req.body)
    if (!result.success) return reply.status(400).send({ error: result.error.issues[0].message })

    const profile = await prisma.clientProfile.update({
      where: { userId: sub },
      data: result.data,
    })
    return reply.send(profile)
  })

  // POST /profile/change-password
  app.post('/change-password', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = changePasswordSchema.safeParse(req.body)
    if (!result.success) return reply.status(400).send({ error: result.error.issues[0].message })

    const user = await prisma.user.findUnique({ where: { id: sub } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' })

    const valid = await bcrypt.compare(result.data.currentPassword, user.password)
    if (!valid) return reply.status(400).send({ error: 'Senha atual incorreta.' })

    const hashed = await bcrypt.hash(result.data.newPassword, 12)
    await prisma.user.update({ where: { id: sub }, data: { password: hashed } })

    return reply.send({ message: 'Senha alterada com sucesso.' })
  })

  // POST /profile/contacts
  app.post('/contacts', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const schema = z.object({
      type: z.enum(['EMAIL', 'PHONE', 'WHATSAPP']),
      value: z.string().min(1),
      label: z.string().optional(),
      isPrimary: z.boolean().optional(),
    })
    const result = schema.safeParse(req.body)
    if (!result.success) return reply.status(400).send({ error: result.error.issues[0].message })

    const profile = await prisma.clientProfile.findUnique({ where: { userId: sub } })
    if (!profile) return reply.status(404).send({ error: 'Perfil não encontrado.' })

    const contact = await prisma.contact.create({
      data: { clientProfileId: profile.id, ...result.data },
    })
    return reply.status(201).send(contact)
  })

  // DELETE /profile/contacts/:id
  app.delete('/contacts/:id', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { id } = req.params as { id: string }

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: { clientProfile: true },
    })
    if (!contact || contact.clientProfile.userId !== sub) {
      return reply.status(404).send({ error: 'Contato não encontrado.' })
    }

    await prisma.contact.delete({ where: { id } })
    return reply.status(204).send()
  })
}
