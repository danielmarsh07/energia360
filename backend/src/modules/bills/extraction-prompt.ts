import type { ExtractedBillV2 } from './audit/types'

/**
 * Prompt de extração v2 — saída JSON aninhada com line items, tributos
 * detalhados, SCEE por TUSD/TE, safras de crédito e histórico 12 meses.
 * Usado em produção (bills.service.ts) e nos scripts de validação.
 */
export const EXTRACTION_PROMPT_V2 = `Você é um auditor especialista em contas de energia elétrica brasileiras, com foco em sistemas de geração distribuída (energia solar) e auditoria tributária (ICMS, PIS, COFINS conforme LC 194/2022, STF Tema 176 e Lei 14.300/2022).

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

/**
 * Extrai o JSON do texto bruto retornado pela IA. Tolera blocos de markdown
 * (```json) e texto ao redor — busca pelo primeiro `{` e último `}` válidos.
 */
export function parseExtractionResponse(rawText: string): ExtractedBillV2 | null {
  const match = rawText.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as ExtractedBillV2
  } catch {
    return null
  }
}

/**
 * Normaliza strings de enum contra os valores aceitos pelo Prisma.
 * Retorna null se o valor não for reconhecido — evita crash em insert.
 */
function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== 'string') return null
  const upper = value.trim().toUpperCase()
  return (allowed as readonly string[]).includes(upper) ? (upper as T) : null
}

function asDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

const TARIFF_CLASSES = ['RESIDENTIAL', 'COMMERCIAL', 'RURAL', 'INDUSTRIAL', 'PUBLIC'] as const
const TARIFF_MODALITIES = ['CONVENTIONAL', 'WHITE', 'BLUE', 'GREEN'] as const
const TARIFF_FLAGS = ['GREEN', 'YELLOW', 'RED_1', 'RED_2'] as const
const SUPPLY_PHASES = ['MONO', 'BI', 'TRI'] as const
const LINE_TYPES = [
  'ENERGY_CONSUMED', 'ENERGY_INJECTED_TE', 'ENERGY_INJECTED_TUSD',
  'ENERGY_SUPPLIED_TE', 'ENERGY_SUPPLIED_TUSD',
  'CIP', 'FLAG', 'FINE', 'INTEREST', 'REFUND_PIS_COFINS', 'OTHER',
] as const
const CREDIT_GROUPS = ['GD1', 'GD2'] as const

export interface MappedExtraction {
  /** Campos escalares de UtilityBillExtractedData (v1 legacy + v2 completo) */
  scalar: Record<string, unknown>
  /** Linhas que vão para UtilityBillLineItem */
  lineItems: Array<{
    orderIndex: number
    description: string
    lineType: string
    unit: string | null
    quantity: number | null
    unitPriceWithTax: number | null
    unitTariff: number | null
    totalValue: number
    pisCofinsValue: number | null
    icmsBase: number | null
    icmsRate: number | null
    icmsValue: number | null
    postoTarifario: string | null
    vintageLabel: string | null
    creditGroup: string | null
  }>
  /** Medidores para UtilityBillMeter */
  meters: Array<{
    serialNumber: string
    measurement: string | null
    postoTarifario: string | null
    previousReading: number | null
    previousReadingDate: Date | null
    currentReading: number | null
    currentReadingDate: Date | null
    constant: number | null
    consumptionKwh: number | null
  }>
  /** Safras de crédito para UtilityBillCreditLot */
  creditLots: Array<{
    label: string
    vintageMonth: Date | null
    group: string | null
    quantityKwh: number
    teUnitPrice: number | null
    tusdUnitPrice: number | null
    teValue: number | null
    tusdValue: number | null
  }>
  /** Histórico 12 meses para UtilityBillMonthlyHistory */
  monthlyHistory: Array<{
    monthLabel: string
    month: number
    year: number
    consumptionKwh: number
    billingDays: number | null
  }>
}

/**
 * Converte o JSON v2 aninhado em:
 *  - campos escalares para UtilityBillExtractedData (inclui tanto legacy v1
 *    quanto colunas v2 novas), com enums normalizados
 *  - listas separadas de lineItems/meters/creditLots/monthlyHistory para
 *    serem criadas como filhas em transação.
 */
