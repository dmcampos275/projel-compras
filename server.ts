import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const dataDir = path.resolve(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Suporte a payloads de até 100MB para planilhas grandes do ERP Projel
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Endpoint corporativo: consulta de base carregada (Compras ou Serviços)
app.get('/api/datasets/:origin', (req, res) => {
  const originParam = req.params.origin.toLowerCase();
  const originKey = originParam === 'servicos' ? 'servicos' : 'compras';
  const filePath = path.join(dataDir, `${originKey}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Base não encontrada no servidor' });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    return res.send(raw);
  } catch (err) {
    console.error(`[Servidor] Erro ao ler base ${originKey}:`, err);
    return res.status(500).json({ error: 'Erro ao ler dados da base' });
  }
});

// Endpoint corporativo: gravação permanente da base com compartilhamento instantâneo
app.post('/api/datasets/:origin', (req, res) => {
  const originParam = req.params.origin.toLowerCase();
  const originKey = originParam === 'servicos' ? 'servicos' : 'compras';
  const filePath = path.join(dataDir, `${originKey}.json`);

  try {
    const payload = req.body;
    if (!payload || !payload.records || !payload.report) {
      return res.status(400).json({ error: 'Formato de payload inválido' });
    }

    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');
    console.log(`[Servidor] Base ${originKey} salva com sucesso (${payload.records.length} registros).`);
    return res.status(200).json({
      success: true,
      totalRows: payload.records.length,
      fileName: payload.report.fileName,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[Servidor] Erro ao salvar base ${originKey}:`, err);
    return res.status(500).json({ error: 'Erro ao gravar dados no servidor' });
  }
});

// Endpoint corporativo: remoção da base
app.delete('/api/datasets/:origin', (req, res) => {
  const originParam = req.params.origin.toLowerCase();
  const originKey = originParam === 'servicos' ? 'servicos' : 'compras';
  const filePath = path.join(dataDir, `${originKey}.json`);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover base' });
  }
});

async function start() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Modo desenvolvimento: Vite middlewares montados no Express
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Modo produção: serve arquivos estáticos do dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Projel Compras] Servidor Full-Stack ativo na porta ${PORT}`);
  });
}

start();
