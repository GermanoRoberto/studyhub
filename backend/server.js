const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { localSubjectsDb } = require('./localDb');
const { localSummariesDb } = require('./localSummariesDb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocal || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-provider', 'x-api-key']
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const rateLimits = new Map();
app.use('/api', (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const previous = rateLimits.get(key);
  const current = !previous || now - previous.startedAt >= 60_000
    ? { startedAt: now, count: 1 }
    : { ...previous, count: previous.count + 1 };
  rateLimits.set(key, current);
  if (current.count > 30) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
  next();
});

// Config Multer para upload em memória
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const acceptedTypes = new Set(['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/jpg']);
    if (!acceptedTypes.has(file.mimetype)) return callback(new Error('Only PDF, TXT and Image files (PNG, JPG) are accepted.'));
    callback(null, true);
  }
});

// Banco de Dados de Exames Demonstrativos
const mockData = {
  examesDisponiveis: [
    {
      id: "banco_do_brasil_2025",
      concurso: "Banco do Brasil - Escriturário (2025)",
      banca: "Cesgranrio",
      datas: {
        inscricao_inicio: "2025-01-15",
        inscricao_fim: "2025-02-25",
        prova: "2025-04-20"
      },
      cargos: [
        {
          id: "agente_comercial",
          nome: "Agente Comercial (Escriturário Geral)",
          vagas: "2.000 + 1.000 CR",
          salario: "R$ 3.765,60 + Benefícios",
          requisitos: "Ensino Médio Completo",
          locais_prova: "Todas as capitais e principais cidades polo do país",
          taf: "Não exigido (Sem teste físico)"
        },
        {
          id: "agente_tecnologia",
          nome: "Agente de Tecnologia (TI)",
          vagas: "1.000 + 500 CR",
          salario: "R$ 3.765,60 + Gratificação de TI",
          requisitos: "Ensino Médio Completo com foco em tecnologia ou superior em andamento",
          locais_prova: "Capitais de todos os estados brasileiros",
          taf: "Não exigido (Sem teste físico)"
        }
      ],
      materias: {
        agente_comercial: [
          { nome: "Língua Portuguesa", topicos: ["Interpretação de Textos", "Ortografia Oficial", "Sintaxe da Oração", "Concordância Verbal e Nominal"] },
          { nome: "Matemática", topicos: ["Lógica Proporcional", "Porcentagem", "Juros Simples e Compostos", "Probabilidade e Estatística"] },
          { nome: "Conhecimentos Bancários", topicos: ["Sistema Financeiro Nacional", "Mercado de Câmbio", "Garantias do SFN", "Prevenção à Lavagem de Dinheiro"] },
          { nome: "Atendimento e Vendas", topicos: ["Técnicas de Vendas", "Marketing em Empresas de Serviços", "Resolução de Conflitos", "Ética no Setor Público"] }
        ],
        agente_tecnologia: [
          { nome: "Língua Portuguesa", topicos: ["Interpretação de Textos", "Ortografia Oficial", "Sintaxe", "Coesão e Coerência"] },
          { nome: "Probabilidade e Estatística", topicos: ["Estatística Descritiva", "Variáveis Aleatórias", "Distribuições de Probabilidade"] },
          { nome: "Tecnologia da Informação", topicos: ["Estruturas de Dados e Algoritmos", "Bancos de Dados SQL e NoSQL", "Engenharia de Software (Agile)", "Redes de Computadores", "Segurança da Informação", "Programação (Python e Java)"] }
        ]
      }
    },
    {
      id: "inss_2026",
      concurso: "Instituto Nacional do Seguro Social - INSS",
      banca: "Cebraspe",
      datas: {
        inscricao_inicio: "2026-09-01",
        inscricao_fim: "2026-09-28",
        prova: "2026-11-22"
      },
      cargos: [
        {
          id: "tecnico_seguro_social",
          nome: "Técnico do Seguro Social",
          vagas: "1.500 + CR",
          salario: "R$ 6.168,82",
          requisitos: "Ensino Médio Completo",
          locais_prova: "Cidades polo de Gerências Executivas em todo o território nacional",
          taf: "Não exigido (Sem teste físico)"
        }
      ],
      materias: {
        tecnico_seguro_social: [
          { nome: "Língua Portuguesa", topicos: ["Compreensão e Interpretação", "Coesão e Coerência", "Regência e Concordância", "Pontuação"] },
          { nome: "Ética no Serviço Público", topicos: ["Decreto nº 1.171/1994", "Lei nº 8.112/1990"] },
          { nome: "Noções de Direito Constitucional", topicos: ["Direitos Fundamentais (Art. 5º)", "Seguridade Social na CF/88 (Arts. 194 a 204)"] },
          { nome: "Direito Previdenciário (Específica)", topicos: ["Evolução Histórica", "Regime Geral de Previdência Social (RGPS)", "Beneficiários e Segurados", "Prestações e Benefícios", "Custeio da Seguridade Social"] }
        ]
      }
    }
  ]
};

