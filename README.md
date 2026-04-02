# ☀️ Energia360 — Plataforma de Monitoramento de Energia Solar

Plataforma completa para clientes com energia solar residencial ou comercial acompanharem geração, consumo, cobrança e histórico de desempenho.

---

## 📁 Estrutura do Projeto

```
Energia360/
├── backend/          # API REST com Fastify + Prisma + PostgreSQL
└── frontend/         # Interface React + Vite + TypeScript + Tailwind
```

---

## 🚀 Pré-requisitos

- **Node.js** 18+
- **PostgreSQL** 14+ rodando localmente
- **npm** ou **pnpm**

---

## ⚙️ Configuração do Banco de Dados

1. Crie um banco PostgreSQL chamado `energia360`:

```sql
CREATE DATABASE energia360;
```

2. Copie o arquivo de variáveis de ambiente:

```bash
cd backend
cp .env.example .env
```

3. Edite o `backend/.env` com sua senha do PostgreSQL:

```env
DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/energia360"
JWT_SECRET="troque-por-uma-chave-secreta-forte"
```

---

## 🖥️ Rodando o Backend

```bash
cd backend

# Instalar dependências
npm install

# Gerar o cliente Prisma
npm run db:generate

# Criar as tabelas no banco (migrations)
npm run db:migrate

# Popular com dados de demonstração
npm run db:seed

# Iniciar o servidor em modo desenvolvimento
npm run dev
```

O backend estará disponível em: `http://localhost:3001`

Para visualizar o banco de dados visualmente:
```bash
npm run db:studio
```

---

## 🌐 Rodando o Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

O frontend estará disponível em: `http://localhost:5173`

---

## 🔑 Credenciais de Demonstração

Após rodar o seed, use estas contas para testar:

| Tipo | E-mail | Senha |
|------|--------|-------|
| Cliente | joao.silva@email.com | energia123 |
| Cliente | maria.santos@email.com | energia123 |
| Admin | admin@energia360.com | admin123 |

---

## 📋 Funcionalidades Implementadas

### Autenticação
- ✅ Login com JWT
- ✅ Cadastro de conta
- ✅ Área protegida com refresh de token

### Gestão de Dados
- ✅ Perfil do cliente (dados pessoais, CPF/CNPJ, contatos)
- ✅ Cadastro de unidades/endereços
- ✅ Cadastro de pontos de energia com dados solares
- ✅ Upload de contas (PDF, JPG, PNG)
- ✅ Extração simulada de dados (mock OCR)
- ✅ Validação manual dos dados extraídos
- ✅ Histórico de consumo mensal

### Visualização
- ✅ Dashboard com gráficos interativos (Recharts)
- ✅ Gráfico de consumo mensal (área)
- ✅ Gráfico de valor da conta (barras)
- ✅ Gráfico de economia estimada
- ✅ Cards com indicadores principais
- ✅ Relatórios por período/unidade

### Engajamento
- ✅ Sistema de alertas (consumo alto, conta em atraso, etc.)
- ✅ 7 artigos educativos sobre energia solar
- ✅ Painel administrativo básico

---

## 🏗️ Arquitetura Técnica

### Backend

```
backend/src/
├── config/
│   └── env.ts               # Validação de variáveis de ambiente
├── lib/
│   └── prisma.ts             # Cliente Prisma singleton
├── modules/
│   ├── auth/                 # Autenticação JWT
│   ├── profile/              # Perfil do cliente
│   ├── addresses/            # Unidades/endereços
│   ├── energy-points/        # Pontos de energia
│   ├── bills/                # Contas de energia + upload
│   ├── alerts/               # Alertas
│   ├── tutorials/            # Tutoriais
│   ├── dashboard/            # Dados agregados
│   └── admin/                # Painel administrativo
└── shared/
    └── middleware/           # Autenticação, permissões
```

### Frontend

```
frontend/src/
├── components/
│   ├── layout/               # AppLayout, Sidebar, Header
│   └── ui/                   # Button, Card, Input, Badge, etc.
├── pages/                    # Uma página por rota
├── services/api.ts           # Axios + todos os endpoints
├── store/auth.store.ts       # Zustand - estado de autenticação
├── types/index.ts            # Todos os tipos TypeScript
└── utils/format.ts           # Formatadores (moeda, kWh, datas)
```

---

## 🗄️ Modelagem de Dados

```
User (1) ──── (1) ClientProfile
ClientProfile (1) ──── (N) Contact
ClientProfile (1) ──── (N) AddressUnit
AddressUnit (1) ──── (N) EnergyPoint
AddressUnit (1) ──── (N) UtilityBill
AddressUnit (1) ──── (N) ConsumptionHistory
AddressUnit (1) ──── (N) Alert
UtilityBill (1) ──── (N) UtilityBillFile
UtilityBill (1) ──── (1) UtilityBillExtractedData
```

---

## 🔌 Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário logado |
| GET/PUT | `/api/profile` | Perfil do cliente |
| GET/POST | `/api/addresses` | Unidades |
| GET/POST | `/api/units/:unitId/points` | Pontos de energia |
| GET/POST | `/api/bills/unit/:unitId` | Contas por unidade |
| POST | `/api/bills/:billId/upload` | Upload de arquivo |
| POST | `/api/bills/:billId/extract` | Extração de dados |
| POST | `/api/bills/:billId/validate` | Validação manual |
| GET | `/api/dashboard` | Dados do dashboard |
| GET | `/api/dashboard/reports` | Relatórios |
| GET | `/api/alerts` | Alertas |
| GET | `/api/tutorials` | Tutoriais |
| GET | `/api/admin/stats` | Métricas admin |

---

## 🔮 Preparado para evolução

- **OCR real**: O serviço `bills.service.ts` tem a função `mockExtract()` que pode ser substituída por uma integração com Google Document AI, AWS Textract ou outra solução.
- **IA para análise**: A estrutura `UtilityBillExtractedData` armazena confiança e JSON bruto para futuras análises.
- **Multi-tenancy**: O modelo já suporta múltiplos usuários com dados isolados por perfil.
- **Notificações**: Os alertas podem ser estendidos para envio via e-mail ou WhatsApp.

---

## 🎨 Stack Completa

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilização | Tailwind CSS |
| Roteamento | React Router v6 |
| Estado servidor | React Query (TanStack) |
| Estado cliente | Zustand |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| HTTP | Axios |
| Backend | Fastify + TypeScript |
| ORM | Prisma |
| Banco de dados | PostgreSQL |
| Autenticação | JWT (@fastify/jwt) |
| Upload | @fastify/multipart |

---

## 📄 Licença

Projeto desenvolvido para Marsh Consultoria — Energia360.
