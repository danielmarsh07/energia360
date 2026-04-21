/**
 * Script standalone para validar o prompt de extração v2 contra contas reais.
 * Não persiste no banco, não afeta produção. Apenas chama a API Anthropic,
 * salva o JSON de cada conta em scripts/extraction-results/ e imprime um
 * relatório no console (tokens, custo, campos presentes/ausentes).
 *
 * Uso:
 *   cd backend
 *   npx tsx scripts/test-extraction-v2.ts
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join, basename } from 'node:path'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.0000008, output: 0.000004 },
  'claude-sonnet-4-6':        { input: 0.000003,  output: 0.000015 },
  'claude-opus-4-6':          { input: 0.000015,  output: 0.000075 },
}

const PDF_DIR = resolve(__dirname, '..', '..', 'Contas exemplos')
const OUT_DIR = resolve(__dirname, 'extraction-results')

const PDFS = [
  '2026.03 - Enel - Praia Seca.pdf',
  '2026.03 - Light - Grajaú.pdf',
  '2026.03 - Light - São Cristóvão.pdf',
  'Conta de Energia - CEMIG.pdf',
]

// =============================================
// Prompt v2 — auditoria completa
// =============================================
const EXTRACTION_PROMPT_V2 = `Você é um auditor especialista em contas de energia elétrica brasileiras, com foco em sistemas de geração distribuída (energia solar) e auditoria tributária (ICMS, PIS, COFINS conforme LC 194/2022, STF Tema 176 e Lei 14.300/2022).

Analise a conta fornecida e retorne APENAS um JSON válido (sem markdown, sem texto fora do JSON) seguindo EXATAMENTE este schema:

{
  "utility": {
    "name": "nome curto (ex: ENEL, LIGHT, CEMIG)",
    "legalName": "razão social completa",
    "cnpj": "CNPJ da concessionária (formato XX.XXX.XXX/XXXX-XX)"
  },
  "invoice": {
    "number": "número da nota fiscal",
    "series": "série",
    "accessKey": "chave de acesso 44 dígitos ou null",
    "cfop": "código CFOP",
    "issueDate": "YYYY-MM-DD",
    "dueDate": "YYYY-MM-DD",
    "totalAmount": número,
    "barcodeLine": "linha digitável ou null"
  },
  "holder": {
    "name": "nome do titular",
    "taxId": "CPF ou CNPJ",
    "address": "endereço completo",
    "city": "município",
    "state": "UF (RJ/MG/SP etc.)",
    "zipCode": "CEP"
  },
  "unit": {
    "consumerUnitCode": "código da UC",
    "tariffClass": "RESIDENTIAL | COMMERCIAL | RURAL | INDUSTRIAL | PUBLIC",
    "tariffSubgroup": "B1 | B2 | B3 | A4 | A3 | etc.",
    "tariffModality": "CONVENTIONAL | WHITE | BLUE | GREEN",
    "supplyPhase": "MONO | BI | TRI",
    "isDistributedGeneration": boolean
  },
  "period": {
    "referenceMonth": número (1-12),
    "referenceYear": número,
    "referenceLabel": "ex: 03/2026",
    "billingDays": número,
    "readingDate": "YYYY-MM-DD",
    "nextReadingDate": "YYYY-MM-DD"
  },
  "tariffFlag": {
    "color": "GREEN | YELLOW | RED_1 | RED_2 | null",
    "additionalAmount": número ou null (valor total do adicional de bandeira nesta conta)
  },
  "consumption": {
    "meteredKwh": número (consumo BRUTO medido pelo relógio) ou null,
    "billedKwh": número (consumo FATURADO depois da compensação) ou null,
    "avgConsumptionKwh": número ou null
  },
  "scee": {
    "injected": {
      "totalKwh": número ou null,
      "tusdKwh": número ou null,
      "tusdValue": número ou null,
      "tusdUnitPrice": número ou null,
      "teKwh": número ou null,
      "teValue": número ou null,
      "teUnitPrice": número ou null
    },
    "supplied": {
      "totalKwh": número ou null,
      "tusdKwh": número ou null,
      "tusdValue": número ou null,
      "tusdUnitPrice": número ou null,
      "teKwh": número ou null,
      "teValue": número ou null,
      "teUnitPrice": número ou null
    },
    "creditBalanceKwh": número ou null,
    "creditsUsedKwh": número ou null,
    "creditsExpiringKwh": número ou null,
    "creditsExpiringMonth": "YYYY-MM-DD ou null",
    "installedCapacityKwp": número ou null
  },
  "creditLots": [
    {
      "label": "rótulo original (ex: mJC 08/2024 mPT GD1)",
      "vintageMonth": "YYYY-MM-DD ou null",
      "group": "GD1 | GD2 | null",
      "quantityKwh": número,
      "teUnitPrice": número ou null,
      "tusdUnitPrice": número ou null,
      "teValue": número ou null,
      "tusdValue": número ou null
    }
  ],
  "lineItems": [
    {
      "description": "descrição exata da linha",
      "lineType": "ENERGY_CONSUMED | ENERGY_INJECTED_TE | ENERGY_INJECTED_TUSD | ENERGY_SUPPLIED_TE | ENERGY_SUPPLIED_TUSD | CIP | FLAG | FINE | INTEREST | REFUND_PIS_COFINS | OTHER",
      "unit": "kWh | R$ | null",
      "quantity": número ou null,
      "unitPriceWithTax": número ou null,
      "unitTariff": número ou null,
      "totalValue": número (negativo se for crédito/abatimento),
      "pisCofinsValue": número ou null,
      "icmsBase": número ou null,
      "icmsRate": número entre 0 e 1 (ex: 0.24 para 24%) ou null,
      "icmsValue": número ou null,
      "postoTarifario": "HFP | HP | HI | FP | null",
      "vintageLabel": "mJC MM/AAAA ou null",
      "creditGroup": "GD1 | GD2 | null"
    }
  ],
  "taxes": {
    "icms": { "baseTotal": número ou null, "rate": número entre 0 e 1 ou null, "valueTotal": número ou null },
    "pis":  { "base": número ou null, "rate": número entre 0 e 1 ou null, "value": número ou null },
    "cofins": { "base": número ou null, "rate": número entre 0 e 1 ou null, "value": número ou null },
    "publicLighting": { "value": número ou null, "municipality": "nome município ou null" }
  },
  "meters": [
    {
      "serialNumber": "número de série",
      "measurement": "Energia Ativa | Energia Injetada | etc.",
      "postoTarifario": "HFP | HP | FP | null",
      "previousReading": número ou null,
      "previousReadingDate": "YYYY-MM-DD",
      "currentReading": número ou null,
      "currentReadingDate": "YYYY-MM-DD",
      "constant": número ou null,
      "consumptionKwh": número ou null
    }
  ],
  "monthlyHistory": [
    { "label": "MAR/26", "month": número 1-12, "year": número, "consumptionKwh": número, "billingDays": número ou null }
  ],
  "notices": {
    "tariffAdjustment": "texto do aviso de reajuste tarifário ou null",
    "observations": "outras mensagens relevantes ou null"
  },
  "meta": {
    "isSampleBill": boolean (true SE o rodapé/URL indicar fatura de exemplo sintética, ex: '127.0.0.1' ou 'conta_exemplo'),
    "confidence": número entre 0 e 1,
    "notes": "observações do auditor sobre a qualidade da extração"
  }
}

REGRAS ESTRITAS:
1. Retorne SOMENTE o JSON — nenhum texto antes ou depois, sem blocos \`\`\`json.
2. Se um campo não existir, use null (NUNCA invente valores).
3. Valores numéricos sempre como número (não string). Use ponto como decimal.
4. Sinais: créditos/abatimentos em lineItems devem ter totalValue NEGATIVO.
5. icmsRate/pisRate/cofinsRate em decimal (24% = 0.24).
6. Sinônimos por distribuidora — aceite TODAS as formas:
   - Energia injetada: "Energia Injetada GD", "Energia Ativa Inj.", "Energia Compensada SCEE", "Energia Compensada GD I/II"
   - Energia fornecida (via crédito): "Energia Fornecida GD", "Energia Ativa Fornecida", "Consumo SCEE"
   - Saldo de créditos: "Saldo de Créditos", "Saldo atualizado", "Créditos Disponíveis"
   - COSIP/CIP: "CIP", "COSIP", "Contrib. Ilum. Pública", "ILUM PUB PREF MUNICIPAL"
7. Se a distribuidora NÃO separa TUSD/TE (ex: CEMIG), marque esses campos como null — NÃO divida arbitrariamente.
8. Extraia TODAS as linhas de faturamento do quadro "Descrição do Faturamento"/"DESCRIÇÃO DO FATURAMENTO" em lineItems — percorra LINHA POR LINHA, não pule nenhuma.
9. meta.isSampleBill = true se detectar URLs locais (127.0.0.1, localhost) ou rodapé de arquivo HTML exemplo.
10. ATENÇÃO ao sinal pós-número: valores como "60,22-", "145,45-", "0,42112-" são NEGATIVOS (créditos/abatimentos). O hífen/sinal vem DEPOIS do número em contas Enel.
11. Um lineItem com descrição "Energia Ativa Inj..." (com sinal negativo) é energia INJETADA — lineType = ENERGY_INJECTED_TE (se descrição contém "TE") ou ENERGY_INJECTED_TUSD (se contém "TUSD"). Extraia também vintageLabel (ex: "mJC 08/2024 mPT GD1") e creditGroup (GD1/GD2) conforme aparecer na descrição.
12. Um lineItem com descrição "Energia Ativa Fornecida..." é energia FORNECIDA (pelo crédito) — lineType = ENERGY_SUPPLIED_TE ou ENERGY_SUPPLIED_TUSD conforme TE/TUSD.
13. Um lineItem "Energia Consumida Faturada TE/TUSD" é consumo direto da rede além do compensado — lineType = ENERGY_CONSUMED.
14. Sempre extraia as bases de ICMS por linha quando a tabela tiver colunas "Base Calc ICMS" + "Alíq ICMS" + "ICMS". Essas colunas populam icmsBase/icmsRate/icmsValue de CADA lineItem E do bloco taxes.icms (use os totais do rodapé "TOTAL" da tabela).
15. PIS/COFINS: o bloco "TRIBUTOS" (Base/Alíq/Valor) é a fonte canônica para taxes.pis e taxes.cofins. Ex Enel: PIS base 101,91 × 0,53% = 0,54; COFINS base 101,91 × 2,42% = 2,48.
16. O bloco "MENSAGENS IMPORTANTES" contém TEXTO LIVRE com:
    - Bandeira tarifária vigente (ex: "Bandeira verde em março/26") → tariffFlag.color
    - Saldo SCEE: "Energia Injetada ... no mês", "Saldo utilizado no mês", "Saldo atualizado", "Créditos a Expirar no próximo mês" → scee.*
    - Reajuste tarifário (ex: "Tarifa reajustada em média 15,46%, vigência 15/03/2026 a 14/03/2027") → notices.tariffAdjustment
    EXTRAIA esses campos DO TEXTO — não deixe null.
17. Preencha TODAS as linhas da tabela de histórico "CONSUMO/kWh" (tipicamente 12-13 meses) em monthlyHistory. NÃO pare no 3º mês.
18. isDistributedGeneration = true se houver QUALQUER linha "Energia Injetada", "Energia Compensada", "Energia Fornecida GD" ou saldo SCEE > 0.

EXEMPLOS de lineItem bem formados para ENEL:
{
  "description": "Energia Ativa Inj. TE mJC 08/2024 mPT GD1",
  "lineType": "ENERGY_INJECTED_TE",
  "unit": "kWh", "quantity": 143, "unitPriceWithTax": -0.42112,
  "unitTariff": 0.31020, "totalValue": -60.22, "pisCofinsValue": -1.34,
  "icmsBase": -60.22, "icmsRate": 0.24, "icmsValue": -14.45,
  "postoTarifario": null, "vintageLabel": "mJC 08/2024", "creditGroup": "GD1"
}
{
  "description": "Energia Ativa Fornecida TUSD",
  "lineType": "ENERGY_SUPPLIED_TUSD",
  "unit": "kWh", "quantity": 489, "unitPriceWithTax": 0.92039,
  "unitTariff": 0.67853, "totalValue": 450.07, "pisCofinsValue": 10.08,
  "icmsBase": 450.07, "icmsRate": 0.24, "icmsValue": 108.01,
  "postoTarifario": null, "vintageLabel": null, "creditGroup": null
}`

// =============================================
// Validação de cobertura dos campos
// =============================================
interface ExtractedJson {
  [key: string]: unknown
}

function countLeaves(obj: unknown, prefix = ''): { total: number; filled: number; empty: string[] } {
  let total = 0
  let filled = 0
  const empty: string[] = []

  if (obj === null || obj === undefined) {
    return { total: 1, filled: 0, empty: [prefix || '(root)'] }
  }

  if (Array.isArray(obj)) {
    total = 1
    filled = obj.length > 0 ? 1 : 0
    if (obj.length === 0) empty.push(`${prefix}[]`)
    return { total, filled, empty }
  }

  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${k}` : k
      const sub = countLeaves(v, path)
      total += sub.total
      filled += sub.filled
      empty.push(...sub.empty)
    }
    return { total, filled, empty }
  }

  // valor escalar
  total = 1
  const isEmpty = obj === '' || obj === 0 && prefix.toLowerCase().includes('rate')
  filled = isEmpty ? 0 : 1
  if (isEmpty) empty.push(prefix)
  return { total, filled, empty }
}

// =============================================
// Main
// =============================================
async function extractOne(pdfPath: string) {
  const name = basename(pdfPath, '.pdf')
  console.log(`\n📄 Processando: ${name}`)
  const start = Date.now()

  const buffer = await readFile(pdfPath)
  const base64 = buffer.toString('base64')

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: EXTRACTION_PROMPT_V2 },
        ],
      },
    ],
  })

  const elapsed = Date.now() - start
  const inTok = response.usage.input_tokens
  const outTok = response.usage.output_tokens
  const rates = MODEL_COSTS[MODEL] ?? MODEL_COSTS['claude-haiku-4-5-20251001']
  const cost = +(inTok * rates.input + outTok * rates.output).toFixed(6)

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  let parsed: ExtractedJson | null = null
  let parseError: string | null = null
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('sem JSON na resposta')
    parsed = JSON.parse(match[0])
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err)
  }

  const coverage = parsed ? countLeaves(parsed) : { total: 0, filled: 0, empty: [] }

  console.log(`   ⏱  ${elapsed}ms | 📥 ${inTok} in / 📤 ${outTok} out tokens | 💰 $${cost}`)
  console.log(`   📊 Cobertura: ${coverage.filled}/${coverage.total} campos preenchidos (${Math.round(100 * coverage.filled / Math.max(coverage.total, 1))}%)`)
  if (parseError) console.log(`   ❌ PARSE ERROR: ${parseError}`)
  if (parsed?.meta && (parsed.meta as Record<string, unknown>).isSampleBill) {
    console.log(`   ⚠️  Detectada como fatura de exemplo (isSampleBill=true)`)
  }

  await writeFile(
    join(OUT_DIR, `${name}.json`),
    JSON.stringify(
      { model: MODEL, usage: { inputTokens: inTok, outputTokens: outTok, costUsd: cost, elapsedMs: elapsed }, rawText, parsed, parseError, coverage: { total: coverage.total, filled: coverage.filled, fillRate: +(coverage.filled / Math.max(coverage.total, 1)).toFixed(3) } },
      null,
      2
    ),
    'utf-8'
  )

  return { name, inTok, outTok, cost, parsed, parseError, coverage }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const args = process.argv.slice(2)
  const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1]?.toLowerCase()
  const files = onlyArg
    ? PDFS.filter((p) => p.toLowerCase().includes(onlyArg))
    : PDFS

  console.log(`🚀 Modelo: ${MODEL}`)
  console.log(`📁 PDFs em: ${PDF_DIR}`)
  console.log(`💾 Resultados em: ${OUT_DIR}`)
  if (onlyArg) console.log(`🎯 Filtro: --only=${onlyArg} → ${files.length} arquivo(s)`)

  const results = []
  for (const file of files) {
    try {
      const r = await extractOne(join(PDF_DIR, file))
      results.push(r)
    } catch (err) {
      console.error(`❌ Falha em ${file}:`, err instanceof Error ? err.message : err)
      results.push({ name: file, error: err instanceof Error ? err.message : String(err) })
    }
  }

  // Resumo agregado
  console.log('\n\n══════════ RESUMO ══════════')
  const totalCost = results.reduce((s, r) => s + ('cost' in r && r.cost ? r.cost : 0), 0)
  const totalIn = results.reduce((s, r) => s + ('inTok' in r && r.inTok ? r.inTok : 0), 0)
  const totalOut = results.reduce((s, r) => s + ('outTok' in r && r.outTok ? r.outTok : 0), 0)
  console.log(`Total tokens:  ${totalIn} in / ${totalOut} out`)
  console.log(`Custo total:   $${totalCost.toFixed(4)}`)
  console.log(`JSONs salvos:  ${OUT_DIR}`)

  for (const r of results) {
    if ('parsed' in r && r.parsed) {
      const p = r.parsed as Record<string, any>
      console.log(`\n▸ ${r.name}`)
      console.log(`   Utility:      ${p.utility?.name ?? '?'} / ${p.utility?.cnpj ?? '?'}`)
      console.log(`   UC:           ${p.unit?.consumerUnitCode ?? '?'}  (${p.unit?.tariffSubgroup ?? '?'} ${p.unit?.tariffClass ?? ''})`)
      console.log(`   Ref:          ${p.period?.referenceLabel ?? '?'}`)
      console.log(`   Medido/Fatur: ${p.consumption?.meteredKwh ?? '?'} / ${p.consumption?.billedKwh ?? '?'} kWh`)
      console.log(`   Injetada:     ${p.scee?.injected?.totalKwh ?? '?'} kWh (TUSD ${p.scee?.injected?.tusdKwh ?? '?'} / TE ${p.scee?.injected?.teKwh ?? '?'})`)
      console.log(`   ICMS:         base ${p.taxes?.icms?.baseTotal ?? '?'} × ${p.taxes?.icms?.rate ?? '?'} = ${p.taxes?.icms?.valueTotal ?? '?'}`)
      console.log(`   Line items:   ${(p.lineItems as unknown[] | undefined)?.length ?? 0}`)
      console.log(`   Credit lots:  ${(p.creditLots as unknown[] | undefined)?.length ?? 0}`)
      console.log(`   Meters:       ${(p.meters as unknown[] | undefined)?.length ?? 0}`)
      console.log(`   Histórico:    ${(p.monthlyHistory as unknown[] | undefined)?.length ?? 0} meses`)
      console.log(`   Amostra?:     ${p.meta?.isSampleBill ? 'SIM' : 'não'} | confiança ${p.meta?.confidence ?? '?'}`)
    }
  }
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