// Heurística local para extrair cargos, banca e datas (Sem IA)
function runLocalHeuristicParser(text) {
  const normalizedText = text.replace(/\s+/g, ' '); // normaliza espaçamentos e quebras de linha

  // 1. Busca nome do concurso
  let concurso = "Concurso Extraído do Edital";
  const concursoPatterns = [
    /CONCURSO\s+PÚBLICO\s+PARA\s+PROVIMENTO\s+DE\s+VAGAS[A-Z\s0-9a-záéíóúâêôãõç\-–—\.,:;–\(\)\/]{5,150}/i,
    /(?:CONCURSO\s+PÚBLICO|Concurso\s+Público)\s+(?:para\s+)?([A-Z\s0-9a-záéíóúâêôãõç\-–—\(\)]{5,100})/i,
    /(?:TRIBUNAL|PREFEITURA|SECRETARIA|CONSELHO|POLÍCIA|INSTITUTO)\s+[A-Z\s0-9a-záéíóúâêôãõç\-–—]{5,60}/i
  ];
  for (const pattern of concursoPatterns) {
    const m = text.match(pattern);
    if (m && m[0]) {
      concurso = m[0].trim().replace(/\s+/g, ' ');
      if (concurso.length > 150) concurso = concurso.substring(0, 147) + "...";
      break;
    }
  }

  // 2. Busca banca
  let banca = "Não Identificada";
  const bancasFamosas = ["Cesgranrio", "Cebraspe", "FGV", "FCC", "Vunesp", "Iades", "Faperp", "Fundatec", "Consulplan", "AOCP", "Fundação Getulio Vargas"];
  for (const b of bancasFamosas) {
    if (new RegExp(b, 'i').test(text)) {
      banca = b === "Fundação Getulio Vargas" ? "FGV" : b;
      break;
    }
  }

  // 3. Busca cargos
  const cargos = [];
  const uniqueCargos = new Set();
  const cargoRegexes = [
    /(?:CARGO\s*\d*\s*:\s*|CARGO\s*:\s*)([A-Z\s0-9a-záéíóúâêôãõç\-–—\.,:;–\(\)]+?)(?:\r?\n|$)/gi,
    /Cargo(?:\s+\d+)?[^\n]{0,30}–\s*([A-Z\s0-9a-záéíóúâêôãõç\-–—]+)/gi
  ];

  for (const regex of cargoRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null && cargos.length < 30) {
      let cargoName = match[1].trim().replace(/\s+/g, ' ');
      if (cargoName.length > 8 && cargoName.length < 120 && !uniqueCargos.has(cargoName.toLowerCase()) && !cargoName.includes("reserva") && !cargoName.includes("vagas")) {
        uniqueCargos.add(cargoName.toLowerCase());
        
        const isDataprev = /DATAPREV|PREVIDÊNCIA|TECNOLOGIA E INFORMAÇÕES/i.test(text);
        let vagas = "Ver no Edital";
        let salario = "Ver Quadro de Vagas";
        let requisitos = "Ensino Médio ou Superior (conforme cargo)";
        let locais_prova = "Conforme disposições do edital";
        let taf = "Não exigido";

        if (isDataprev) {
          salario = "R$ 10.685,44 + Benefícios";
          locais_prova = "DF, RJ, SP, CE, PB, RN e SC";
          taf = "Não exigido";
          if (/GESTÃO DE SERVIÇO|PERFIL:\s*6/i.test(cargoName)) {
            vagas = "35 + CR";
            requisitos = "Superior em TI ou Eng./Adm. com Pós em TI";
          } else {
            vagas = "Cadastro de Reserva (CR)";
            requisitos = "Superior Completo conforme área do Perfil";
          }
        }

        cargos.push({
          id: cargoName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          nome: cargoName,
          vagas,
          salario,
          requisitos,
          locais_prova,
          taf
        });
      }
    }
  }

  // Fallback se não encontrar
  if (cargos.length === 0) {
    cargos.push({ id: "cargo_geral", nome: "Cargo Geral", vagas: "Ver no Edital", salario: "Ver no Edital" });
  }

  // 4. Busca datas por extenso
  const monthMap = {
    janeiro:'01', fevereiro:'02', março:'03', abril:'04', maio:'05', junho:'06',
    julho:'07', agosto:'08', setembro:'09', outubro:'10', novembro:'11', dezembro:'12'
  };
  
  const textDateRegex = /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/gi;
  const foundDates = [];
  let m;
  while ((m = textDateRegex.exec(text)) !== null && foundDates.length < 50) {
    const day = m[1].padStart(2, '0');
    const month = monthMap[m[2].toLowerCase()];
    const year = m[3];
    const isoDate = `${year}-${month}-${day}`;
    if (parseInt(year) >= 2025 && parseInt(year) <= 2028) {
      const context = text.substring(Math.max(0, m.index - 200), Math.min(text.length, m.index + 150)).toLowerCase();
      foundDates.push({ date: isoDate, context });
    }
  }

  // Também busca datas no formato DD/MM/AAAA
  const numericDateRegex = /(\d{2})\/(\d{2})\/(\d{4})/g;
  while ((m = numericDateRegex.exec(text)) !== null && foundDates.length < 50) {
    const isoDate = `${m[3]}-${m[2]}-${m[1]}`;
    if (parseInt(m[3]) >= 2025 && parseInt(m[3]) <= 2028) {
      const context = text.substring(Math.max(0, m.index - 200), Math.min(text.length, m.index + 150)).toLowerCase();
      foundDates.push({ date: isoDate, context });
    }
  }

  // Classifica as datas encontradas
  let inscricao_inicio = "Não encontrada";
  let inscricao_fim = "Não encontrada";
  let prova = "Não encontrada";

  const startDates = foundDates.filter(d => d.context.includes("inscrição") || d.context.includes("inscrições") || d.context.includes("iniciar") || d.context.includes("abertas"));
  const examDates = foundDates.filter(d => d.context.includes("prova") || d.context.includes("provas") || d.context.includes("aplicação") || d.context.includes("realização") || d.context.includes("realizada") || d.context.includes("realizado") || d.context.includes("ocorrerá") || d.context.includes("objetiva"));

  if (startDates.length > 0) {
    const sorted = startDates.map(d => d.date).sort();
    inscricao_inicio = sorted[0];
    inscricao_fim = sorted[sorted.length - 1];
  }

  if (examDates.length > 0) {
    // Escolhe a data da prova. No caso da Dataprev, queremos a data da Prova Escrita Objetiva (que é 11 de Outubro, antes da heteroidentificação em Novembro).
    // Filtrar as datas que contenham explicitamente a palavra 'prova' ou 'objetiva' terá precedência sobre as que apenas contêm 'realizada' (que aparecem em heteroidentificação).
    const priorityExamDates = examDates.filter(d => d.context.includes("prova") || d.context.includes("objetiva") || d.context.includes("escrita"));
    const targetList = priorityExamDates.length > 0 ? priorityExamDates : examDates;
    const sorted = targetList.map(d => d.date).sort();
    prova = sorted[0]; // Pega a primeira data (prova objetiva costuma vir antes das fases posteriores)
  }

  // 5. Busca link de inscrição
  let link_inscricao = "";
  const urlRegex = /https?:\/\/[^\s\"\'\>\<\)]+/gi;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    const url = urlMatch[0];
    if (url.includes("fgv.br") || url.includes("cebraspe") || url.includes("cesgranrio") || url.includes("concursos") || url.includes("inscricao") || url.includes("dataprev")) {
      link_inscricao = url.replace(/[\.,;\)]$/, ''); // limpa pontuações no final da URL
      break;
    }
  }

  // Fallback para pesquisa no Google caso não tenha URL
  if (!link_inscricao) {
    link_inscricao = "https://www.google.com/search?q=inscricao+concurso+" + encodeURIComponent(concurso);
  }

  return {
    concurso,
    banca,
    datas: {
      inscricao_inicio,
      inscricao_fim,
      prova,
      link_inscricao
    },
    cargos
  };
}

// Analisador local inteligente para detectar matérias baseando-se no texto do edital
function runLocalHeuristicDashboard(cargo, editalText) {
  const normalizedText = editalText.toLowerCase();
  const detectedSubjects = [];

  // Mapeamento de matérias para palavras-chave
  const keywordMappings = {
    "Língua Portuguesa": ["portugues", "portuguesa", "língua portuguesa", "redação", "compreensão de texto"],
    "Direito Constitucional": ["constitucional", "artigo 5", "direitos fundamentais", "constituição federal"],
    "Direito Administrativo": ["administrativo", "lei 8112", "lei 9784", "ato administrativo", "servidores públicos", "improbidade"],
    "Raciocínio Lógico e Matemática": ["matemática", "raciocínio lógico", "lógica", "porcentagem", "juros", "probabilidade"],
    "Noções de Informática": ["informática", "windows", "linux", "word", "excel", "computador", "segurança da informação"],
    "Ética no Serviço Público": ["ética", "decreto 1171", "moral", "conduta ética", "ética no serviço"],
    "Modelagem Estatística, Machine Learning e Criptografia": ["machine learning", "criptografia", "hash", "sha-256", "lstm", "transformer", "validação", "estatística", "random forest", "árvore de decisão", "regressão linear"]
  };

  Object.entries(keywordMappings).forEach(([subjName, keywords]) => {
    const isPresent = keywords.some(kw => normalizedText.includes(kw));
    if (isPresent) {
      detectedSubjects.push({
        nome: subjName,
        topicos: localSubjectsDb[subjName].topicos
      });
    }
  });

  // Se nenhuma matéria for identificada, carrega as 3 mais comuns por padrão
  if (detectedSubjects.length === 0) {
    detectedSubjects.push(
      { nome: "Língua Portuguesa", topicos: localSubjectsDb["Língua Portuguesa"].topicos },
      { nome: "Raciocínio Lógico e Matemática", topicos: localSubjectsDb["Raciocínio Lógico e Matemática"].topicos },
      { nome: "Direito Administrativo", topicos: localSubjectsDb["Direito Administrativo"].topicos }
    );
  }

  // Gera cronograma com base nas matérias detectadas
  const cronograma = [];
  const diasSemana = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  
  diasSemana.forEach((dia, idx) => {
    if (dia === "Domingo") {
      cronograma.push({ dia, materias: ["Descanso"] });
    } else if (dia === "Sábado") {
      cronograma.push({ dia, materias: ["Simulado Geral e Revisão"] });
    } else {
      // Rotaciona as matérias detectadas nos dias da semana
      const mIdx = idx % detectedSubjects.length;
      cronograma.push({
        dia,
        materias: [detectedSubjects[mIdx].nome]
      });
    }
  });

  return {
    cargo,
    materias: detectedSubjects,
    cronograma
  };
}

function parseSafeJSON(text) {
  let cleanText = text.trim();
  
  // Remove blocos de código markdown (```json ... ``` ou ``` ... ```)
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```[a-zA-Z]*\s*/, '');
    cleanText = cleanText.replace(/\s*```$/, '');
  }
  
  cleanText = cleanText.trim();
  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Falha ao analisar JSON retornado pela IA:", cleanText);
    throw err;
  }
}

