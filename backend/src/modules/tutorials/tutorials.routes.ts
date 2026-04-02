import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function tutorialsRoutes(app: FastifyInstance) {
  // GET /tutorials - Lista todos os artigos publicados
  app.get('/', async (req, reply) => {
    const { category } = req.query as { category?: string }

    const articles = await prisma.tutorialArticle.findMany({
      where: {
        isPublished: true,
        ...(category ? { category: category as never } : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        category: true,
        readingTime: true,
        icon: true,
        order: true,
      },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    })

    return reply.send(articles)
  })

  // GET /tutorials/:slug - Detalhe de um artigo
  app.get('/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string }

    const article = await prisma.tutorialArticle.findUnique({
      where: { slug, isPublished: true },
    })

    if (!article) {
      return reply.status(404).send({ error: 'Artigo não encontrado.' })
    }

    return reply.send(article)
  })
}
