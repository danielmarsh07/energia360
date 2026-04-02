import { FastifyInstance } from 'fastify'
import { AuthService } from './auth.service'
import { registerSchema, loginSchema } from './auth.schema'
import { authenticate } from '../../shared/middleware/authenticate'

const authService = new AuthService()

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/register', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const result = registerSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0].message })
    }

    try {
      const user = await authService.register(result.data)
      const token = app.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '7d' }
      )
      return reply.status(201).send({ user, token })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta.'
      return reply.status(400).send({ error: message })
    }
  })

  // POST /auth/login
  app.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.issues[0].message })
    }

    try {
      const user = await authService.login(result.data)
      const token = app.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '7d' }
      )
      return reply.send({ user, token })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login.'
      return reply.status(401).send({ error: message })
    }
  })

  // GET /auth/me
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    try {
      const user = await authService.getMe(sub)
      return reply.send(user)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar usuário.'
      return reply.status(404).send({ error: message })
    }
  })
}