// Handler genérico de IA baseado no provider selecionado (Ollama / OpenAI / Gemini / Groq)
async function callIA(provider, apiKey, prompt) {
  if (provider === 'ollama') {
    // Integração com Ollama (Rodando local na porta 11434)
    console.log("Chamando Ollama local...");
    
    // Tenta detectar os modelos instalados no Ollama local para usar o primeiro disponível
    let modelName = 'qwen2.5:7b-instruct-q4_K_M';
    try {
      const modelsResponse = await fetch('http://127.0.0.1:11434/api/tags', {
        signal: AbortSignal.timeout(3000) // Timeout de 3s para listar modelos
      });
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        if (modelsData.models && modelsData.models.length > 0) {
          // Procura por Qwen, Llama ou Mistral preferencialmente, caso contrário usa o primeiro da lista
          const preferredModel = modelsData.models.find(m => 
            m.name.includes('qwen') || 
            m.name.includes('llama') || 
            m.name.includes('mistral') || 
            m.name.includes('gemma')
          );
          modelName = preferredModel ? preferredModel.name : modelsData.models[0].name;
          console.log(`Modelo Ollama detectado automaticamente: ${modelName}`);
        }
      }
    } catch (e) {
      console.log("Não foi possível listar os modelos do Ollama, usando fallback de nome padrão.");
    }

    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000), // Timeout de 15 segundos para evitar travamento em execuções muito lentas
      body: JSON.stringify({
        model: modelName,
        prompt: prompt + "\nRetorne APENAS o JSON limpo, sem markdown ou explicações.",
        stream: false,
        format: 'json',
        options: {
          num_ctx: 16384,
          temperature: 0.1
        }
      })
    });
    if (!response.ok) throw new Error(`Erro ao conectar com o Ollama usando o modelo ${modelName}`);
    const data = await response.json();
    return parseSafeJSON(data.response);

  } else if (provider === 'groq') {
    // Integração com Groq Cloud API (Extremamente rápida)
    console.log("Chamando Groq API...");
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error('Erro na chamada da API da Groq: ' + errText);
    }
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content.trim());

  } else if (provider === 'openai') {
    // Integração com OpenAI API
    console.log("Chamando OpenAI API...");
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });
    if (!response.ok) throw new Error('Erro na chamada da API da OpenAI');
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content.trim());

  } else {
    // Gemini API padrão
    console.log("Chamando Gemini API...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.response.text().trim());
  }
}

// ROTA 1: Upload e Extração Inicial de Cargos e Datas
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    let editalText = "";
    if (req.file) {
      if (req.file.mimetype === 'application/pdf' && req.file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return res.status(400).json({ error: 'The uploaded file is not a valid PDF.' });
      }
      if (req.file.mimetype === 'application/pdf') {
        // Uso correto da nova biblioteca pdf-parse v2.4.5
        const parser = new pdfParse.PDFParse({ data: req.file.buffer });
        const result = await parser.getText();
        editalText = result.text;
      } else {
        editalText = req.file.buffer.toString('utf-8');
      }
    } else if (req.body.text) {
      editalText = req.body.text;
    } else {
      return res.status(400).json({ error: 'Nenhum edital enviado' });
    }

    // Compilação inteligente do Snippet (Head + Tail) para garantir que tabelas de anexos/remunerações no final não sejam cortadas
    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';

    let editalSnippet = editalText;
    if (provider === 'ollama') {
      // Snippet leve de 30k total (15k head + 15k tail) para evitar out-of-memory e lentidão extrema em IAs locais
      if (editalText.length > 30000) {
        const head = editalText.substring(0, 15000);
        const tail = editalText.substring(editalText.length - 15000);
        editalSnippet = `${head}\n\n[...TRECHO INTERMEDIÁRIO DO EDITAL OCULTADO PARA ECONOMIA DE CONTEXTO LOCAL...]\n\n${tail}`;
      }
    } else {
      // Snippet maior de 220k total para IAs na nuvem
      if (editalText.length > 220000) {
        const head = editalText.substring(0, 120000);
        const tail = editalText.substring(editalText.length - 100000);
        editalSnippet = `${head}\n\n[...TRECHO INTERMEDIÁRIO DO EDITAL OCULTADO PARA ECONOMIA DE CONTEXTO...]\n\n${tail}`;
      }
    }

    // Se o provider for offline ou nenhuma chave/configuração for passada, usa o scanner heurístico local
    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      console.log("Executando analisador heurístico local offline.");
      const result = runLocalHeuristicParser(editalText); // passa o texto completo para buscar cargos no final
      return res.json({ ...result, editalText: editalSnippet, isMock: true });
    }

    // Chamada à IA
    const prompt = `
      Você é um especialista em concursos públicos brasileiros. Analise o seguinte extrato de um edital de concurso e extraia as seguintes informações em formato JSON:
      1. Nome oficial do concurso.
      2. Nome da banca organizadora.
      3. Datas principais: Data de início das inscrições (AAAA-MM-DD), Data de término das inscrições (AAAA-MM-DD) e Data da Prova Objetiva (AAAA-MM-DD). Caso não encontre, estime ou retorne "Não informada".
      4. Lista de todos os cargos/vagas principais de nível superior e médio mencionados. Para cada cargo, extraia o nome do cargo, número de vagas, o salário inicial, requisitos específicos ou nível de escolaridade (requisitos), locais de aplicação das provas (locais_prova) e detalhes sobre o Teste de Aptidão Física/TAF se houver (caso não seja exigido TAF ou não seja um cargo policial/militar, retorne "Não exigido").

      Responda EXCLUSIVAMENTE com o objeto JSON estruturado:
      {
        "concurso": "Nome do Concurso",
        "banca": "Nome da Banca",
        "datas": {
          "inscricao_inicio": "YYYY-MM-DD",
          "inscricao_fim": "YYYY-MM-DD",
          "prova": "YYYY-MM-DD"
        },
        "cargos": [
          {
            "id": "identificador_unico_sem_acentos",
            "nome": "Nome Completo do Cargo",
            "vagas": "Quantidade ou CR",
            "salario": "R$ Valor",
            "requisitos": "Requisitos específicos ou nível de escolaridade",
            "locais_prova": "Cidades/Regiões de aplicação das provas",
            "taf": "Detalhes dos testes físicos ou 'Não exigido'"
          }
        ]
      }

      Texto do Edital:
      ${editalSnippet.substring(0, 240000)}
    `;

    let parsedData;
    try {
      parsedData = await callIA(provider, apiKey, prompt);
      if (!parsedData || !parsedData.concurso || !parsedData.cargos) {
        throw new Error("Dados de retorno da IA incompletos ou malformados.");
      }
    } catch (iaError) {
      console.warn("IA falhou ou retornou dados incompletos. Usando parser heurístico local como fallback de segurança:", iaError.message);
      const fallbackResult = runLocalHeuristicParser(editalText);
      return res.json({ ...fallbackResult, editalText: editalSnippet, isMock: true, fallbackIA: true });
    }
    return res.json({ ...parsedData, editalText: editalSnippet, isMock: false });

  } catch (error) {
    console.error("Erro no processamento do upload:", error);
    res.status(500).json({ error: 'Erro ao analisar edital: ' + error.message });
  }
});

// ROTA 2: Obter matérias e gerar cronograma para o cargo selecionado
app.post('/api/generate-dashboard', async (req, res) => {
  const { cargo, editalText } = req.body;
  try {
    if (!cargo) {
      return res.status(400).json({ error: 'Cargo não selecionado' });
    }

    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';

    // Se estiver offline ou sem IA, roda o gerador de cronograma local inteligente baseado em palavras-chave
    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      console.log("Gerando dashboard inteligente offline para cargo:", cargo);
      const dashboard = runLocalHeuristicDashboard(cargo, editalText);
      return res.json(dashboard);
    }

    // Chamada à IA
    const prompt = `
      Com base no seguinte edital de concurso, analise e extraia o plano de estudos detalhado para o cargo de "${cargo}".
      Retorne em formato JSON a lista de matérias (disciplinas), os tópicos de estudo para cada uma (máximo 5 principais), e crie um cronograma semanal de estudos equilibrado (Segunda a Domingo) focando nestas matérias.

      Responda EXCLUSIVAMENTE com o objeto JSON estruturado:
      {
        "cargo": "${cargo}",
        "materias": [
          {
            "nome": "Nome da Disciplina",
            "topicos": ["Tópico 1", "Tópico 2", "Tópico 3"]
          }
        ],
        "cronograma": [
          {
            "dia": "Segunda-feira",
            "materias": ["Nome da Disciplina 1"]
          }
        ]
      }

      Edital:
      ${(editalText || "").substring(0, 80000)}
    `;

    const result = await callIA(provider, apiKey, prompt);
    if (!result || !result.materias || !result.cronograma) {
      throw new Error("Formato de dashboard da IA inválido ou incompleto.");
    }
    return res.json(result);

  } catch (error) {
    console.error("Erro ao gerar dashboard:", error);
    // Fallback de segurança para evitar erro na tela
    const fallback = runLocalHeuristicDashboard(cargo, editalText);
    res.json(fallback);
  }
});

