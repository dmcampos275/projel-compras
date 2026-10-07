import { PurchaseRecord, MappingReport } from '../types/purchases';
import { formatDate, classifyStatusGroup } from './formatters';

/**
 * Gera conjunto de dados de demonstração da base de COMPRAS (materiais e insumos)
 */
export function generateComprasDemoData(): { records: PurchaseRecord[]; report: MappingReport } {
  const branches = [
    'Filial 01 - Matriz SP',
    'Filial 02 - Obra Linha 17',
    'Filial 03 - Polo Industrial Mauá',
    'Filial 04 - Terminal Portuário Santos',
  ];

  const suppliers = [
    { name: 'Gerdau Aços Longos S.A.', trade: 'Gerdau', state: 'SP', group: 'Siderurgia' },
    { name: 'Votorantim Cimentos S.A.', trade: 'Votorantim', state: 'SP', group: 'Cimentícias' },
    { name: 'Tigre Tubos e Conexões S.A.', trade: 'Tigre', state: 'SC', group: 'Tubulações' },
    { name: 'Prysmian Cabos e Sistemas Brasil', trade: 'Prysmian', state: 'SP', group: 'Elétrica' },
    { name: 'Polimix Concreto Ltda', trade: 'Polimix', state: 'SP', group: 'Concreto' },
    { name: 'Mills Estruturas e Andaimes S.A.', trade: 'Mills', state: 'RJ', group: 'Locação' },
    { name: 'Armac Locação de Máquinas S.A.', trade: 'Armac', state: 'SP', group: 'Locação Pesada' },
    { name: 'Sika Brasil Soluções Químicas', trade: 'Sika', state: 'SP', group: 'Química da Construção' },
    { name: 'ArcelorMittal Brasil S.A.', trade: 'ArcelorMittal', state: 'MG', group: 'Siderurgia' },
    { name: 'Schneider Electric Brasil', trade: 'Schneider', state: 'SP', group: 'Automação / Elétrica' },
    { name: 'Vedacit Impermeabilizantes Ltda', trade: 'Vedacit', state: 'SP', group: 'Impermeabilização' },
    { name: 'Engemix Concreto S.A.', trade: 'Engemix', state: 'SP', group: 'Concreto Usinado' },
    { name: 'Cerâmica Formigari Ltda', trade: 'Cerâmica Formigari', state: 'PR', group: 'Alvenaria' },
    { name: '3M do Brasil Ltda', trade: '3M', state: 'SP', group: 'EPI e Abrasivos' },
    { name: 'Docol Metais Sanitários', trade: 'Docol', state: 'SC', group: 'Metais' },
  ];

  const items = [
    { service: 'Aço CA-50 10.0mm Barra 12m', family: 'Aço e Armações', unit: 'KG', basePrice: 7.85 },
    { service: 'Aço CA-50 12.5mm Barra 12m', family: 'Aço e Armações', unit: 'KG', basePrice: 7.95 },
    { service: 'Aço CA-60 5.0mm Rolo 100kg', family: 'Aço e Armações', unit: 'KG', basePrice: 8.2 },
    { service: 'Concreto Usinado Fck 30 MPa Slump 10', family: 'Concreto e Argamassa', unit: 'M3', basePrice: 420.0 },
    { service: 'Concreto Usinado Fck 35 MPa c/ Bomba', family: 'Concreto e Argamassa', unit: 'M3', basePrice: 485.0 },
    { service: 'Cimento CP II-F 32 Saco 50kg', family: 'Materiais Básicos', unit: 'SC', basePrice: 34.5 },
    { service: 'Areia Média Lavada Granel', family: 'Materiais Básicos', unit: 'M3', basePrice: 110.0 },
    { service: 'Pedra Britada nº 1 Granel', family: 'Materiais Básicos', unit: 'M3', basePrice: 95.0 },
    { service: 'Bloco Cerâmico 14x19x39cm Estrutural', family: 'Alvenaria e Vedação', unit: 'MIL', basePrice: 2850.0 },
    { service: 'Tubo PVC Soldável 100mm Barra 6m', family: 'Instalações Hidráulicas', unit: 'BR', basePrice: 88.0 },
    { service: 'Tubo PVC Esgoto Série Reforçada 150mm', family: 'Instalações Hidráulicas', unit: 'BR', basePrice: 175.0 },
    { service: 'Cabo Flexível de Cobre 2,5mm² 750V Rolo 100m', family: 'Instalações Elétricas', unit: 'RL', basePrice: 245.0 },
    { service: 'Cabo de Cobre Bipolar 10mm² 1kV Metro', family: 'Instalações Elétricas', unit: 'M', basePrice: 38.0 },
    { service: 'Manta Asfáltica 4mm Alumínio Rolo 10m²', family: 'Impermeabilização e Químicos', unit: 'RL', basePrice: 310.0 },
    { service: 'Aditivo Plastificante Impermeabilizante 200L', family: 'Impermeabilização e Químicos', unit: 'TB', basePrice: 850.0 },
    { service: 'Capacete de Segurança Classe B c/ Jugular', family: 'Segurança do Trabalho (EPI)', unit: 'UN', basePrice: 42.0 },
    { service: 'Botina de Segurança Nobuck c/ Bico Composite', family: 'Segurança do Trabalho (EPI)', unit: 'PAR', basePrice: 165.0 },
    { service: 'Quadro de Distribuição Geral 36 Disjuntores', family: 'Instalações Elétricas', unit: 'UN', basePrice: 1450.0 },
  ];

  const costCenters = [
    { name: 'CC-101 Obra Linha 17 Ouro', abbr: 'OB-101' },
    { name: 'CC-102 Edifício Corporativo Berrini', abbr: 'OB-102' },
    { name: 'CC-103 Ampliação Terminal Santos', abbr: 'OB-103' },
    { name: 'CC-104 Manutenção Industrial Mauá', abbr: 'OB-104' },
    { name: 'CC-105 Sede Administrativa Projel', abbr: 'ADM-01' },
  ];

  const financialAccounts = [
    { name: '4.1.01 Custo Direto da Construção', abbr: 'DIR-OBRA' },
    { name: '4.1.02 Locação e Manutenção de Máquinas', abbr: 'EQP-OBRA' },
    { name: '4.1.03 Materiais e Insumos Básicos', abbr: 'MAT-OBRA' },
    { name: '4.2.01 Despesas Operacionais e Administrativas', abbr: 'ADM-GERAL' },
  ];

  const buyers = ['Carlos Mendes', 'Mariana Alencar', 'Rodrigo Fagundes', 'Juliana Rios', 'Fernando Barreto'];

  const records: PurchaseRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let orderCounter = 10420;

  for (let m = 11; m >= 0; m--) {
    const monthOrdersCount = 20 + Math.floor(Math.sin(m) * 5) + (m < 2 ? 8 : 0);

    for (let o = 0; o < monthOrdersCount; o++) {
      orderCounter++;
      const branch = branches[(orderCounter + m) % branches.length];
      const buyer = buyers[(orderCounter + o) % buyers.length];
      const costCenterObj = costCenters[(orderCounter + o) % costCenters.length];
      const finAccObj = financialAccounts[(orderCounter + m) % financialAccounts.length];

      const issueMonth = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const daysInMonth = new Date(issueMonth.getFullYear(), issueMonth.getMonth() + 1, 0).getDate();
      const issueDay = 1 + ((orderCounter * 7 + o * 3) % daysInMonth);
      const issueDate = new Date(issueMonth.getFullYear(), issueMonth.getMonth(), issueDay);

      const leadDays = 5 + ((orderCounter * 3) % 25);
      const deliveryDate = new Date(issueDate.getTime() + leadDays * 86400000);

      const itemsInOrder = 1 + (orderCounter % 4);
      const supplierObj = suppliers[(orderCounter + o) % suppliers.length];

      let status = 'Atendida Total';
      const randStatus = (orderCounter * 17 + o) % 100;
      if (randStatus < 12) status = 'Cancelada';
      else if (randStatus < 28) status = 'Em Aberto / Emitida';
      else if (randStatus < 42) status = 'Atendida Parcial';
      else status = 'Atendida Total';

      const statusGroup = classifyStatusGroup(status);
      const isDelayed = deliveryDate.getTime() < today.getTime() && statusGroup !== 'Cancelada' && statusGroup !== 'Atendida/Encerrada';
      const delayDays = isDelayed ? Math.max(1, Math.floor((today.getTime() - deliveryDate.getTime()) / 86400000)) : 0;

      for (let i = 0; i < itemsInOrder; i++) {
        const itemDef = items[(orderCounter + i * 3) % items.length];
        const qtyRequested = 10 + ((orderCounter * 11 + i * 7) % 500);

        let qtyReceived = 0;
        let qtyOpen = 0;
        let qtyCancelled = 0;

        if (statusGroup === 'Atendida/Encerrada') {
          qtyReceived = qtyRequested;
        } else if (statusGroup === 'Cancelada') {
          qtyCancelled = qtyRequested;
        } else if (statusGroup === 'Parcialmente Atendida') {
          qtyReceived = Math.floor(qtyRequested * 0.6);
          qtyOpen = qtyRequested - qtyReceived;
        } else {
          qtyOpen = qtyRequested;
        }

        const unitPrice = Math.round(itemDef.basePrice * (0.95 + ((orderCounter % 15) / 100)) * 100) / 100;
        const discountPct = (orderCounter % 5 === 0) ? 0.05 : 0;
        const grossValue = Math.round(qtyRequested * unitPrice * 100) / 100;
        const discountValue = Math.round(grossValue * discountPct * 100) / 100;
        const netValue = Math.round((grossValue - discountValue) * 100) / 100;
        const itemValue = grossValue;

        const openValue = statusGroup === 'Cancelada' ? 0 : Math.round(qtyOpen * unitPrice * 100) / 100;
        const cancelledValue = statusGroup === 'Cancelada' ? netValue : 0;

        const ipiValue = Math.round(netValue * 0.05 * 100) / 100;
        const icmsValue = Math.round(netValue * 0.12 * 100) / 100;

        const record: PurchaseRecord = {
          id: `Compras-${orderCounter}-${i + 1}-${branch}-${m}`,
          origin: 'Compras',
          branch,
          orderNumber: `OC-${orderCounter}`,
          seq: i + 1,
          status,
          statusGroup,
          reason: statusGroup === 'Cancelada' ? 'MOT-CANC' : '',
          reasonDescription: statusGroup === 'Cancelada' ? 'Cancelamento de item de compras' : '',
          service: itemDef.service,
          descriptionComplement: `Aplicação Obra ${costCenterObj.abbr}`,
          itemDescription: `${itemDef.service} - Aplicação Obra ${costCenterObj.abbr}`,
          family: itemDef.family,
          unit: itemDef.unit,
          supplier: supplierObj.name,
          cleanSupplier: supplierObj.trade,
          rawSupplier: supplierObj.name,
          supplierTradeName: supplierObj.trade,
          supplierGroup: supplierObj.group,
          supplierState: supplierObj.state,
          qtyRequested,
          qtyCancelled,
          qtyOpen,
          qtyReceived,
          unitPrice,
          itemValue,
          netValue,
          grossCalculatedValue: Math.round(unitPrice * qtyRequested * 100) / 100,
          openValue,
          cancelledValue,
          discountValue,
          discountPercent: discountPct,
          ipiValue,
          icmsValue,
          issValue: 0,
          inssValue: 0,
          irrfValue: 0,
          pisValue: 0,
          cofinsValue: 0,
          csllValue: 0,
          issueDate,
          issueDateStr: formatDate(issueDate),
          deliveryDate,
          deliveryDateStr: formatDate(deliveryDate),
          quoteDate: new Date(issueDate.getTime() - 2 * 86400000),
          leadTimeDays: leadDays,
          isDelayed,
          delayDays,
          costCenter: costCenterObj.name,
          costCenterAbbr: costCenterObj.abbr,
          financialAccount: finAccObj.name,
          financialAccountAbbr: finAccObj.abbr,
          accountingAccount: '1.1.03 Almoxarifado Central',
          accountingAccountAbbr: 'ALMOX',
          buyer,
          creator: 'Engenharia / Suprimentos',
          deliveryCity: branch.includes('Santos') ? 'Santos' : 'São Paulo',
          deliveryState: 'SP',
          currency: 'BRL',
          currencyDesc: 'Real Brasileiro',
        };

        records.push(record);
      }
    }
  }

  const report: MappingReport = {
    totalRows: records.length,
    recognizedColumns: [
      { canonical: 'orderNumber', matchedHeader: 'Nº Ordem Compra', label: 'Nº Ordem Compra', required: true },
      { canonical: 'branch', matchedHeader: 'Filial', label: 'Filial', required: true },
      { canonical: 'seq', matchedHeader: 'Seq.', label: 'Seq.', required: true },
      { canonical: 'status', matchedHeader: 'Situação', label: 'Situação', required: true },
      { canonical: 'service', matchedHeader: 'Serviço / Item', label: 'Serviço / Item', required: true },
      { canonical: 'family', matchedHeader: 'Família', label: 'Família', required: false },
      { canonical: 'supplier', matchedHeader: 'Fornecedor', label: 'Fornecedor', required: true },
      { canonical: 'netValue', matchedHeader: 'Valor Líquido', label: 'Valor Líquido', required: true },
      { canonical: 'issueDate', matchedHeader: 'Emissão', label: 'Emissão', required: true },
      { canonical: 'deliveryDate', matchedHeader: 'Entrega', label: 'Entrega', required: true },
    ],
    missingEssentialColumns: [],
    unmatchedHeaders: ['Cod. Barras', 'NCM', 'Conta Débito'],
    sampleProcessed: true,
    fileName: 'planilha_compras_projel_demo.xlsx',
    baseName: 'Compras',
    loadTimestamp: new Date().toLocaleString('pt-BR'),
    reconciliation: {
      sumNetValue: Math.round(records.reduce((acc, r) => acc + r.netValue, 0) * 100) / 100,
      sumItemValue: Math.round(records.reduce((acc, r) => acc + r.itemValue, 0) * 100) / 100,
      sumCalculatedPriceQty: Math.round(records.reduce((acc, r) => acc + (r.grossCalculatedValue || r.unitPrice * r.qtyRequested), 0) * 100) / 100,
      sumOpenValue: Math.round(records.reduce((acc, r) => acc + r.openValue, 0) * 100) / 100,
      sumCancelledValue: Math.round(records.reduce((acc, r) => acc + r.cancelledValue, 0) * 100) / 100,
      sumDiscount: Math.round(records.reduce((acc, r) => acc + r.discountValue, 0) * 100) / 100,
      sumActiveNetValue: Math.round(records.filter((r) => r.statusGroup !== 'Cancelada').reduce((acc, r) => acc + r.netValue, 0) * 100) / 100,
      sumActiveItemValue: Math.round(records.filter((r) => r.statusGroup !== 'Cancelada').reduce((acc, r) => acc + r.itemValue, 0) * 100) / 100,
      hasNetValueColumn: true,
      hasItemValueColumn: true,
      hasUnitPriceColumn: true,
      discrepantRowsCount: records.filter((r) => Math.abs(r.netValue - r.itemValue) > 0.01).length,
    },
  };

  return { records, report };
}

