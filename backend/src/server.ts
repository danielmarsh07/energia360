import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import staticFiles from '@fastify/static'
import path from 'path'
import fs from 'fs'

import { env } from './config/env'
import { authRoutes } from './modules/auth/auth.routes'
import { addressesRoutes } from './modules/addresses/addresses.routes'
import { energyPointsRoutes } from './modules/energy-points/energy-points.routes'
import { billsRoutes } from './modules/bills/bills.routes'
import { alertsRoutes } from './modules/alerts/alerts.routes'
import { tutorialsRoutes } from './modules/tutorials/tutorials.routes'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
import { profileRoutes } from './modules/profile/profile.routes'
import { adminRoutes } from './modules/admin/admin.routes'
import { plansRoutes } from './modules/plans/plans.routes'

const app = Fastify({ logger: true })

// ──────────────────────────────────────────────
// Plugins globais
// ──────────────────────────────────────────────

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ error: 'Muitas requisições. Tente novamente em instantes.' }),
})

app.register(cors, {
  origin: (origin, cb) => {
    // Permite localhost em dev e qualquer subdomínio do Render em produção
    const allowed = [
      env.CORS_ORIGIN,
      /\.onrender\.com$/,
    ]
    if (!origin || allowed.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
})

app.register(jwt, {
  secret: env.JWT_SECRET,
})

app.register(multipart, {
  limits: { fileSize: env.MAX_FILE_SIZE },
})

// Serve arquivos estáticos de upload
const uploadDir = path.resolve(env.UPLOAD_DIR)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

app.register(staticFiles, {
  root: uploadDir,
  prefix: '/uploads/',
})

// ──────────────────────────────────────────────
// Rotas
// ──────────────────────────────────────────────

app.register(authRoutes, { prefix: '/api/auth' })
app.register(profileRoutes, { prefix: '/api/profile' })
app.register(addressesRoutes, { prefix: '/api/addresses' })
app.register(energyPointsRoutes, { prefix: '/api' })
app.register(billsRoutes, { prefix: '/api/bills' })
app.register(alertsRoutes, { prefix: '/api/alerts' })
app.register(tutorialsRoutes, { prefix: '/api/tutorials' })
app.register(dashboardRoutes, { prefix: '/api/dashboard' })
app.register(adminRoutes, { prefix: '/api/admin' })
app.register(plansRoutes, { prefix: '/api/plans' })

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// ──────────────────────────────────────────────
// Inicialização
// ──────────────────────────────────────────────

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    console.log(`\n🌱 Energia360 API rodando em http://localhost:${env.PORT}`)
    console.log(`🌿 Ambiente: ${env.NODE_ENV}\n`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