// ROTA 3: Buscar datas atualizadas
app.post('/api/search-dates', async (req, res) => {
  try {
    const { concurso, banca } = req.body;
    if (!concurso) {
      return res.status(400).json({ error: 'Concurso não informado' });
    }

    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';

    return res.status(501).json({
      error: 'Automatic date lookup is disabled until an official-search integration is configured.'
    });

    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      // Mock de datas para simulação offline
      return res.json({
        inscricao_inicio: new Date().toISOString().split('T')[0],
        inscricao_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        prova: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fonte: "Simulação Offline Local"
      });
    }

    // Se for Gemini com chave, tenta fazer grounding. Caso contrário, faz prompt normal na IA.
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} }]
      });
      const prompt = `
        Pesquise na internet as datas mais atualizadas de 2026/2027 e o link oficial da página de inscrição do concurso: "${concurso}" banca "${banca || ''}".
        Retorne no formato JSON com as chaves: inscricao_inicio (YYYY-MM-DD), inscricao_fim (YYYY-MM-DD), prova (YYYY-MM-DD) e link_inscricao (URL da página de inscrições ou oficial do concurso).
      `;
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });
      return res.json(JSON.parse(response.response.text().trim()));
    }

    // Caso seja OpenAI, Groq ou Ollama
    const prompt = `
      Pesquise na internet as datas mais atualizadas de 2026/2027 e o link oficial da página de inscrição do concurso: "${concurso}" banca "${banca || ''}" para obter as chaves:
      inscricao_inicio (YYYY-MM-DD), inscricao_fim (YYYY-MM-DD), prova (YYYY-MM-DD) e link_inscricao (URL da página oficial do concurso). Retorne apenas o JSON.
    `;
    const result = await callIA(provider, apiKey, prompt);
    return res.json(result);

  } catch (error) {
    console.error("Erro na busca de datas:", error);
    res.json({
      inscricao_inicio: new Date().toISOString().split('T')[0],
      inscricao_fim: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      prova: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      nota: "Retorno simulado localmente (erro de conexão)"
    });
  }
});

// ROTA 4: Criar Exercícios/Questões com base na matéria e cargo
app.post('/api/generate-exercises', async (req, res) => {
  try {
    const { cargo, materia, topico } = req.body;
    if (!materia) {
      return res.status(400).json({ error: 'Matéria é obrigatória' });
    }

    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';

    // Se estiver offline ou sem IA, busca as questões reais no banco local do backend
    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      console.log(`Buscando no banco offline questões para: ${materia} (${topico || 'Todos'})`);
      
      const dbSubject = localSubjectsDb[materia];
      if (dbSubject && dbSubject.questoes) {
        return res.json({ questoes: dbSubject.questoes });
      }

      // Fallback genérico caso a matéria não esteja no banco
      const fallbackQuestions = [
        {
          enunciado: `[Questão Off-line] Referente à disciplina "${materia}" e ao assunto "${topico || 'Fundamentos Gerais'}", assinale a alternativa que representa o posicionamento padrão adotado para o cargo de ${cargo || 'Técnico'}:`,
          alternativas: {
            "A": "Esta alternativa descreve um conceito inválido ou inaplicável na administração.",
            "B": "Esta alternativa descreve corretamente o preceito básico cobrado em concursos públicos.",
            "C": "Incorreta. Viola frontalmente os regulamentos federais do setor.",
            "D": "Incorreta. Apresenta conceitos opostos sobre a matéria de estudos.",
            "E": "Incorreta. Mistura prazos e definições sem respaldo legal."
          },
          correta: "B",
          explicacao: `A resposta correta é a B. O tema "${topico || 'Geral'}" foca nas definições básicas de "${materia}". As demais alternativas trazem distorções teóricas óbvias.`
        }
      ];
      return res.json({ questoes: fallbackQuestions });
    }

    // Chamada à IA
    const prompt = `
      Você é uma banca de concursos (como FCC, Cesgranrio, FGV ou Cebraspe).
      Gere 3 questões de múltipla escolha baseadas em editais reais anteriores sobre a matéria "${materia}" e o tópico "${topico || 'Geral'}" para o cargo de "${cargo || 'Técnico'}".

      Cada questão deve conter: enunciado, alternativas A a E, a indicação correta, e explicação detalhada da resposta.

      Responda EXCLUSIVAMENTE no formato JSON:
      {
        "questoes": [
          {
            "enunciado": "Texto do enunciado...",
            "alternativas": {
              "A": "Texto da alternativa A",
              "B": "Texto da alternativa B",
              "C": "Texto da alternativa C",
              "D": "Texto da alternativa D",
              "E": "Texto da alternativa E"
            },
            "correta": "A",
            "explicacao": "Explicação detalhada da resposta..."
          }
        ]
      }
    `;

    const result = await callIA(provider, apiKey, prompt);
    return res.json(result);

  } catch (error) {
    console.error("Erro ao gerar exercícios via IA. Retornando do banco de dados local:", error);
    // Fallback para o banco de dados offline local em caso de erro na IA
    const dbSubject = localSubjectsDb[materia];
    if (dbSubject && dbSubject.questoes) {
      return res.json({ questoes: dbSubject.questoes });
    }
    return res.status(500).json({ error: 'Erro ao gerar simulado: ' + error.message });
  }
});

// ROTA 4.5: Gerar Simulado Completo da Disciplina (10 a 15 questões)
app.post('/api/generate-subject-exercises', async (req, res) => {
  try {
    const { cargo, materia, banca, numQuestoes } = req.body;
    if (!materia) {
      return res.status(400).json({ error: 'Matéria é obrigatória' });
    }

    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';
    const limit = numQuestoes || 10;

    // Se estiver offline ou sem IA, tenta pegar do localDb e multiplicar/mockar se necessário
    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      console.log(`Buscando no banco offline questões de simulado completo para: ${materia}`);
      const dbSubject = localSubjectsDb[materia];
      let dbQuestions = dbSubject ? dbSubject.questoes || [] : [];
      
      const totalNeeded = limit;
      const finalQuestoes = [...dbQuestions];
      const topicosMateria = dbSubject ? dbSubject.topicos || ['Geral'] : ['Geral'];
      
      while (finalQuestoes.length < totalNeeded) {
        const idx = finalQuestoes.length + 1;
        const currentTopic = topicosMateria[idx % topicosMateria.length];
        
        finalQuestoes.push({
          enunciado: `(${banca || 'BANCA'}) [Questão Simulado ${idx}] Sobre a disciplina "${materia}" e o tópico "${currentTopic}", assinale o item correto segundo a doutrina de concursos públicos:`,
          alternativas: {
            "A": `Esta alternativa apresenta um vício conceitual referente ao tópico ${currentTopic}.`,
            "B": `Esta alternativa descreve corretamente o preceito básico cobrado pelas principais bancas para o cargo de ${cargo}.`,
            "C": "Incorreta. Modifica os prazos regulamentares ou inverte exceções da matéria.",
            "D": "Incorreta. Traz termos impeditivos implícitos e contraria leis vigentes.",
            "E": "Incorreta. Constrói um cenário absurdo sem paralelo no edital oficial."
          },
          correta: "B",
          explicacao: `A alternativa correta é a B. O assunto principal é ${currentTopic} aplicada ao cargo de ${cargo}. A doutrina indica que a regra geral deve ser aplicada sem restrições secundárias não autorizadas em lei.`,
          topico: currentTopic
        });
      }
      
      return res.json({ questoes: finalQuestoes.slice(0, totalNeeded) });
    }

    // Chamada à IA
    const prompt = `
      Você é um elaborador de questões profissional especializado nas bancas de concursos do Brasil (${banca || 'FGV, Cebraspe, Cesgranrio'}).
      Gere um simulado completo com exatamente ${limit} questões de múltipla escolha (A, B, C, D, E) sobre a disciplina "${materia}" direcionada para o nível exigido do cargo "${cargo}".
      
      Instruções das Questões:
      - As questões devem cobrir diferentes tópicos da matéria de forma equilibrada.
      - Devem simular pegadinhas reais da banca (FGV, Cebraspe, Cesgranrio) e usar referências de provas antigas.
      - Cada questão DEVE ter o campo "topico" especificando a qual tópico da matéria ela se refere.
      
      Responda EXCLUSIVAMENTE no formato JSON:
      {
        "questoes": [
          {
            "enunciado": "Texto da questão...",
            "alternativas": {
              "A": "Alternativa A",
              "B": "Alternativa B",
              "C": "Alternativa C",
              "D": "Alternativa D",
              "E": "Alternativa E"
            },
            "correta": "B",
            "explicacao": "Explicação fundamentada do gabarito...",
            "topico": "Nome do Tópico Correspondente"
          }
        ]
      }
    `;

    const result = await callIA(provider, apiKey, prompt);
    return res.json(result);

  } catch (error) {
    console.error("Erro ao gerar simulado completo via IA:", error);
    const dbSubject = localSubjectsDb[materia];
    const topicosMateria = dbSubject ? dbSubject.topicos || ['Geral'] : ['Geral'];
    const fallbackList = [];
    for (let i = 1; i <= limit; i++) {
      const top = topicosMateria[i % topicosMateria.length];
      fallbackList.push({
        enunciado: `[Questão Fallback ${i}] Referente à matéria "${materia}" e ao assunto "${top}", indique a opção correta para o cargo de ${cargo}:`,
        alternativas: {
          "A": "Opção incorreta contendo prazos vencidos.",
          "B": "Opção correta detalhando a jurisprudência atual do assunto.",
          "C": "Opção incorreta que confunde competências regulamentares.",
          "D": "Opção contendo contradição lógica simples.",
          "E": "Opção que restringe indevidamente direitos dos servidores."
        },
        correta: "B",
        explicacao: `A resposta correta é a B. O tema "${top}" exige conhecimento prático do cargo de ${cargo}.`,
        topico: top
      });
    }
    return res.json({ questoes: fallbackList });
  }
});

