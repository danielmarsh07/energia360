/**
 * Roda o motor de auditoria contra os JSONs já extraídos e imprime o relatório.
 * Não chama a API Anthropic nem toca no banco.
 *
 * Uso:
 *   cd backend
 *   npx tsx scripts/test-audit.ts
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { auditBill, type ExtractedBillV2 } from '../src/modules/bills/audit'

const RESULTS_DIR = resolve(__dirname, 'extraction-results')

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function sevBadge(s: string): string {
  switch (s) {
    case 'CRITICAL': return '🚨 CRÍTICO'
    case 'WARNING':  return '⚠️  ATENÇÃO'
    case 'INFO':     return 'ℹ️  INFO'
    default:         return s
  }
}

async function main() {
  const files = (await readdir(RESULTS_DIR)).filter((f) => f.endsWith('.json'))
  console.log(`\n🔍 Auditando ${files.length} contas extraídas em ${RESULTS_DIR}\n`)

  let grandTotalYear = 0

  for (const file of files) {
    const raw = await readFile(join(RESULTS_DIR, file), 'utf-8')
    const doc = JSON.parse(raw)
    const parsed = doc.parsed as ExtractedBillV2 | null
    if (!parsed) {
      console.log(`❌ ${file}: sem JSON parseado — pulando.\n`)
      continue
    }

    const report = auditBill(parsed, file.replace('.json', ''))

    console.log('─'.repeat(80))
    console.log(`📄 ${report.billRef}`)
    console.log(`   Distribuidora: ${report.utility ?? '?'} | Ref: ${report.referenceLabel ?? '?'} | Total cobrado: ${report.totalBillAmount ? fmtBRL(report.totalBillAmount) : '?'}`)
    console.log(`   Modelo IA: ${doc.model} | Confiança: ${parsed.meta?.confidence ?? '?'}`)
    console.log(`   Fatura exemplo?: ${parsed.meta?.isSampleBill ? 'SIM (sintética)' : 'não'}`)
    console.log('')

    for (const f of report.findings) {
      console.log(`   ${sevBadge(f.severity)}  ${f.ruleName}`)
      console.log(`   Status: ${f.status}`)
      if (f.status === 'OVERCHARGE_DETECTED') {
        console.log(`   💰 Cobrança indevida mensal:  ${fmtBRL(f.monthlyOverchargeAmount)}`)
        console.log(`   📅 Projeção anual:             ${fmtBRL(f.yearlyProjection)}`)
      }
      console.log(`   ${f.explanation.split('\n').join('\n   ')}`)
      if (f.evidence.length > 0) {
        console.log(`   Evidências (${f.evidence.length} linhas da conta):`)
        for (const e of f.evidence) {
          const sign = e.value >= 0 ? '+' : ''
          console.log(`     • ${e.lineDescription}  →  ${e.field} = ${sign}${fmtBRL(e.value)}`)
          if (e.note) console.log(`       ${e.note}`)
        }
      }
      console.log('')
    }

    if (report.totalMonthlyOvercharge > 0) {
      console.log(`   🎯 RESUMO CONTA:  ${fmtBRL(report.totalMonthlyOvercharge)}/mês  →  ${fmtBRL(report.totalYearlyProjection)}/ano`)
      grandTotalYear += report.totalYearlyProjection
    } else {
      console.log(`   ✅ Nenhuma cobrança indevida identificada.`)
    }
    console.log('')
  }

  console.log('═'.repeat(80))
  console.log(`🏁 RECUPERAÇÃO ANUAL ESTIMADA TOTAL (somando todas as contas): ${fmtBRL(grandTotalYear)}`)
  console.log('═'.repeat(80))
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
