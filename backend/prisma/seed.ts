import 'dotenv/config'
import { PrismaClient, UserRole, AlertType, AlertSeverity, TutorialCategory, BillStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // ──────────────────────────────────────────
  // Usuários
  // ──────────────────────────────────────────
  const password = await bcrypt.hash('energia123', 12)
  const adminPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@energia360.com' },
    update: {},
    create: {
      email: 'admin@energia360.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      profile: {
        create: {
          fullName: 'Administrador Energia360',
        },
      },
    },
  })

  const joaoUser = await prisma.user.upsert({
    where: { email: 'joao.silva@email.com' },
    update: {},
    create: {
      email: 'joao.silva@email.com',
      password,
      profile: {
        create: {
          fullName: 'João Carlos Silva',
          document: '123.456.789-00',
          documentType: 'CPF',
          responsibleName: 'João Carlos Silva',
          contacts: {
            create: [
              { type: 'PHONE', value: '(31) 99999-1234', label: 'Celular', isPrimary: true },
              { type: 'WHATSAPP', value: '(31) 99999-1234', label: 'WhatsApp' },
            ],
          },
        },
      },
    },
    include: { profile: true },
  })

  const mariaUser = await prisma.user.upsert({
    where: { email: 'maria.santos@email.com' },
    update: {},
    create: {
      email: 'maria.santos@email.com',
      password,
      profile: {
        create: {
          fullName: 'Maria Aparecida Santos',
          document: '987.654.321-00',
          documentType: 'CPF',
          contacts: {
            create: [
              { type: 'PHONE', value: '(11) 98888-5678', label: 'Celular', isPrimary: true },
            ],
          },
        },
      },
    },
    include: { profile: true },
  })

  console.log(`✅ Usuários criados: admin, ${joaoUser.email}, ${mariaUser.email}`)

  // ──────────────────────────────────────────
  // Unidades do João
  // ──────────────────────────────────────────
  const joaoProfile = await prisma.clientProfile.findUnique({ where: { userId: joaoUser.id } })
  if (!joaoProfile) throw new Error('Perfil do João não encontrado')

  const unitCasa = await prisma.addressUnit.upsert({
    where: { id: 'unit-joao-casa' },
    update: {},
    create: {
      id: 'unit-joao-casa',
      clientProfileId: joaoProfile.id,
      name: 'Casa Principal',
      consumerUnitCode: '7001234567',
      utility: 'CEMIG',
      zipCode: '30140-003',
      street: 'Rua da Bahia',
      number: '1420',
      complement: 'Apto 501',
      neighborhood: 'Lourdes',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const unitChacara = await prisma.addressUnit.upsert({
    where: { id: 'unit-joao-chacara' },
    update: {},
    create: {
      id: 'unit-joao-chacara',
      clientProfileId: joaoProfile.id,
      name: 'Chácara Nova Lima',
      consumerUnitCode: '7009876543',
      utility: 'CEMIG',
      zipCode: '34000-000',
      street: 'Estrada do Patrimônio',
      number: 'km 12',
      neighborhood: 'Rural',
      city: 'Nova Lima',
      state: 'MG',
    },
  })

  console.log('✅ Unidades do João criadas')

  // ──────────────────────────────────────────
  // Pontos de Energia
  // ──────────────────────────────────────────
  await prisma.energyPoint.upsert({
    where: { id: 'point-joao-casa-solar' },
    update: {},
    create: {
      id: 'point-joao-casa-solar',
      addressUnitId: unitCasa.id,
      name: 'Sistema Solar Residencial',
      pointType: 'RESIDENTIAL',
      hasSolar: true,
      solarPowerKwp: 6.6,
      panelsCount: 15,
      installDate: new Date('2022-03-15'),
      inverterModel: 'Fronius Primo 6.0',
      technicalNotes: 'Sistema instalado pela empresa SolarTech em 2022. Módulos 440W monocristalinos.',
    },
  })

  await prisma.energyPoint.upsert({
    where: { id: 'point-joao-chacara-solar' },
    update: {},
    create: {
      id: 'point-joao-chacara-solar',
      addressUnitId: unitChacara.id,
      name: 'Sistema Solar Chácara',
      pointType: 'RURAL',
      hasSolar: true,
      solarPowerKwp: 10.0,
      panelsCount: 20,
      installDate: new Date('2023-07-20'),
      inverterModel: 'Growatt SPH 10000TL3',
      technicalNotes: 'Sistema com armazenamento em baterias. Capacidade de 20kWh.',
    },
  })

  console.log('✅ Pontos de energia criados')

  // ──────────────────────────────────────────
  // Histórico de consumo (12 meses)
  // ──────────────────────────────────────────
  const consumptionData = [
    // Casa - ano 2024
    { month: 1, year: 2024, consumptionKwh: 280, totalAmount: 145.80, injectedKwh: 210, creditsKwh: 180, estimatedSavings: 178.50 },
    { month: 2, year: 2024, consumptionKwh: 265, totalAmount: 138.20, injectedKwh: 195, creditsKwh: 165, estimatedSavings: 165.75 },
    { month: 3, year: 2024, consumptionKwh: 290, totalAmount: 152.40, injectedKwh: 220, creditsKwh: 200, estimatedSavings: 187.00 },
    { month: 4, year: 2024, consumptionKwh: 310, totalAmount: 162.50, injectedKwh: 240, creditsKwh: 210, estimatedSavings: 204.00 },
    { month: 5, year: 2024, consumptionKwh: 340, totalAmount: 178.30, injectedKwh: 260, creditsKwh: 230, estimatedSavings: 221.00 },
    { month: 6, year: 2024, consumptionKwh: 360, totalAmount: 189.60, injectedKwh: 250, creditsKwh: 220, estimatedSavings: 212.50 },
    { month: 7, year: 2024, consumptionKwh: 385, totalAmount: 203.20, injectedKwh: 230, creditsKwh: 200, estimatedSavings: 195.50 },
    { month: 8, year: 2024, consumptionKwh: 420, totalAmount: 221.80, injectedKwh: 200, creditsKwh: 175, estimatedSavings: 170.00 },
    { month: 9, year: 2024, consumptionKwh: 395, totalAmount: 208.40, injectedKwh: 215, creditsKwh: 190, estimatedSavings: 182.75 },
    { month: 10, year: 2024, consumptionKwh: 350, totalAmount: 183.70, injectedKwh: 235, creditsKwh: 210, estimatedSavings: 199.75 },
    { month: 11, year: 2024, consumptionKwh: 295, totalAmount: 155.20, injectedKwh: 245, creditsKwh: 215, estimatedSavings: 208.25 },
    { month: 12, year: 2024, consumptionKwh: 270, totalAmount: 142.60, injectedKwh: 200, creditsKwh: 180, estimatedSavings: 170.00 },
    // 2025
    { month: 1, year: 2025, consumptionKwh: 260, totalAmount: 138.90, injectedKwh: 215, creditsKwh: 190, estimatedSavings: 182.75 },
    { month: 2, year: 2025, consumptionKwh: 245, totalAmount: 131.40, injectedKwh: 205, creditsKwh: 180, estimatedSavings: 174.25 },
    { month: 3, year: 2025, consumptionKwh: 275, totalAmount: 147.30, injectedKwh: 225, creditsKwh: 200, estimatedSavings: 191.25 },
  ]

  for (const data of consumptionData) {
    await prisma.consumptionHistory.upsert({
      where: {
        addressUnitId_month_year: {
          addressUnitId: unitCasa.id,
          month: data.month,
          year: data.year,
        },
      },
      update: data,
      create: { addressUnitId: unitCasa.id, ...data },
    })
  }

  console.log('✅ Histórico de consumo criado')

  // ──────────────────────────────────────────
  // Contas de energia com dados extraídos
  // ──────────────────────────────────────────
  const bills = [
    { month: 1, year: 2025, status: BillStatus.VALIDATED },
    { month: 2, year: 2025, status: BillStatus.VALIDATED },
    { month: 3, year: 2025, status: BillStatus.EXTRACTED },
  ]

  for (const billData of bills) {
    const bill = await prisma.utilityBill.upsert({
      where: { id: `bill-joao-${billData.month}-${billData.year}` },
      update: {},
      create: {
        id: `bill-joao-${billData.month}-${billData.year}`,
        addressUnitId: unitCasa.id,
        referenceMonth: billData.month,
        referenceYear: billData.year,
        status: billData.status,
        dueDate: new Date(billData.year, billData.month, 10),
      },
    })

    const histIdx = consumptionData.findIndex(h => h.month === billData.month && h.year === billData.year)
    if (histIdx >= 0) {
      const h = consumptionData[histIdx]
      await prisma.utilityBillExtractedData.upsert({
        where: { billId: bill.id },
        update: {},
        create: {
          billId: bill.id,
          utilityName: 'CEMIG',
          consumerUnitCode: '7001234567',
          consumptionKwh: h.consumptionKwh,
          totalAmount: h.totalAmount,
          energyAmount: h.totalAmount * 0.7,
          networkUsageFee: h.totalAmount * 0.3,
          injectedEnergyKwh: h.injectedKwh,
          energyCreditsKwh: h.creditsKwh,
          previousReading: 12000 + (histIdx * 280),
          currentReading: 12000 + (histIdx * 280) + h.consumptionKwh,
          avgConsumption: 310,
          confidence: 0.92,
          isManuallyReviewed: billData.status === BillStatus.VALIDATED,
        },
      })
    }
  }

  console.log('✅ Contas de energia criadas')

  // ──────────────────────────────────────────
  // Alertas
  // ──────────────────────────────────────────
  await prisma.alert.createMany({
    data: [
      {
        addressUnitId: unitCasa.id,
        type: AlertType.HIGH_CONSUMPTION,
        severity: AlertSeverity.WARNING,
        title: 'Consumo acima da média',
        message: 'Seu consumo em agosto/2024 (420 kWh) foi 28% acima da sua média mensal de 328 kWh. Verifique se há equipamentos ligados desnecessariamente.',
        referenceMonth: 8,
        referenceYear: 2024,
        isRead: true,
      },
      {
        addressUnitId: unitCasa.id,
        type: AlertType.MISSING_BILL,
        severity: AlertSeverity.INFO,
        title: 'Conta de abril ainda não enviada',
        message: 'Você ainda não enviou a conta de energia de abril/2025. Envie para manter seu histórico atualizado e receber análises precisas.',
        referenceMonth: 4,
        referenceYear: 2025,
        isRead: false,
      },
      {
        addressUnitId: unitChacara.id,
        type: AlertType.GENERAL,
        severity: AlertSeverity.INFO,
        title: 'Primeira conta pendente',
        message: 'Cadastre a primeira conta da Chácara Nova Lima para começar a acompanhar seu consumo e economia.',
        isRead: false,
      },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Alertas criados')

  // ──────────────────────────────────────────
  // Artigos e Tutoriais
  // ──────────────────────────────────────────
  const articles = [
    {
      slug: 'como-funciona-energia-solar',
      title: 'Como funciona a energia solar fotovoltaica',
      summary: 'Entenda de forma simples como as placas solares transformam luz em energia elétrica e como isso afeta sua conta de luz.',
      content: `# Como funciona a energia solar fotovoltaica\n\nA energia solar fotovoltaica é uma das formas mais limpas e eficientes de gerar eletricidade. Mas como funciona?\n\n## O processo de geração\n\nAs placas solares (painéis fotovoltaicos) são compostas por células de silício que captam a luz do sol e a convertem em corrente elétrica contínua (CC).\n\nEssa corrente passa pelo inversor, que a transforma em corrente alternada (CA) — o mesmo tipo de energia que chega às tomadas da sua casa.\n\n## O que acontece com o excesso?\n\nQuando seu sistema gera mais energia do que você consome, o excedente é injetado na rede elétrica da concessionária. Em troca, você recebe créditos de energia que podem ser usados nos meses seguintes.\n\nEsse sistema se chama **compensação energética** e é regulado pela ANEEL.\n\n## Por que minha conta não zera?\n\nMesmo com placas solares, sua conta não vai a zero porque:\n\n1. Existe uma taxa mínima de disponibilidade cobrada pela concessionária\n2. À noite, você consome da rede (pois as placas não geram energia)\n3. Em dias nublados, a geração é reduzida\n\n> 💡 **Dica:** Acompanhe mensalmente sua geração e consumo para identificar qualquer queda de desempenho.`,
      category: TutorialCategory.SOLAR_BASICS,
      readingTime: 4,
      icon: 'sun',
      order: 1,
    },
    {
      slug: 'entendendo-sua-conta-de-luz',
      title: 'Como ler sua conta de energia com painéis solares',
      summary: 'Aprenda a interpretar cada campo da sua conta de energia e entender o que é cobrado, compensado e creditado.',
      content: `# Como ler sua conta de energia com painéis solares\n\nA conta de energia pode parecer complicada, mas uma vez que você entende cada campo, fica fácil acompanhar.\n\n## Campos principais\n\n### Consumo (kWh)\nÉ a quantidade de energia elétrica que você utilizou no período. Com painéis solares, esse número tende a ser menor pois parte do consumo é suprida pelo sistema solar.\n\n### Energia injetada\nÉ o quanto seu sistema solar gerou além do que você consumiu e foi enviado para a rede da concessionária.\n\n### Créditos de energia\nSão os créditos acumulados de energia injetada em meses anteriores. Podem ser usados para abater o consumo atual.\n\n### Tarifa de Uso do Sistema de Distribuição (TUSD)\nMesmo com energia solar, você paga pelo uso da rede elétrica. Essa taxa não pode ser compensada com créditos solares.\n\n## O que comparar mês a mês\n\n- Consumo atual vs. média dos últimos 12 meses\n- Energia gerada vs. energia consumida\n- Créditos disponíveis vs. créditos utilizados\n- Valor total da conta`,
      category: TutorialCategory.BILLING,
      readingTime: 5,
      icon: 'file-text',
      order: 1,
    },
    {
      slug: 'energia-injetada-na-rede',
      title: 'O que é energia injetada na rede?',
      summary: 'Descubra o que acontece com a energia que seu sistema solar produz a mais e como os créditos funcionam.',
      content: `# O que é energia injetada na rede?\n\nQuando seu sistema solar produz mais energia do que você consome naquele momento, o excedente é injetado automaticamente na rede da concessionária.\n\n## Como funciona na prática\n\nImagine que ao meio-dia, suas placas estão gerando 4 kW, mas você está consumindo apenas 1,5 kW. Os outros 2,5 kW são enviados para a rede.\n\nA concessionária registra essa energia injetada e converte em créditos que aparecem na sua próxima conta.\n\n## Por quanto tempo os créditos são válidos?\n\nDe acordo com a regulamentação da ANEEL, os créditos de energia solar são válidos por **60 meses** a partir do mês de geração.\n\n## Dica importante\n\nAcompanhe mensalmente o saldo de créditos. Se seu saldo estiver crescendo muito, pode ser sinal de que seu sistema está superdimensionado para o seu consumo atual.`,
      category: TutorialCategory.SOLAR_BASICS,
      readingTime: 3,
      icon: 'zap',
      order: 2,
    },
    {
      slug: 'como-perceber-queda-de-desempenho',
      title: 'Como perceber queda de desempenho nas placas solares',
      summary: 'Saiba identificar os sinais de que seu sistema solar pode não estar funcionando no pleno potencial.',
      content: `# Como perceber queda de desempenho nas placas solares\n\nUm sistema solar bem instalado deve gerar energia de forma consistente ao longo dos anos. Mas alguns fatores podem reduzir o desempenho.\n\n## Sinais de alerta\n\n### 1. Queda brusca nos créditos gerados\nSe nos últimos meses você estava injetando 200 kWh/mês e de repente esse número caiu para 100 kWh sem mudança nas condições climáticas, pode haver algum problema.\n\n### 2. Conta de energia subindo sem mudança nos hábitos\nSe sua conta aumentou significativamente sem que você tenha comprado equipamentos novos ou mudado sua rotina, investigue.\n\n### 3. Módulos fisicamente danificados\nVerifique visualmente as placas periodicamente. Trincas, manchas escuras ou sujeira acumulada podem reduzir a geração.\n\n## O que fazer?\n\n1. Compare o histórico de geração mês a mês no Energia360\n2. Verifique se há sombreamento novo (árvores que cresceram, construções vizinhas)\n3. Limpe os painéis se necessário\n4. Chame a empresa instaladora para uma inspeção\n\n> ⚠️ **Atenção:** A degradação natural dos painéis é de cerca de 0,5% ao ano. Quedas abruptas indicam algum problema específico.`,
      category: TutorialCategory.MAINTENANCE,
      readingTime: 4,
      icon: 'alert-triangle',
      order: 1,
    },
    {
      slug: 'quando-procurar-manutencao',
      title: 'Quando procurar manutenção para seu sistema solar',
      summary: 'Saiba em quais situações é necessário chamar um técnico e o que pode ser resolvido por você mesmo.',
      content: `# Quando procurar manutenção para seu sistema solar\n\n## Manutenções que você pode fazer\n\n### Limpeza dos painéis\nEm regiões com muita poeira ou poluição, limpar os painéis a cada 3-6 meses pode aumentar a geração em até 10%.\n\nUse apenas água e um pano macio. Nunca use produtos abrasivos.\n\n### Verificação visual\nOlhe para as placas periodicamente. Verifique se há:\n- Células com coloração diferente\n- Trincas ou quebras\n- Sujeira concentrada\n\n## Quando chamar um técnico\n\n- Queda de geração superior a 20% sem explicação climática\n- Alarmes ou erros no display do inversor\n- Cheiro de queimado próximo ao inversor\n- Fios aparentes ou danificados\n- Após vendavais ou granizo intenso\n\n## Manutenção preventiva\n\nO ideal é fazer uma revisão completa a cada 12-18 meses com a empresa instaladora. Isso inclui:\n- Verificação de conexões elétricas\n- Teste de desempenho de cada módulo\n- Limpeza e inspeção do inversor`,
      category: TutorialCategory.MAINTENANCE,
      readingTime: 5,
      icon: 'tool',
      order: 2,
    },
    {
      slug: 'acompanhando-sua-economia',
      title: 'Como acompanhar sua economia ao longo dos meses',
      summary: 'Entenda como calcular o retorno do investimento no sistema solar e monitorar sua economia de forma inteligente.',
      content: `# Como acompanhar sua economia ao longo dos meses\n\nUm dos maiores benefícios da energia solar é a economia na conta de luz. Mas como calcular isso de forma precisa?\n\n## O cálculo da economia\n\nA economia estimada é calculada multiplicando a **energia injetada na rede** pela **tarifa de energia** da sua concessionária.\n\nPor exemplo:\n- Energia injetada: 200 kWh\n- Tarifa: R$ 0,85/kWh\n- **Economia estimada: R$ 170,00**\n\n## Retorno do investimento (payback)\n\nO tempo de retorno varia conforme o tamanho do sistema, consumo e tarifa, mas geralmente fica entre **4 e 7 anos**.\n\nApós o payback, você tem **mais de 20 anos** de geração com custo praticamente zero.\n\n## Usando o Energia360 para monitorar\n\nNo nosso dashboard você pode acompanhar:\n- Economia acumulada total\n- Economia por mês\n- Gráfico de evolução\n- Comparação entre meses\n\n> 💰 **Lembre-se:** A economia real considera também a proteção contra reajustes tarifários futuros.`,
      category: TutorialCategory.SAVINGS,
      readingTime: 4,
      icon: 'trending-down',
      order: 1,
    },
    {
      slug: 'perguntas-frequentes',
      title: 'Perguntas frequentes sobre energia solar',
      summary: 'Respostas para as dúvidas mais comuns de quem tem ou quer ter um sistema de energia solar residencial.',
      content: `# Perguntas frequentes sobre energia solar\n\n## Minha conta vai a zero com energia solar?\nNão totalmente. Existe uma taxa mínima de disponibilidade que todo cliente paga, além de outros encargos que não podem ser compensados com créditos solares.\n\n## O sistema funciona em dias nublados?\nSim! Em dias nublados a geração reduz, mas não cessa completamente. O ideal é que o sistema seja dimensionado para garantir boa geração mesmo nesses dias.\n\n## O que acontece com meu sistema durante a noite?\nÀ noite, as placas não geram energia. Você consome da rede elétrica normalmente, usando os créditos acumulados durante o dia.\n\n## Qual a vida útil das placas solares?\nOs painéis fotovoltaicos têm garantia de performance de 25 a 30 anos. A degradação é gradual, em torno de 0,5% ao ano.\n\n## Preciso fazer limpeza nas placas?\nSim. Em regiões com muita poeira, limpezas a cada 3-6 meses são recomendadas para manter a performance máxima.\n\n## O que é o inversor solar?\nO inversor é o equipamento que converte a corrente contínua gerada pelas placas em corrente alternada utilizável nos equipamentos da casa. Geralmente tem vida útil de 10-15 anos.\n\n## Posso expandir meu sistema no futuro?\nSim! O sistema pode ser expandido adicionando mais painéis. É importante verificar com um técnico a capacidade do inversor e a estrutura de fixação.`,
      category: TutorialCategory.FAQ,
      readingTime: 6,
      icon: 'help-circle',
      order: 1,
    },
  ]

  for (const article of articles) {
    await prisma.tutorialArticle.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    })
  }

  console.log('✅ Artigos e tutoriais criados')

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('\n📋 Credenciais de acesso:')
  console.log('   👤 Cliente demo: joao.silva@email.com / energia123')
  console.log('   👤 Cliente demo: maria.santos@email.com / energia123')
  console.log('   🔑 Admin: admin@energia360.com / admin123')
  console.log('')
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