/**
 * Gera conjunto de dados de demonstração da base de SERVIÇOS REALIZADOS (subempreitadas, consultorias, retenções)
 */
export function generateServicosDemoData(): { records: PurchaseRecord[]; report: MappingReport } {
  const branches = [
    'Filial 01 - Matriz SP',
    'Filial 02 - Obra Linha 17',
    'Filial 03 - Polo Industrial Mauá',
    'Filial 04 - Terminal Portuário Santos',
  ];

  const providers = [
    { name: 'Sondatec Geotecnia e Fundações S.A.', trade: 'Sondatec', state: 'SP', group: 'Geotecnia' },
    { name: 'Topocad Topografia e Mapeamento Laser', trade: 'Topocad', state: 'SP', group: 'Topografia' },
    { name: 'EletroService Instalações Industriais Ltda', trade: 'EletroService', state: 'SP', group: 'Instalações' },
    { name: 'Hidrovale Redes e Saneamento Ambiental', trade: 'Hidrovale', state: 'MG', group: 'Hidráulica e Drenagem' },
    { name: 'EstruturAço Montagens Metálicas Ltda', trade: 'EstruturAço', state: 'SP', group: 'Estruturas Metálicas' },
    { name: 'HidroGeo Perfurações e Estacas Eireli', trade: 'HidroGeo', state: 'RJ', group: 'Fundações Profundas' },
    { name: 'Impertech Soluções em Impermeabilização', trade: 'Impertech', state: 'SP', group: 'Impermeabilização' },
    { name: 'Engemax Consultoria e Projetos Estruturais', trade: 'Engemax', state: 'SP', group: 'Consultoria Técnica' },
    { name: 'Guindastes Paulistas Transportes Pesados', trade: 'Guindastes Paulistas', state: 'SP', group: 'Locação c/ Operador' },
    { name: 'Construtora & Empreiteira Alfa Ltda', trade: 'Empreiteira Alfa', state: 'SP', group: 'Mão de Obra Civil' },
    { name: 'Polimix Concreto Ltda', trade: 'Polimix Serviços', state: 'SP', group: 'Bombeamento Concreto' },
    { name: 'Mills Estruturas e Andaimes S.A.', trade: 'Mills Montagens', state: 'RJ', group: 'Montagem Andaimes' },
  ];

  const services = [
    { service: 'Serviço de Sondagem SPT a Percussão e Laudo', family: 'Fundações e Solos', unit: 'M', basePrice: 185.0 },
    { service: 'Execução de Estacas Hélice Contínua Ø 500mm', family: 'Fundações e Solos', unit: 'M', basePrice: 280.0 },
    { service: 'Levantamento Topográfico Planialtimétrico Cadastral', family: 'Topografia e Projetos', unit: 'HA', basePrice: 4200.0 },
    { service: 'Projeto Executivo de Estruturas de Concreto Armado', family: 'Consultoria e Engenharia', unit: 'UN', basePrice: 32000.0 },
    { service: 'Serviço de Bombeamento de Concreto Usinado', family: 'Concretagem e Moldagem', unit: 'M3', basePrice: 55.0 },
    { service: 'Instalação de Redes Elétricas em Média Tensão', family: 'Instalações Elétricas', unit: 'GL', basePrice: 65000.0 },
    { service: 'Instalação de SPDA e Malha de Aterramento', family: 'Instalações Elétricas', unit: 'GL', basePrice: 24500.0 },
    { service: 'Execução de Rede Coletora de Esgoto e Drenagem', family: 'Hidráulica e Saneamento', unit: 'M', basePrice: 320.0 },
    { service: 'Impermeabilização de Lajes c/ Manta Asfáltica', family: 'Impermeabilização', unit: 'M2', basePrice: 68.0 },
    { service: 'Montagem de Cobertura e Estrutura Metálica', family: 'Estruturas Metálicas', unit: 'TON', basePrice: 4500.0 },
    { service: 'Locação de Guindaste 70T com Operador e Plano Rigging', family: 'Transportes e Guindastes', unit: 'HR', basePrice: 680.0 },
    { service: 'Execução de Alvenaria Estrutural de Blocos', family: 'Subempreitada Civil', unit: 'M2', basePrice: 92.0 },
    { service: 'Pintura Industrial Epóxi de Piso e Paredes', family: 'Acabamentos e Pintura', unit: 'M2', basePrice: 45.0 },
  ];

  const costCenters = [
    { name: 'CC-101 Obra Linha 17 Ouro', abbr: 'OB-101' },
    { name: 'CC-102 Edifício Corporativo Berrini', abbr: 'OB-102' },
    { name: 'CC-103 Ampliação Terminal Santos', abbr: 'OB-103' },
    { name: 'CC-104 Manutenção Industrial Mauá', abbr: 'OB-104' },
    { name: 'CC-105 Sede Administrativa Projel', abbr: 'ADM-01' },
  ];

  const financialAccounts = [
    { name: '4.1.03 Serviços de Terceiros e Subempreiteiros', abbr: 'SRV-TERC' },
    { name: '4.1.04 Consultoria e Projetos Técnicos', abbr: 'CONS-ENG' },
    { name: '4.1.05 Locação de Maquinário Operado', abbr: 'LOC-OPER' },
  ];

  const managers = ['Mariana Alencar', 'Juliana Rios', 'Fernando Barreto', 'Roberto Vasconcelos'];

  const records: PurchaseRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let orderCounter = 20500;

  for (let m = 11; m >= 0; m--) {
    const monthOrdersCount = 14 + ((m * 3) % 7);

    for (let o = 0; o < monthOrdersCount; o++) {
      orderCounter++;
      const branch = branches[(orderCounter + m) % branches.length];
      const buyer = managers[(orderCounter + o) % managers.length];
      const costCenterObj = costCenters[(orderCounter + o) % costCenters.length];
      const finAccObj = financialAccounts[(orderCounter + m) % financialAccounts.length];

      const issueMonth = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const daysInMonth = new Date(issueMonth.getFullYear(), issueMonth.getMonth() + 1, 0).getDate();
      const issueDay = 1 + ((orderCounter * 5 + o * 2) % daysInMonth);
      const issueDate = new Date(issueMonth.getFullYear(), issueMonth.getMonth(), issueDay);

      const leadDays = 15 + ((orderCounter * 7) % 45);
      const deliveryDate = new Date(issueDate.getTime() + leadDays * 86400000);

      const providerObj = providers[(orderCounter + o) % providers.length];
      const serviceDef = services[(orderCounter + o * 2) % services.length];

      let status = 'Atendida Total';
      const randStatus = (orderCounter * 13 + o) % 100;
      if (randStatus < 8) status = 'Cancelada';
      else if (randStatus < 32) status = 'Em Aberto / Medição Pendente';
      else if (randStatus < 52) status = 'Medição Parcial Aprovada';
      else status = 'Atendida / Encerrada';

      const statusGroup = classifyStatusGroup(status);
      const isDelayed = deliveryDate.getTime() < today.getTime() && statusGroup !== 'Cancelada' && statusGroup !== 'Atendida/Encerrada';
      const delayDays = isDelayed ? Math.max(1, Math.floor((today.getTime() - deliveryDate.getTime()) / 86400000)) : 0;

      const qtyRequested = 5 + ((orderCounter * 3) % 120);
      let qtyReceived = 0;
      let qtyOpen = 0;
      let qtyCancelled = 0;

      if (statusGroup === 'Atendida/Encerrada') {
        qtyReceived = qtyRequested;
      } else if (statusGroup === 'Cancelada') {
        qtyCancelled = qtyRequested;
      } else if (statusGroup === 'Parcialmente Atendida') {
        qtyReceived = Math.floor(qtyRequested * 0.5);
        qtyOpen = qtyRequested - qtyReceived;
      } else {
        qtyOpen = qtyRequested;
      }

      const unitPrice = serviceDef.basePrice;
      const grossValue = Math.round(qtyRequested * unitPrice * 100) / 100;
      const discountValue = 0;
      const netValue = grossValue;
      const itemValue = grossValue;

      const openValue = statusGroup === 'Cancelada' ? 0 : Math.round(qtyOpen * unitPrice * 100) / 100;
      const cancelledValue = statusGroup === 'Cancelada' ? netValue : 0;

      // Retenções de impostos de serviços (ISS, INSS, IRRF, PIS, COFINS, CSLL)
      const issValue = Math.round(netValue * 0.05 * 100) / 100;
      const inssValue = Math.round(netValue * 0.11 * 100) / 100;
      const irrfValue = Math.round(netValue * 0.015 * 100) / 100;
      const pisValue = Math.round(netValue * 0.0065 * 100) / 100;
      const cofinsValue = Math.round(netValue * 0.03 * 100) / 100;
      const csllValue = Math.round(netValue * 0.01 * 100) / 100;

      const record: PurchaseRecord = {
        id: `Serviços-${orderCounter}-1-${branch}-${m}`,
        origin: 'Serviços',
        branch,
        orderNumber: `OS-${orderCounter}`,
        seq: 1,
        status,
        statusGroup,
        reason: statusGroup === 'Cancelada' ? 'DISTRATO' : '',
        reasonDescription: statusGroup === 'Cancelada' ? 'Rescisão amigável de contrato de serviço' : '',
        service: serviceDef.service,
        descriptionComplement: `Execução especializada ${costCenterObj.abbr}`,
        itemDescription: `${serviceDef.service} - Execução especializada ${costCenterObj.abbr}`,
        family: serviceDef.family,
        unit: serviceDef.unit,
        supplier: providerObj.name,
        cleanSupplier: providerObj.trade,
        rawSupplier: providerObj.name,
        supplierTradeName: providerObj.trade,
        supplierGroup: providerObj.group,
        supplierState: providerObj.state,
        qtyRequested,
        qtyCancelled,
        qtyOpen,
        qtyReceived,
        unitPrice,
        itemValue,
        netValue,
        grossCalculatedValue: grossValue,
        openValue,
        cancelledValue,
        discountValue,
        discountPercent: 0,
        ipiValue: 0,
        icmsValue: 0,
        issValue,
        inssValue,
        irrfValue,
        pisValue,
        cofinsValue,
        csllValue,
        issueDate,
        issueDateStr: formatDate(issueDate),
        deliveryDate,
        deliveryDateStr: formatDate(deliveryDate),
        quoteDate: new Date(issueDate.getTime() - 5 * 86400000),
        leadTimeDays: leadDays,
        isDelayed,
        delayDays,
        costCenter: costCenterObj.name,
        costCenterAbbr: costCenterObj.abbr,
        financialAccount: finAccObj.name,
        financialAccountAbbr: finAccObj.abbr,
        accountingAccount: '4.1.03 Prestação de Serviços',
        accountingAccountAbbr: 'SRV-OBRA',
        buyer,
        creator: 'Gestão de Contratos / Engenharia',
        deliveryCity: branch.includes('Santos') ? 'Santos' : 'São Paulo',
        deliveryState: 'SP',
        currency: 'BRL',
        currencyDesc: 'Real Brasileiro',
      };

      records.push(record);
    }
  }

  const report: MappingReport = {
    totalRows: records.length,
    recognizedColumns: [
      { canonical: 'orderNumber', matchedHeader: 'Nº Ordem Compra', label: 'Nº Ordem Compra', required: true },
      { canonical: 'branch', matchedHeader: 'Filial', label: 'Filial', required: true },
      { canonical: 'seq', matchedHeader: 'Seq.', label: 'Seq.', required: true },
      { canonical: 'status', matchedHeader: 'Situação', label: 'Situação', required: true },
      { canonical: 'service', matchedHeader: 'Serviço', label: 'Serviço', required: true },
      { canonical: 'family', matchedHeader: 'Família', label: 'Família', required: false },
      { canonical: 'supplier', matchedHeader: 'Fornecedor', label: 'Prestador', required: true },
      { canonical: 'netValue', matchedHeader: 'Valor Líquido', label: 'Valor Líquido', required: true },
      { canonical: 'issueDate', matchedHeader: 'Emissão', label: 'Emissão', required: true },
      { canonical: 'deliveryDate', matchedHeader: 'Entrega', label: 'Entrega', required: true },
      { canonical: 'issValue', matchedHeader: 'Valor ISS', label: 'Valor ISS', required: false },
      { canonical: 'inssValue', matchedHeader: 'Valor INSS', label: 'Valor INSS', required: false },
      { canonical: 'irrfValue', matchedHeader: 'Vlr. IRRF', label: 'Vlr. IRRF', required: false },
      { canonical: 'pisValue', matchedHeader: 'Vlr. PIS Retido', label: 'Vlr. PIS Retido', required: false },
      { canonical: 'cofinsValue', matchedHeader: 'Vlr. Cofins Ret.', label: 'Vlr. Cofins Ret.', required: false },
      { canonical: 'csllValue', matchedHeader: 'Valor CSLL Retido', label: 'Valor CSLL Retido', required: false },
    ],
    missingEssentialColumns: [],
    unmatchedHeaders: ['Código Tributação Município', 'Retenção Fonte'],
    sampleProcessed: true,
    fileName: 'planilha_servicos_realizados_projel_demo.xlsx',
    baseName: 'Serviços',
    loadTimestamp: new Date().toLocaleString('pt-BR'),
    reconciliation: {
      sumNetValue: Math.round(records.reduce((acc, r) => acc + r.netValue, 0) * 100) / 100,
      sumItemValue: Math.round(records.reduce((acc, r) => acc + r.itemValue, 0) * 100) / 100,
      sumCalculatedPriceQty: Math.round(records.reduce((acc, r) => acc + (r.grossCalculatedValue || r.unitPrice * r.qtyRequested), 0) * 100) / 100,
      sumOpenValue: Math.round(records.reduce((acc, r) => acc + r.openValue, 0) * 100) / 100,
      sumCancelledValue: Math.round(records.reduce((acc, r) => acc + r.cancelledValue, 0) * 100) / 100,
      sumDiscount: Math.round(records.reduce((acc, r) => acc + r.discountValue, 0) * 100) / 100,
      sumActiveNetValue: Math.round(records.filter((r) => r.statusGroup !== 'Cancelada').reduce((acc, r) => acc + r.netValue, 0) * 100) / 100,
      sumActiveItemValue: Math.round(records.filter((r) => r.statusGroup !== 'Cancelada').reduce((acc, r) => acc + r.itemValue, 0) * 100) / 100,
      hasNetValueColumn: true,
      hasItemValueColumn: true,
      hasUnitPriceColumn: true,
      discrepantRowsCount: records.filter((r) => Math.abs(r.netValue - r.itemValue) > 0.01).length,
    },
  };

  return { records, report };
}

/**
 * Retorna demonstração completa de Compras para compatibilidade retroativa
 */
export function generateProjelDemoData(): { records: PurchaseRecord[]; report: MappingReport } {
  return generateComprasDemoData();
}