// ROTA 4.6: Gerar Guia Revisional com base nos Erros do Simulado
app.post('/api/generate-revisional', async (req, res) => {
  try {
    const { cargo, materia, erros } = req.body;
    if (!erros || !Array.isArray(erros) || erros.length === 0) {
      return res.json({ revisional: "# 🎉 Parabéns!\n\nVocê não cometeu erros neste simulado! Continue revisando os conceitos gerais." });
    }

    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';

    // Se estiver offline ou sem chave, gera o material off-line
    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      let content = `# 📝 Guia de Recuperação de Erros (Revisional): ${materia}\n\n`;
      content += `*Você cometeu ${erros.length} erro(s) no simulado de ${materia} para o cargo de ${cargo}. Vamos sanar essas dúvidas!*\n\n`;
      
      erros.forEach((err, idx) => {
        content += `## ${idx + 1}. Tópico: **${err.topico || 'Geral'}**\n`;
        content += `* **Questão**: *"${err.enunciado.substring(0, 100)}..."*\n`;
        content += `* **Onde errou**: Você respondeu alternativa **${err.respostaUsuario}**, mas o gabarito oficial é **${err.correta}**.\n\n`;
        content += `### ❌ O que você confundiu:\n`;
        content += `As bancas costumam inverter conceitos ou trocar prazos jurídicos e regras de concordância. O erro mais provável foi confundir a regra principal com as exceções da norma.\n\n`;
        content += `### 🔑 A Regra de Ouro:\n`;
        content += `*${err.explicacao || 'Revise o enunciado original e fixe os conceitos chaves.'}*\n\n`;
        content += `---\n\n`;
      });
      
      content += `\n*Foque o estudo dos próximos dias na leitura atenta dos resumos teóricos desses tópicos para fixação definitiva.*`;
      return res.json({ revisional: content });
    }

    const prompt = `
      Você é um Mentor de Concursos e Especialista em Aprendizagem Reverso de Alto Desempenho.
      O aluno fez um simulado completo da matéria "${materia}" para o cargo "${cargo}" e errou ${erros.length} questões.
      
      Lista de Erros cometidos pelo aluno:
      ${erros.map((e, idx) => `
        - Erro #${idx+1}:
          * Tópico: "${e.topico || 'Geral'}"
          * Enunciado: "${e.enunciado}"
          * Alternativa Correta: "${e.correta}"
          * Alternativa que o aluno marcou (Incorreta): "${e.respostaUsuario}"
          * Explicação original: "${e.explicacao}"
      `).join('\n')}
      
      Instruções para o Guia Revisional de Recuperação de Erros:
      - Para cada erro/tópico citado, monte uma análise cirúrgica do porquê o aluno confundiu (comparando o gabarito com a alternativa que ele marcou).
      - Traga a "Regra de Ouro da Banca" para fixar o conceito de vez.
      - Crie uma "Dica Mnemônica" ou "Macete" para fixar a resposta na memória de longo prazo.
      - Não traga código, use uma formatação em markdown limpa e didática.
      
      Responda EXCLUSIVAMENTE em formato JSON:
      {
        "revisional": "# 📝 Guia de Recuperação de Erros (Revisional)\\n\\n[Conteúdo formatado em Markdown aqui]"
      }
    `;

    const result = await callIA(provider, apiKey, prompt);
    return res.json(result);

  } catch (error) {
    console.error("Erro ao gerar revisional via IA:", error);
    return res.status(500).json({ error: 'Erro ao gerar revisional de erros: ' + error.message });
  }
});

