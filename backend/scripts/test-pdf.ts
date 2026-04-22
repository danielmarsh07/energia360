/**
 * Smoke test do gerador de PDF — carrega um JSON de auditoria de exemplo,
 * gera o PDF e salva em scripts/pdf-output.pdf pra conferência visual.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { auditBill } from '../src/modules/bills/audit'
import { generateAuditPdf } from '../src/modules/bills/pdf-report'
import type { ExtractedBillV2 } from '../src/modules/bills/audit/types'

async function main() {
  const resultsDir = resolve(__dirname, 'extraction-results')
  const outDir = resolve(__dirname, 'pdf-output')
  await mkdir(outDir, { recursive: true })

  const targets = [
    '2026.03 - Enel - Praia Seca.json',
    '2026.03 - Light - Grajaú.json',
    '2026.03 - Light - São Cristóvão.json',
  ]

  for (const file of targets) {
    const raw = await readFile(resolve(resultsDir, file), 'utf-8')
    const doc = JSON.parse(raw)
    const v2 = doc.parsed as ExtractedBillV2
    if (!v2) { console.log(`Sem parsed em ${file}, pulando`); continue }

    const report = auditBill(v2, file.replace('.json', ''))
    const pdfBuffer = await generateAuditPdf(
      {
        utilityName: v2.utility?.name ?? null,
        utilityCnpj: v2.utility?.cnpj ?? null,
        consumerUnitCode: v2.unit?.consumerUnitCode ?? null,
        holderName: v2.holder?.name ?? null,
        holderTaxId: v2.holder?.taxId ?? null,
        supplyAddress: v2.holder?.address ?? null,
        supplyCity: v2.holder?.city ?? null,
        supplyState: v2.holder?.state ?? null,
        referenceMonth: v2.period?.referenceMonth ?? 1,
        referenceYear: v2.period?.referenceYear ?? 2026,
        totalAmount: v2.invoice?.totalAmount ?? null,
      },
      report,
    )

    const outPath = resolve(outDir, file.replace('.json', '.pdf'))
    await writeFile(outPath, pdfBuffer)
    console.log(`✓ ${outPath}  (${(pdfBuffer.length / 1024).toFixed(1)} KB)`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
