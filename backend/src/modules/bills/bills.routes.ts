import { FastifyInstance } from 'fastify'
import { BillsService } from './bills.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { prisma } from '../../lib/prisma'

const service = new BillsService()

export async function billsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /bills/unit/:unitId
  app.get('/unit/:unitId', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { unitId } = req.params as { unitId: string }
    const { year } = req.query as { year?: string }
    try {
      const bills = await service.listByUnit(unitId, sub, { year: year ? parseInt(year) : undefined })
      return reply.send(bills)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(404).send({ error: msg })
    }
  })

  // GET /bills/:id
  app.get('/:id', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { id } = req.params as { id: string }
    try {
      const bill = await service.findById(id, sub)
      return reply.send(bill)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(404).send({ error: msg })
    }
  })

  // POST /bills/unit/:unitId - Cria uma entrada de conta
  app.post('/unit/:unitId', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { unitId } = req.params as { unitId: string }
    const body = req.body as { referenceMonth: number; referenceYear: number }
    try {
      const bill = await service.create(unitId, sub, body)
      return reply.status(201).send(bill)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(400).send({ error: msg })
    }
  })

  // POST /bills/:billId/upload - Upload de arquivo para Cloudinary
  app.post('/:billId/upload', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { billId } = req.params as { billId: string }

    try {
      await service.findById(billId, sub)

      const data = await req.file()
      if (!data) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.' })
      }

      const buffer = await data.toBuffer()

      // Upload para Cloudinary (armazenamento persistente)
      const { url: cloudinaryUrl, publicId: cloudinaryPublicId } =
        await service.uploadToCloudinary(buffer, data.filename, data.mimetype, billId)

      const ext = data.filename.split('.').pop() ?? 'bin'
      const fileName = `${Date.now()}.${ext}`

      await service.attachFile(billId, {
        fileName,
        originalName: data.filename,
        mimeType: data.mimetype,
        fileSize: buffer.length,
        filePath: cloudinaryUrl,
        cloudinaryUrl,
        cloudinaryPublicId,
      })

      // Extrai com o buffer já em memória — evita re-download do Cloudinary
      await service.extractWithAI(billId, sub, buffer, data.mimetype)

      const updatedBill = await service.findById(billId, sub)
      return reply.status(201).send(updatedBill)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer upload.'
      return reply.status(400).send({ error: msg })
    }
  })

  // POST /bills/:billId/extract - Extração real com Claude AI
  app.post('/:billId/extract', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { billId } = req.params as { billId: string }
    try {
      const data = await service.extractWithAI(billId, sub)
      return reply.send({ message: 'Dados extraídos com sucesso.', data })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na extração.'
      return reply.status(400).send({ error: msg })
    }
  })

  // POST /bills/:billId/validate - Confirma/edita dados extraídos
  app.post('/:billId/validate', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { billId } = req.params as { billId: string }
    try {
      const bill = await service.validateBill(billId, sub, req.body as Record<string, unknown>)
      return reply.send(bill)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao validar.'
      return reply.status(400).send({ error: msg })
    }
  })

  // DELETE /bills/:billId - Exclui conta, arquivos e histórico de consumo
  app.delete('/:billId', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { billId } = req.params as { billId: string }
    try {
      const bill = await service.findById(billId, sub)
      // Remove arquivos do Cloudinary
      for (const file of bill.files) {
        await service.deleteFile(file.id, sub).catch(() => null)
      }
      // Remove histórico de consumo do mês correspondente
      await prisma.consumptionHistory.deleteMany({
        where: {
          addressUnitId: bill.addressUnitId,
          month: bill.referenceMonth,
          year: bill.referenceYear,
        },
      })
      await prisma.utilityBill.delete({ where: { id: billId } })
      return reply.send({ message: 'Conta excluída.' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir.'
      return reply.status(400).send({ error: msg })
    }
  })

  // GET /bills/unit/:unitId/history - Histórico de consumo
  app.get('/unit/:unitId/history', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { unitId } = req.params as { unitId: string }
    try {
      const history = await service.getHistory(unitId, sub)
      return reply.send(history)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      return reply.status(404).send({ error: msg })
    }
  })
}
