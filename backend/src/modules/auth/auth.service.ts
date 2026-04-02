import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { RegisterInput, LoginInput } from './auth.schema'

export class AuthService {
  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      throw new Error('Este e-mail já está cadastrado.')
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        profile: {
          create: {
            fullName: data.fullName,
          },
        },
      },
      include: {
        profile: true,
      },
    })

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.profile?.fullName,
    }
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { profile: true },
    })

    if (!user || !user.isActive) {
      throw new Error('E-mail ou senha inválidos.')
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password)
    if (!isValidPassword) {
      throw new Error('E-mail ou senha inválidos.')
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.profile?.fullName,
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            contacts: true,
            _count: {
              select: { addressUnits: true },
            },
          },
        },
      },
    })

    if (!user) throw new Error('Usuário não encontrado.')

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    }
  }
}