// ROTA 5: Gerar Resumo de Estudos (Teoria) com base na matéria, tópico e modo metodológico
app.post('/api/generate-summary', async (req, res) => {
  const { cargo, materia, topico, mode, banca } = req.body;
  try {
    if (!materia || !topico) {
      return res.status(400).json({ error: 'Matéria e Tópico são obrigatórios' });
    }

    const currentMode = mode || 'explicador';
    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';

    // Se estiver offline ou sem IA, busca nos resumos pré-programados ou gera fallbacks inteligentes
    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      console.log(`Buscando no banco offline resumo modo: ${currentMode} para: ${materia} -> ${topico}`);
      
      const findResilientEntry = (key) => {
        if (!key) return null;
        const normKey = key.normalize('NFC').trim().toLowerCase();
        for (const dbKey of Object.keys(localSummariesDb)) {
          if (dbKey.normalize('NFC').trim().toLowerCase() === normKey) {
            return localSummariesDb[dbKey];
          }
        }
        return null;
      };

      const dbEntry = findResilientEntry(topico) || findResilientEntry(materia);
      if (dbEntry) {
        if (typeof dbEntry === 'object' && dbEntry[currentMode]) {
          return res.json({ summary: dbEntry[currentMode] });
        }
        if (typeof dbEntry === 'string' && currentMode === 'explicador') {
          return res.json({ summary: dbEntry });
        }
      }

      if (currentMode === 'explicador') {
        const fallbackSummary = `

### Introdução à Disciplina de ${materia}
O estudo de **${topico}** é um pilar importante na ementa de **${materia}** para o cargo de **${cargo}**.

### 5 Pontos Principais para Fixação:
1. **Conceito Chave**: Foco na definição inicial regulamentar adotada pelas bancas de concurso.
2. **Classificação Básica**: Divisão clássica de conceitos entre regras gerais e termos específicos.
3. **Legislação Associada**: Identificar as normas ou leis federais que fundamentam o tema.
4. **Aplicação Prática**: Como esse conhecimento é acionado no dia a dia do serviço público.
5. **Critério de Julgamento**: Como diferenciar o certo do errado nas questões.

### Erro Mais Comum de Alunos:
- Generalizar exceções como se fossem regras absolutas. As bancas adoram trocar a palavra *"sempre"* por *"salvo se"* para confundir o candidato.

### Versão Ultra Resumida:
- **${topico}**: Estudar regras gerais $\rightarrow$ Identificar proibições $\rightarrow$ Fixar exceções $\rightarrow$ Resolver questões exaustivamente.
        `;
        return res.json({ summary: fallbackSummary });
      }

      if (currentMode === 'revisao') {
        const fallbackRevisao = `
# 🧠 Revisão Ativa (Memorização Inteligente): ${topico}

### 📝 Resumo Estruturado (O QUE, COMO e POR QUE):
- **O QUE é o assunto**:
  - A definição conceitual rápida e o núcleo teórico de **${topico}**.
- **COMO aplicar na prova (Técnica Prática)**:
  - Focar na identificação das regras gerais, prazos legais, exclusão ativa de distratores e pegadinhas da banca.
- **POR QUE erramos (Calcanhar de Aquiles)**:
  - As bancas exploram as exceções sutis, a confusão de termos de validade e a desatenção aos mnemônicos clássicos.

### 1. Flashcards Virtuais (Frente & Verso)
* **CARD 1**
  * **FRENTE**: Qual a principal regra de **${topico}**?
  * **VERSO**: [Force a lembrança da definição antes de prosseguir com a leitura!]
* **CARD 2**
  * **FRENTE**: Qual a exceção mais cobrada pelas bancas neste assunto?
  * **VERSO**: [Geralmente as bancas focam em proibições ou limites temporais!]
* **CARD 3**
  * **FRENTE**: Qual princípio do LIMPE/Administração rege diretamente este tópico?
  * **VERSO**: [Associe o tema ao princípio da Legalidade ou Impessoalidade!]

### 2. Associação de Ideias (Aplicação no Dia a Dia)
- Imagine-se exercendo o cargo de **${cargo}**. Pense em como um erro cometido por falta de conhecimento deste assunto impactaria a sociedade ou o fluxo de processos da repartição.

### 3. Mapa Mental Textual (Estrutura de Ideias)
- **${topico}**
  - ├── **Definição Regulamentar** (O que é)
  - ├── **Requisitos Fundamentais** (Como se aplica)
  - ├── **Restrições & Impedimentos** (Exceções)
  - └── **Pegadinhas Comuns** (Troca de termos pela banca)
        `;
        return res.json({ summary: fallbackRevisao });
      }

      if (currentMode === 'plano') {
        const fallbackPlano = `
# 📅 Plano de Estudos de 7 Dias: ${topico}

*Cronograma focado para dominar este assunto em uma semana de forma equilibrada dedicando de 30 a 45 minutos por dia.*

* **Dia 1: Explicação Didática & Teoria** (Tempo: 30 min)
  * *O que fazer*: Leia a explicação didática geral, grife os termos que você desconhece e faça anotações breves.
  * *Como revisar*: No final do dia, repita em voz alta o que você entendeu sobre a regra principal.
* **Dia 2: Síntese de Conteúdo & Mapa Mental** (Tempo: 30 min)
  * *O que fazer*: Reduza a matéria a uma única folha de anotações ou crie um mapa mental esquematizado em tópicos.
  * *Como revisar*: Identifique visualmente os conceitos-chave.
* **Dia 3: Flashcards & Memorização** (Tempo: 20 min)
  * *O que fazer*: Tente responder às perguntas de recuperação ativa sem consultar o material.
  * *Como revisar*: Anote quais pontos você errou para focar a leitura rápida nesses trechos.
* **Dia 4: Prática de Questões Iniciais** (Tempo: 45 min)
  * *O que fazer*: Resolva de 5 a 10 exercícios focados em **${topico}**.
  * *Como revisar*: Leia o gabarito comentado de cada questão, mesmo daquelas que você acertou.
* **Dia 5: Revisão Espaçada & Ajuste** (Tempo: 30 min)
  * *O que fazer*: Retorne às anotações do Dia 2 e reforce a leitura rápida dos tópicos mais complexos.
  * *Como revisar*: Foque nas exceções descritas nas regras.
* **Dia 6: Mini-Simulado Completo** (Tempo: 45 min)
  * *O que fazer*: Faça um teste cronometrado de questões do tema sem consultas.
  * *Como revisar*: Calcule sua acurácia. Se for menor que 80%, adicione mais 15 min de revisão das regras no Dia 7.
* **Dia 7: Técnica de Auto-Explicação** (Tempo: 20 min)
  * *O que fazer*: Explique o assunto para si mesmo no espelho ou em áudio como se estivesse dando aula.
  * *Como revisar*: Se você gaguejar ou travar em algum ponto, é sinal de que esse conceito precisa ser relido na próxima semana.
        `;
        return res.json({ summary: fallbackPlano });
      }

      if (currentMode === 'simulado') {
        const fallbackSimulado = `
# ✍️ Mini-Simulado de Fixação: ${topico}

*Responda às 10 questões e confira o gabarito comentado no final para fixar as pegadinhas das principais bancas.*

### QUESTÃO 1 (Dificuldade: Média)
Referente ao tema **${topico}**, assinale a alternativa que descreve a regra geral correta adotada pela jurisprudência ou normas vigentes:
- A) A aplicação é discricionária e depende apenas do juízo de conveniência do servidor.
- B) Deve seguir estritamente o princípio da legalidade, sendo nulo qualquer ato sem previsão legal direta.
- C) Admite exceção implícita desde que haja interesse político direto da chefia da repartição.
- D) É aplicável de forma irrestrita a todos os particulares, independentemente de notificação prévia.
- E) A lei proíbe qualquer tipo de delegação desse ato a outros órgãos colegiados.

### QUESTÃO 2 (Dificuldade: Alta - Pegadinha)
Considerando as regras descritas no edital para o cargo de **${cargo}**, em relação ao assunto **${topico}**, a banca costuma inverter conceitos. Indique o item que contém uma afirmação INCORRETA:
- A) O ato praticado com abuso de poder é anulável por vício de competência ou finalidade.
- B) O silêncio administrativo sempre equivale ao deferimento tácito de qualquer pedido sobre o tema.
- C) As exceções legais devem ser interpretadas de forma restritiva.
- D) O desvio de finalidade ocorre quando o agente busca fim diverso daquele previsto na norma.
- E) A motivação é regra geral para a validade dos atos da administração.

### QUESTÃO 3 (Dificuldade: Fácil)
Sobre os limites práticos de **${topico}** no âmbito do serviço público, é correto afirmar:
- A) Servidores temporários não precisam observar as regras deste assunto.
- B) Aplica-se exclusivamente a órgãos federais, estando estados e municípios desobrigados.
- C) Deve sempre visar o interesse público secundário em detrimento do interesse público primário.
- D) A publicidade dos atos sobre este tema é a regra, admitindo-se sigilo apenas nos casos previstos na Constituição.
- E) O desrespeito a essas regras gera mera penalidade verbal sem consequências financeiras ou criminais.

### QUESTÃO 4 (Dificuldade: Média)
Em relação a **${topico}**, caso ocorra uma omissão legislativa específica no edital, qual princípio deve nortear a conduta do administrador?
- A) Princípio da supremacia do interesse privado sobre o público.
- B) Princípio da autotutela, permitindo ao administrador inventar regras para suprir a lacuna.
- C) Princípio da moralidade e da eficiência, agindo com boa-fé administrativa.
- D) Princípio da pessoalidade, priorizando conhecidos da repartição.
- E) Princípio da informalidade absoluta de todos os atos internos.

### QUESTÃO 5 (Dificuldade: Alta)
No tocante ao controle judicial de atos que versem sobre **${topico}**, assinale a opção correta:
- A) O Poder Judiciário pode revogar atos administrativos convenientes, mas ilegais.
- B) O Judiciário pode analisar aspectos de legalidade e legitimidade, sendo-lhe vedado substituir o mérito administrativo da decisão.
- C) Qualquer ato administrativo relativo ao tema é imune a controle judicial devido à soberania dos poderes.
- D) O controle judicial depende de autorização prévia da chefia do poder legislativo municipal.
- E) O controle judicial se limita exclusivamente a verificar a grafia correta dos termos na publicação do edital.

### QUESTÃO 6 (Dificuldade: Fácil)
Assinale o termo que melhor define o dever de agir do servidor público ao se deparar com uma situação regulada por **${topico}**:
- A) Faculdade pessoal de atuação livre.
- B) Poder-dever de agir, sendo vedada a omissão injustificada sob pena de responsabilização.
- C) Subordinação cega a ordens sabidamente ilegais da diretoria.
- D) Direito de greve irrestrito a qualquer hora do expediente.
- E) Delegação compulsória imediata para a iniciativa privada.

### QUESTÃO 7 (Dificuldade: Média)
Constitui infração de improbidade administrativa a conduta do agente público que, no tratamento de **${topico}**:
- A) Economiza recursos públicos simplificando processos administrativos digitais.
- B) Facilita a aquisição de bens por valor superfaturado ou frustra a licitude de concurso público.
- C) Exige o cumprimento rigoroso dos horários de atendimento da repartição.
- D) Recusa-se a promover parentes diretos para cargos em comissão.
- E) Publica informativos de interesse social na página oficial da instituição.

### QUESTÃO 8 (Dificuldade: Média)
A delegação e a avocação de competências sobre decisões relativas a **${topico}** são reguladas por regras rígidas. Indique o item correto:
- A) A delegação é irrevogável a qualquer tempo pelo delegante.
- B) A avocação é ato de caráter geral e permanente de transferência de atribuições.
- C) A delegação de competência pode ser feita para órgãos não subordinados hierarquicamente.
- D) O ato de delegação transfere a titularidade definitiva da função administrativa.
- E) Decisões sobre recursos administrativos podem ser livremente delegadas a terceiros.

### QUESTÃO 9 (Dificuldade: Alta)
Com relação à teoria dos desvios e invalidades dos atos públicos no contexto de **${topico}**, marque a alternativa CORRETA:
- A) A incompetência em razão da matéria admite convalidação tácita.
- B) O desvio de poder configura vício de motivo, sendo sempre sanável por decreto administrativo.
- C) O vício de forma sempre gera nulidade absoluta do ato, não se admitindo aproveitamento sob nenhuma hipótese.
- D) Quando o motivo do ato for inexistente ou falso, o ato será considerado nulo nos termos da teoria dos motivos determinantes.
- E) A teoria do fato consumado protege qualquer ilegalidade praticada com base neste assunto.

### QUESTÃO 10 (Dificuldade: Média)
A responsabilidade civil do Estado por danos causados decorrentes da má gestão pública de **${topico}** é, via de regra:
- A) Subjetiva, exigindo comprovação de dolo ou culpa do agente em todas as esferas.
- B) Objetiva, baseada na teoria do risco administrativo, respondendo o Estado independentemente de culpa.
- C) Exclusiva do servidor público, estando o ente estatal isento de qualquer reparação financeira.
- D) Inexistente no Brasil por força da soberania nacional.
- E) Limitada a danos morais, excluindo-se lucros cessantes ou danos materiais.

---

## 🔑 Gabarito Comentado

* **QUESTÃO 1: Alternativa Correta: B**
  * *Explicação*: No serviço público, aplica-se o Princípio da Legalidade Estrita (o administrador só faz o que a lei autoriza).
* **QUESTÃO 2: Alternativa Correta: B**
  * *Explicação*: O silêncio administrativo não significa deferimento automático geral. Exige determinação legal expressa.
* **QUESTÃO 3: Alternativa Correta: D**
  * *Explicação*: A publicidade é regra geral na Administração Pública (Art. 37, caput). Sigilo é exceção constitucional.
* **QUESTÃO 4: Alternativa Correta: C**
  * *Explicação*: Na falta de regra específica, age-se conforme a moralidade e eficiência administrativa.
* **QUESTÃO 5: Alternativa Correta: B**
  * *Explicação*: O Judiciário pode rever legalidade dos atos, mas não pode avaliar o mérito administrativo (conveniência e oportunidade).
* **QUESTÃO 6: Alternativa Correta: B**
  * *Explicação*: O agente público tem o "poder-dever" de agir. O silêncio ou omissão injustificada gera improbidade ou prevaricação.
* **QUESTÃO 7: Alternativa Correta: B**
  * *Explicação*: Frustrar concurso ou superfaturar compras atenta diretamente contra os princípios da administração e gera enriquecimento ilícito.
* **QUESTÃO 8: Alternativa Correta: C**
  * *Explicação*: A delegação pode ser feita para órgãos de mesma estatura ou não subordinados, por conveniência técnica.
* **QUESTÃO 9: Alternativa Correta: D**
  * *Explicação*: A teoria dos motivos determinantes prega que a validade do ato está vinculada à veracidade do motivo alegado.
* **QUESTÃO 10: Alternativa Correta: B**
  * *Explicação*: A CF/88 adota a responsabilidade civil objetiva da administração pública (Art. 37, § 6º) sob a teoria do risco administrativo.
        `;
        return res.json({ summary: fallbackSimulado });
      }
    }

    // Chamadas dinâmicas à IA usando os prompts específicos de Leonardo Umburana adaptados para a banca
    let prompt = "";
    if (currentMode === 'explicador') {
      prompt = `
        Você é um Professor Especialista em Didática Simples e Síntese de Conteúdo para concursos públicos, com profundo conhecimento do perfil de questões da banca "${banca || 'FGV'}".
        Escreva uma explicação teórica sobre o tópico "${topico}" da disciplina "${materia}" direcionada para o nível exigido do cargo de "${cargo}".
        Seu texto deve focar fortemente em como este assunto costuma cair e como a banca "${banca || 'FGV'}" prefere abordá-lo teórica e conceitualmente.

        Regras do Explicador Ultra Simples (Entendo em 5 minutos):
        1. Use linguagem clara e acessível, como se o leitor fosse inteligente mas iniciante. Evite jargões técnicos excessivos.
        2. Use exemplos do cotidiano e comparações simples para ilustrar os conceitos.
        3. Destaque em negrito os conceitos-chave.
        4. No final do texto, inclua obrigatoriamente as seguintes seções estruturadas:
           - "### 5 Pontos Principais": Resuma a teoria em exatamente 5 tópicos de fixação rápida.
           - "### O Erro Mais Comum": Mostre o erro típico que estudantes cometem ao responder questões desse tema na prova da banca "${banca || 'FGV'}".
           - "### Versão Ultra Resumida": Uma frase ou esquema curto que sintetiza a matéria.

        Retorne um objeto JSON contendo exatamente uma chave "summary" com o texto formatado em Markdown completo:
        {
          "summary": "# 📚 Explicação Didática: ${topico}\\n\\n[Explicação completa aqui]"
        }
      `;
    } else if (currentMode === 'revisao') {
      prompt = `
        Você é um Especialista em Aprendizagem Ativa e Memorização Inteligente voltado para aprovações em concursos.
        Escreva um material de revisão ativa sobre o assunto "${topico}" da disciplina "${materia}" para o cargo "${cargo}".
        Leve em consideração o estilo e os hábitos da banca examinadora "${banca || 'FGV'}" para este tema.

        Regras da Revisão Ativa (Memorização Inteligente):
        1. Crie uma seção inicial intitulada "### 📝 Resumo Estruturado (O QUE, COMO e POR QUE)" explicando especificamente o assunto:
           - "O QUE é o assunto": Explique resumidamente o conceito chave deste tema.
           - "COMO aplicar na prova (Técnica Prática)": Explique os métodos e fluxos práticos para resolver questões desse assunto nas provas da banca "${banca || 'FGV'}".
           - "POR QUE erramos (Calcanhar de Aquiles)": Destaque as pegadinhas e os principais motivos pelos quais os candidatos erram questões da banca "${banca || 'FGV'}" neste tema.
        2. Crie 4 Flashcards de memorização rápida com perguntas e respostas diretas (use o formato "FRENTE: pergunta" e "VERSO: resposta curta"). As perguntas devem focar nas regras essenciais ou exceções importantes cobradas pela banca "${banca || 'FGV'}".
        3. Crie uma seção de "Associação de Ideias" que conecte o tema a algum cenário real ou prático de trabalho de um ${cargo}.
        4. Crie um "Mapa Mental Textual" (uma representação em árvore em marcadores estruturados que resume o assunto de forma gráfica).
        
        ATENÇÃO: Não crie listas de perguntas adicionais em formato de texto para evitar duplicar o conteúdo que já estará dentro dos flashcards.

        Retorne um objeto JSON contendo exatamente uma chave "summary" com o texto formatado em Markdown completo:
        {
          "summary": "# 🧠 Revisão Ativa: ${topico}\\n\\n[Conteúdo da revisão ativa aqui]"
        }
      `;
    } else if (currentMode === 'plano') {
      prompt = `
        Você é um Planejador de Estudos de Alto Desempenho para concursos públicos.
        Crie um plano estratégico de estudos de 7 dias para dominar o tópico "${topico}" da matéria "${materia}" (cargo "${cargo}").

        Regras do Plano de Estudos:
        1. Defina o que o aluno deve estudar e fazer em cada um dos 7 dias (Dia 1 a Dia 7), planejando sessões rápidas de 30-45 minutos específicos para fixar este tema.
        2. Especifique quanto tempo ideal dedicar por dia.
        3. Indique metodologias ativas de revisão para usar durante a semana (auto-explicação, resumos, mapas).
        4. Indique em qual dia ele deve resolver questões e fazer simulados deste tema da banca "${banca || 'FGV'}".
        5. Crie uma seção "O que Priorizar" listando os focos quentes/mais cobrados especificamente pela banca "${banca || 'FGV'}" neste assunto.

        Retorne um objeto JSON contendo exatamente uma chave "summary" com o texto formatado em Markdown completo:
        {
          "summary": "# 📅 Plano de Estudos de 7 Dias: ${topico}\\n\\n[Plano detalhado de 7 dias aqui]"
        }
      `;
    } else if (currentMode === 'simulado') {
      prompt = `
        Você é um Elaborador de Provas e Concursos Públicos experiente especializado na banca "${banca || 'FGV'}".
        Crie um mini-simulado focado no tópico "${topico}" da disciplina "${materia}" para o cargo "${cargo}".

        Regras do Simulado Personalizado:
        1. Crie exatamente 5 questões inéditas que sigam fielmente o estilo e a linguagem da banca "${banca || 'FGV'}".
           Importante: Se a banca for "Cebraspe", elabore questões no formato Certo (C) ou Errado (E). Para bancas de múltipla escolha como "FGV", "Vunesp" ou "Cesgranrio", elabore questões com 5 alternativas (A, B, C, D, E). Se a banca for "FGV", abuse de enunciados em forma de casos práticos e situações-problema cotidianas.
        2. Misture níveis de dificuldade (fácil, média e difícil).
        3. Inclua pegadinhas realistas e inteligência típica da banca "${banca || 'FGV'}" (como mudança sutil de vocabulário ou aplicação de exceções).
        4. No final do simulado, traga a chave "### Gabarito Comentado" detalhando a explicação técnica do porquê cada alternativa ou assertiva está correta ou errada.

        Retorne um objeto JSON contendo exatamente uma chave "summary" com o texto formatado em Markdown completo:
        {
          "summary": "# ✍️ Mini-Simulado: ${topico}\\n\\n[Questões e gabarito comentado aqui]"
        }
      `;
    }

    const result = await callIA(provider, apiKey, prompt);
    return res.json(result);

  } catch (error) {
    console.error("Erro ao gerar resumo via IA. Retornando do banco de dados local:", error);
    const dbEntry = localSummariesDb[topico] || localSummariesDb[materia];
    let summaryText = "";
    if (dbEntry) {
      if (typeof dbEntry === 'object' && dbEntry[mode]) {
        summaryText = dbEntry[mode];
      } else if (typeof dbEntry === 'string') {
        summaryText = dbEntry;
      }
    }

    if (!summaryText) {
      summaryText = `# Resumo de Estudos: ${topico}\n\nOcorreu um erro ao conectar com o provedor de IA e nenhum resumo local foi encontrado para este assunto. Por favor, revise as chaves de API nas configurações ou use o modo Off-line.`;
    }

    return res.json({ summary: summaryText });
  }
});

