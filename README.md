# Dashboard Executivo de Compras e Serviços Realizados — Projel Engenharia

Sistema corporativo de inteligência em suprimentos e subempreitadas desenvolvido para a **Projel Engenharia**. O dashboard realiza o processamento *client-side* de planilhas exportadas do ERP (Totvs Protheus / Excel), com persistência em nuvem em tempo real através do **Google Cloud Firestore**.

---

## 🚀 Principais Funcionalidades

### 1. Upload Duplo e Independente
- **Planilha de Compras**: Materiais, insumos físicos, insumos civis e elétricos (.xlsx, .xls ou .csv).
- **Planilha de Serviços Realizados**: Contratos de prestação de serviços, medições de obras e subempreitadas.
- Mapeamento dinâmico de cabeçalhos normalizados com tolerância a variações do ERP (espaços extras, acentos e ordem distinta de colunas).
- Painel de verificação de integridade e auditoria de colunas essenciais.

### 2. Visão Unificada e Filtro Global de Origem
- Seletor rápido fixo: `[Compras]` | `[Serviços]` | `[Consolidado]`.
- Cores corporativas no modo consolidado:
  - **Compras (Materiais):** Azul-marinho (`#0B2545`)
  - **Serviços Realizados:** Laranja (`#F28C28`)
- Regras de deduplicação automática no modo consolidado com chave `Filial + Nº Ordem + Seq.` (prioridade: Compras).
- Alternador global de Base de Cálculo: `[Valor Líquido]` (padrão ERP), `[Valor do Item]` ou `[Preço × Qtd]`, com controle de canceladas.

### 3. Painéis e Abas Especializadas
1. **Visão Geral:** KPIs executivos (Volume contratado, Ticket médio, Prazo médio, Atraso %, Ordens únicas, Fornecedores ativos) e evolução temporal.
2. **Fornecedores & Prestadores:** Curva ABC de fornecedores, concentração financeira e auditoria de filiais atendidas por cada parceiro.
3. **Serviços Realizados:** Acompanhamento exclusivo de serviços com taxa de medição (pedida vs realizada vs aberta), retenções fiscais na fonte (ISS, INSS, IRRF, PIS, COFINS, CSLL) e gestão de ordens em atraso.
4. **Comparativo Compras vs Serviços:** Gráficos de barras empilhadas por obra/centro de custo, donut de participação no gasto geral e detecção de fornecedores híbridos.
5. **Famílias & Itens:** Pareto de categorias e dispersão de preços unitários.
6. **Centros de Custo:** Alocação orçamentária por obra e projeto civil/industrial.
7. **Prazos & Entregas:** Monitoramento de Lead Time e identificação proativa de gargalos de entrega.
8. **Compradores & Gestores:** Volume financeiro gerido por comprador.
9. **Dados Detalhados:** Tabela paginada completa com seleção dinâmica de colunas e exportação em Excel (.xlsx) e CSV.

### 4. Persistência em Nuvem via Google Cloud Firestore
- Sincronização automática em nuvem das bases tratadas.
- Particionamento em chunks para alta velocidade e escalabilidade de dados sem estourar limites de documentos.
- Indicador visual em tempo real no cabeçalho (*Firestore Ativo* e *Sincronizando Nuvem...*).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Vite
- **Estilização:** Tailwind CSS v4
- **Gráficos:** Recharts
- **Manipulação de Planilhas:** SheetJS (`xlsx`)
- **Ícones:** Lucide React
- **Banco de Dados Cloud:** Google Cloud Firestore (Firebase SDK v12)

---

## 💻 Como Rodar o Projeto Localmente

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**

### 1. Clonar o repositório
```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
O aplicativo estará disponível em: `http://localhost:3000`

### 4. Build de produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`.

---

## 📦 Como Publicar no seu GitHub

Se você já criou um repositório no GitHub (por exemplo, `dashboard-compras-projel`):

```bash
# 1. Inicialize o git (caso não esteja inicializado)
git init

# 2. Adicione todos os arquivos
git add .

# 3. Crie o primeiro commit
git commit -m "feat: Dashboard de Compras e Serviços Projel com Cloud Firestore"

# 4. Renomeie a branch para main
git branch -M main

# 5. Conecte ao seu repositório no GitHub (substitua com a sua URL)
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git

# 6. Envie o código para o GitHub
git push -u origin main
```

---

## 📄 Licença
Uso interno e corporativo — Projel Engenharia.
