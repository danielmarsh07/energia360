import { FastifyRequest, FastifyReply } from 'fastify'

const ADMIN_ROLES = ['ADMIN', 'ADMIN_MASTER']

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { role?: string }
  if (!user || !ADMIN_ROLES.includes(user.role ?? '')) {
    return reply.status(403).send({ error: 'Acesso negado. Apenas administradores.' })
  }
}