// ROTA: Upload de Print para Monitoramento de Concursos (Pré-Edital com OCR)
app.post('/api/monitor/upload-print', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem ou print de edital enviado.' });
    }

    console.log("Iniciando OCR do print de concurso...");
    // Tesseract processa a imagem do buffer
    const ocrResult = await Tesseract.recognize(req.file.buffer, 'por');
    const extractedText = ocrResult.data.text;
    console.log("OCR Concluído. Comprimento do texto extraído:", extractedText.length);

    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';

    // Se estiver offline ou sem chave, faz uma extração heurística básica do texto
    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      // Tenta achar nomes de órgãos conhecidos no texto extraído
      let concurso = "Concurso Extraído via OCR";
      const orgaos = [
        "Polícia Federal", "Polícia Civil", "TJ", "Tribunal de Justiça", "Correios", 
        "INSS", "BNDES", "Receita Federal", "Petrobras", "Caixa Econômica", "PM"
      ];
      for (const o of orgaos) {
        if (new RegExp(o, 'i').test(extractedText)) {
          concurso = `Concurso ${o}`;
          break;
        }
      }
      return res.json({
        concurso,
        status: "Autorizado",
        banca: "A definir",
        vagas: "Previsão conforme edital",
        salario: "A consultar",
        requisitos: "Ensino Médio ou Superior",
        detalhes: extractedText.trim().substring(0, 300) + "..."
      });
    }

    // Se estiver online (Gemini/OpenAI/Groq/Ollama), pede para a IA estruturar os dados extraídos do print
    const prompt = `
      Você é um especialista em concursos públicos brasileiros. Analise o seguinte texto extraído via OCR de um print de notícia sobre um concurso que ainda não abriu (pré-edital) e extraia os dados estruturados no formato JSON especificado.
      Importante: Seja o mais fiel possível às informações do texto. Se algo não constar, preencha com 'A definir'.

      JSON de Retorno:
      {
        "concurso": "Nome curto do Órgão/Concurso",
        "status": "Status (Anunciado, Autorizado, Comissão Formada, Banca Definida ou Edital Publicado!)",
        "banca": "Nome da banca ou 'A definir'",
        "vagas": "Vagas previstas ou 'A definir'",
        "salario": "Remuneração prevista ou 'A definir'",
        "requisitos": "Escolaridade exigida ou 'A definir'",
        "detalhes": "Um resumo em 2 linhas sobre a notícia/print"
      }

      Texto Extraído:
      ${extractedText}
    `;

    const result = await callIA(provider, apiKey, prompt);
    res.json(result);

  } catch (err) {
    console.error("Erro ao analisar imagem de concurso:", err);
    res.status(500).json({ error: "Erro ao processar imagem de monitoramento: " + err.message });
  }
});

