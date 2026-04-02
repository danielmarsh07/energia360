import { FastifyInstance } from 'fastify'
import { BillsService } from './bills.service'
import { authenticate } from '../../shared/middleware/authenticate'
import path from 'path'
import fs from 'fs'
import { env } from '../../config/env'

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

  // POST /bills/:billId/upload - Upload de arquivo
  app.post('/:billId/upload', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { billId } = req.params as { billId: string }

    try {
      // Verifica se a conta pertence ao usuário
      await service.findById(billId, sub)

      const data = await req.file()
      if (!data) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.' })
      }

      // Cria diretório de upload se não existir
      const uploadDir = path.resolve(env.UPLOAD_DIR, billId)
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const ext = data.filename.split('.').pop()
      const fileName = `${Date.now()}.${ext}`
      const filePath = path.join(uploadDir, fileName)

      const buffer = await data.toBuffer()
      fs.writeFileSync(filePath, buffer)

      const file = await service.attachFile(billId, {
        fileName,
        originalName: data.filename,
        mimeType: data.mimetype,
        fileSize: buffer.length,
        filePath,
      })

      return reply.status(201).send(file)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer upload.'
      return reply.status(400).send({ error: msg })
    }
  })

  // POST /bills/:billId/extract - Dispara extração de dados (mock/OCR)
  app.post('/:billId/extract', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { billId } = req.params as { billId: string }
    try {
      await service.findById(billId, sub) // verifica ownership
      const data = await service.mockExtract(billId)
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