export function mapV2ToSchema(v2: ExtractedBillV2, model?: string): MappedExtraction {
  // Agregados legados — continuam sendo populados para telas atuais que leem
  // consumptionKwh/energyAmount/networkUsageFee até a UI migrar para v2.
  const energyConsumedValue = v2.lineItems
    .filter((li) => li.lineType === 'ENERGY_CONSUMED')
    .reduce((acc, li) => acc + (li.totalValue ?? 0), 0)
  const tusdValueLegacy = v2.lineItems
    .filter((li) => li.lineType === 'ENERGY_SUPPLIED_TUSD' || li.lineType === 'ENERGY_INJECTED_TUSD')
    .reduce((acc, li) => acc + (li.totalValue ?? 0), 0)

  const tariffFlagStr = asEnum(v2.tariffFlag?.color ?? null, TARIFF_FLAGS)
  const tariffClassStr = asEnum(v2.unit?.tariffClass, TARIFF_CLASSES)
  const tariffModalityStr = asEnum(v2.unit?.tariffModality, TARIFF_MODALITIES)
  const supplyPhaseStr = asEnum(v2.unit?.supplyPhase, SUPPLY_PHASES)

  const scalar: Record<string, unknown> = {
    // --- v1 legacy ---
    utilityName: v2.utility?.name ?? null,
    consumerUnitCode: v2.unit?.consumerUnitCode ?? null,
    referenceMonthStr: v2.period?.referenceLabel ?? null,
    previousReading: v2.meters?.[0]?.previousReading ?? null,
    currentReading: v2.meters?.[0]?.currentReading ?? null,
    consumptionKwh: v2.consumption?.billedKwh ?? v2.consumption?.meteredKwh ?? null,
    injectedEnergyKwh: v2.scee?.injected?.totalKwh ?? null,
    energyCreditsKwh: v2.scee?.creditBalanceKwh ?? null,
    totalAmount: v2.invoice?.totalAmount ?? null,
    energyAmount: energyConsumedValue || null,
    networkUsageFee: tusdValueLegacy || null,
    avgConsumption: v2.consumption?.avgConsumptionKwh ?? null,
    dueDate: asDate(v2.invoice?.dueDate),
    readingDate: asDate(v2.meters?.[0]?.currentReadingDate),
    confidence: v2.meta?.confidence ?? null,

    // --- v2: identificação ---
    utilityLegalName: v2.utility?.legalName ?? null,
    utilityCnpj: v2.utility?.cnpj ?? null,
    invoiceNumber: v2.invoice?.number ?? null,
    invoiceSeries: v2.invoice?.series ?? null,
    invoiceAccessKey: v2.invoice?.accessKey ?? null,
    invoiceCfop: v2.invoice?.cfop ?? null,
    invoiceAuthProtocol: v2.invoice?.authProtocol ?? null,
    invoiceIssueDate: asDate(v2.invoice?.issueDate),
    barcodeLine: v2.invoice?.barcodeLine ?? null,
    paymentMethod: v2.paymentMethod ?? null,

    // --- v2: titular ---
    holderName: v2.holder?.name ?? null,
    holderTaxId: v2.holder?.taxId ?? null,
    supplyAddress: v2.holder?.address ?? null,
    supplyCity: v2.holder?.city ?? null,
    supplyState: v2.holder?.state ?? null,
    supplyZipCode: v2.holder?.zipCode ?? null,

    // --- v2: classificação ---
    tariffClass: tariffClassStr,
    tariffSubgroup: v2.unit?.tariffSubgroup ?? null,
    tariffModality: tariffModalityStr,
    supplyPhase: supplyPhaseStr,
    isDistributedGeneration: v2.unit?.isDistributedGeneration ?? false,
    installedCapacityKwp: v2.scee?.installedCapacityKwp ?? null,

    // --- v2: período / bandeira ---
    billingDays: v2.period?.billingDays ?? null,
    nextReadingDate: asDate(v2.period?.nextReadingDate),
    tariffFlag: tariffFlagStr,
    tariffFlagAmount: v2.tariffFlag?.additionalAmount ?? null,

    // --- v2: consumo bruto × faturado ---
    meteredConsumptionKwh: v2.consumption?.meteredKwh ?? null,
    billedConsumptionKwh: v2.consumption?.billedKwh ?? null,

    // --- v2: SCEE injetada ---
    injectedKwhTusd: v2.scee?.injected?.tusdKwh ?? null,
    injectedTusdValue: v2.scee?.injected?.tusdValue ?? null,
    injectedTusdUnitPrice: v2.scee?.injected?.tusdUnitPrice ?? null,
    injectedKwhTe: v2.scee?.injected?.teKwh ?? null,
    injectedTeValue: v2.scee?.injected?.teValue ?? null,
    injectedTeUnitPrice: v2.scee?.injected?.teUnitPrice ?? null,

    // --- v2: SCEE fornecida ---
    suppliedKwhTusd: v2.scee?.supplied?.tusdKwh ?? null,
    suppliedTusdValue: v2.scee?.supplied?.tusdValue ?? null,
    suppliedTusdUnitPrice: v2.scee?.supplied?.tusdUnitPrice ?? null,
    suppliedKwhTe: v2.scee?.supplied?.teKwh ?? null,
    suppliedTeValue: v2.scee?.supplied?.teValue ?? null,
    suppliedTeUnitPrice: v2.scee?.supplied?.teUnitPrice ?? null,

    // --- v2: saldos SCEE ---
    creditBalanceKwh: v2.scee?.creditBalanceKwh ?? null,
    creditsUsedKwh: v2.scee?.creditsUsedKwh ?? null,
    creditsExpiringKwh: v2.scee?.creditsExpiringKwh ?? null,
    creditsExpiringMonth: asDate(v2.scee?.creditsExpiringMonth),

    // --- v2: tributos ---
    icmsBase: v2.taxes?.icms?.baseTotal ?? null,
    icmsRate: v2.taxes?.icms?.rate ?? null,
    icmsValue: v2.taxes?.icms?.valueTotal ?? null,
    pisBase: v2.taxes?.pis?.base ?? null,
    pisRate: v2.taxes?.pis?.rate ?? null,
    pisValue: v2.taxes?.pis?.value ?? null,
    cofinsBase: v2.taxes?.cofins?.base ?? null,
    cofinsRate: v2.taxes?.cofins?.rate ?? null,
    cofinsValue: v2.taxes?.cofins?.value ?? null,
    publicLightingFee: v2.taxes?.publicLighting?.value ?? null,
    publicLightingMunicipality: v2.taxes?.publicLighting?.municipality ?? null,

    // --- v2: avisos/metadados ---
    tariffAdjustmentNote: v2.notices?.tariffAdjustment ?? null,
    observations: v2.notices?.observations ?? null,
    isSampleBill: v2.meta?.isSampleBill ?? false,
    extractionModel: model ?? null,
  }

  const lineItems = v2.lineItems.map((li, idx) => ({
    orderIndex: idx,
    description: li.description,
    lineType: asEnum(li.lineType, LINE_TYPES) ?? 'OTHER',
    unit: li.unit,
    quantity: li.quantity,
    unitPriceWithTax: li.unitPriceWithTax,
    unitTariff: li.unitTariff,
    totalValue: li.totalValue,
    pisCofinsValue: li.pisCofinsValue,
    icmsBase: li.icmsBase,
    icmsRate: li.icmsRate,
    icmsValue: li.icmsValue,
    postoTarifario: li.postoTarifario,
    vintageLabel: li.vintageLabel,
    creditGroup: asEnum(li.creditGroup, CREDIT_GROUPS),
  }))

  const meters = (v2.meters ?? [])
    .filter((m) => !!m.serialNumber)
    .map((m) => ({
      serialNumber: m.serialNumber as string,
      measurement: m.measurement,
      postoTarifario: m.postoTarifario,
      previousReading: m.previousReading,
      previousReadingDate: asDate(m.previousReadingDate),
      currentReading: m.currentReading,
      currentReadingDate: asDate(m.currentReadingDate),
      constant: m.constant,
      consumptionKwh: m.consumptionKwh,
    }))

  const creditLots = (v2.creditLots ?? []).map((c) => ({
    label: c.label,
    vintageMonth: asDate(c.vintageMonth),
    group: asEnum(c.group, CREDIT_GROUPS),
    quantityKwh: c.quantityKwh,
    teUnitPrice: c.teUnitPrice,
    tusdUnitPrice: c.tusdUnitPrice,
    teValue: c.teValue,
    tusdValue: c.tusdValue,
  }))

  const monthlyHistory = (v2.monthlyHistory ?? []).map((h) => ({
    monthLabel: h.label,
    month: h.month,
    year: h.year,
    consumptionKwh: h.consumptionKwh,
    billingDays: h.billingDays,
  }))

  return { scalar, lineItems, meters, creditLots, monthlyHistory }
}