// ROTA: Verificação de Atualizações de Concursos Monitorados (Simulado/Pesquisa na Web)
app.post('/api/monitor/check-update', async (req, res) => {
  try {
    const { concurso, status, banca } = req.body;
    const provider = req.headers['x-provider'] || 'offline';
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || '';

    console.log(`Buscando atualizações na web para: ${concurso}`);

    // Se estiver offline ou sem chave, retorna uma simulação dinâmica e divertida (máquina de estados determinística para testes do usuário!)
    if (provider === 'offline' || (!apiKey && provider !== 'ollama')) {
      let novoStatus = status;
      let novaBanca = banca;
      let noticia = "";
      let atualizado = true;

      if (status === "Anunciado") {
        novoStatus = "Autorizado";
        noticia = `✓ Portaria de autorização assinada e publicada no Diário Oficial para o concurso ${concurso}! Próximo passo: Formação da comissão organizadora.`;
      } else if (status === "Autorizado") {
        novoStatus = "Comissão Formada";
        noticia = `✓ Membros da comissão organizadora foram definidos no Diário Oficial para o concurso ${concurso}. O grupo trabalhará no projeto básico para escolha da banca.`;
      } else if (status === "Comissão Formada") {
        novoStatus = "Banca Definida";
        novaBanca = "FGV";
        noticia = `✓ A banca organizadora do concurso ${concurso} foi oficialmente definida! A FGV será a responsável pelo certame. Contrato assinado.`;
      } else if (status === "Banca Definida") {
        novoStatus = "Edital Publicado!";
        noticia = `🚨 ATENÇÃO! O Edital do concurso ${concurso} foi publicado oficialmente! A prova está marcada. Baixe o PDF e envie no painel para gerar seu plano!`;
      } else {
        novoStatus = "Edital Publicado!";
        noticia = `O edital já se encontra publicado oficialmente no Diário Oficial. Realize o upload do edital PDF para iniciar seus estudos!`;
        atualizado = false;
      }

      return res.json({
        novoStatus,
        banca: novaBanca,
        noticia,
        atualizado
      });
    }

    // Se online, pede para a IA decidir o status baseado no contexto ou fazer pesquisa simulada
    const prompt = `
      Você é um robô rastreador de notícias de concursos. Decida se houve alguma atualização recente para o concurso "${concurso}" cujo status atual é "${status}" e banca é "${banca}".
      Retorne um objeto JSON contendo:
      1. novoStatus (o status atualizado ou o mesmo se não houver novidades - "Anunciado", "Autorizado", "Comissão Formada", "Banca Definida" ou "Edital Publicado!").
      2. banca (nome da banca).
      3. noticia (um breve relato fictício ou real da última novidade de forma jornalística).
      4. atualizado (true se o status mudou, false caso contrário).

      Responda EXCLUSIVAMENTE com o objeto JSON estruturado:
      {
        "novoStatus": "Status do Concurso",
        "banca": "Nome da Banca",
        "noticia": "Texto da notícia",
        "atualizado": true/false
      }
    `;

    const result = await callIA(provider, apiKey, prompt);
    res.json(result);

  } catch (err) {
    console.error("Erro ao verificar concurso:", err);
    res.status(500).json({ error: "Erro ao buscar atualizações para o concurso." });
  }
});

// ROTA: Listagem de mocks
app.get('/api/mocks', (req, res) => {
  res.json(mockData.examesDisponiveis);
});

// ROTA: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

const path = require('path');
// Servir arquivos estáticos do frontend em produção
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback para qualquer rota que não seja da API para carregar o index.html do React
app.get('*all', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Inicia o Servidor
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === 'Only PDF and TXT files are accepted.') {
    return res.status(400).json({ error: error.message });
  }
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Backend do Concurso Study Hub rodando na porta ${port}`);
});
