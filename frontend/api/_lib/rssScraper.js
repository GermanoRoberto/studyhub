// Scraper automático de notícias e novidades de concursos em tempo real (100% gratuito e sem chave de API)
// Fontes: Feeds RSS oficiais de portais públicos de concursos (Gran Cursos, PCI Concursos, etc.)

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .trim();
}

function classifyArea(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (/\b(militar|exército|marinha|aeronáutica|espcex|ita|ime|eear|cfs|pm|polícia militar|bombeiro|cbm)\b/.test(text)) {
    return 'Militar';
  }
  if (/\b(ti|tecnologia|desenvolvedor|sistemas|programador|dados|segurança da informação|computação)\b/.test(text)) {
    return 'TI';
  }
  if (/\b(polícia civil|pc|polícia federal|pf|prf|polícia penal|depen|perícia|delegado|agente policial)\b/.test(text)) {
    return 'Policial';
  }
  if (/\b(receita federal|sefaz|iss|fiscal|tributário|auditor fiscal)\b/.test(text)) {
    return 'Fiscal';
  }
  if (/\b(tribunal|tj|trt|tre|trf|stj|stf|mpsp|mpf|defensoria|dpu|judiciário)\b/.test(text)) {
    return 'Tribunais';
  }
  if (/\b(banco|caixa|bb|bndes|bacen|bancária|banrisul)\b/.test(text)) {
    return 'Bancária';
  }
  if (/\b(tcu|tce|cgu|controle|cgm)\b/.test(text)) {
    return 'Controle';
  }
  if (/\b(professor|educação|sme|seed|universidade|instituto federal|docente|pedagogo)\b/.test(text)) {
    return 'Educação';
  }
  if (/\b(saúde|médico|enfermagem|sus|ebserh|anvisa|farmacêutico|psicólogo)\b/.test(text)) {
    return 'Saúde';
  }
  return 'Administrativa';
}

function detectStatus(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('inscrições abertas') || text.includes('inscrições prorrogadas') || text.includes('inscreva-se')) {
    return 'Inscrições Abertas';
  }
  if (text.includes('edital publicado') || text.includes('edital lançado') || text.includes('saiu o edital') || text.includes('edital na praça')) {
    return 'Edital Publicado';
  }
  if (text.includes('banca definida') || text.includes('banca escolhida') || text.includes('banca contratada') || text.includes('cebraspe') || text.includes('fgv') || text.includes('vunesp')) {
    return 'Banca Definida';
  }
  if (text.includes('comissão formada') || text.includes('comissão constituída')) {
    return 'Comissão Formada';
  }
  if (text.includes('autorizado') || text.includes('autorização')) {
    return 'Autorizado';
  }
  if (text.includes('gabarito') || text.includes('resultado') || text.includes('homologado') || text.includes('prova realizada')) {
    return 'Encerrado';
  }
  return 'Previsto 2026/2027';
}

function detectTaf(title, description, area) {
  const text = `${title} ${description}`.toLowerCase();
  if (area === 'Militar' || area === 'Policial') {
    if (text.includes('barra') || text.includes('soldado') || text.includes('oficial') || text.includes('cadete') || text.includes('agente') || text.includes('escrivão')) {
      return {
        tipo: 'com_barra',
        descricao: 'Exige Teste Físico (TAF) com Barra Fixa e Corrida'
      };
    }
    return {
      tipo: 'sem_barra',
      descricao: 'Exige Teste Físico (TAF) sem Barra Fixa (Corrida/Natação/Abdominal)'
    };
  }
  return {
    tipo: 'nenhum',
    descricao: 'Não exige teste físico (TAF apenas para carreiras de segurança)'
  };
}

let cachedLiveUpdates = null;
let lastFetchTime = 0;

export async function fetchLiveConcursosFromRss() {
  const now = Date.now();
  // Cache por 15 minutos para performance máxima
  if (cachedLiveUpdates && (now - lastFetchTime) < 15 * 60 * 1000) {
    return cachedLiveUpdates;
  }

  const results = [];
  try {
    const response = await fetch('https://blog.grancursosonline.com.br/feed/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StudyHub/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(6000) // Timeout de 6s
    });

    if (response.ok) {
      const xml = await response.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const item of items) {
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);

        const rawTitle = titleMatch ? cleanText(titleMatch[1]) : '';
        const rawDesc = descMatch ? cleanText(descMatch[1]) : '';
        const link = linkMatch ? cleanText(linkMatch[1]) : '';
        const pubDateStr = pubDateMatch ? cleanText(pubDateMatch[1]) : '';

        // 1. Ignora notícias que não sejam sobre concursos públicos
        if (!rawTitle.toLowerCase().includes('concurso') && !rawTitle.toLowerCase().includes('edital') && !rawTitle.toLowerCase().includes('processo seletivo')) {
          continue;
        }

        // 2. Descarta matérias genéricas de blog, compilações, guias, dicas ou roundups
        const isGenericBlogRoundup = 
          /(?:confira|guia|panorama|lista|centenas de vagas|dicas|o que esperar|veja os editais|resumo dos concursos|concursos abertos e previstos|o que estudar|como passar|prepara[cç][aã]o|concursos?\s+prefeituras\s*\d{4})/i.test(rawTitle) ||
          /^(?:concursos?\s+(?:em\s+)?\d{4}|concursos?\s+prefeituras|editais?\s+previstos?)/i.test(rawTitle.trim());

        if (isGenericBlogRoundup) {
          continue;
        }

        const status = detectStatus(rawTitle, rawDesc);
        // Descarta concursos que já tiveram prova ou encerraram
        if (status === 'Encerrado') {
          continue;
        }

        // Extrai o nome do órgão com precisão
        let cleanOrgao = rawTitle
          .replace(/^(?:concurso|edital|processo seletivo)\s*(?:p[uú]blico)?\s*(?:da|do|de|para)?\s*/i, '')
          .split(/[\:\-\–\|]/)[0]
          .trim();

        // Se o órgão for genérico ou truncado (ex: "s Prefeituras"), rejeita
        if (!cleanOrgao || cleanOrgao.length < 4 || /^(?:prefeituras?|v[aá]rias|diversos?|nacional|brasil|vagas)$/i.test(cleanOrgao)) {
          continue;
        }

        // Se o título começar com letra minúscula solta (ex: "s Prefeituras"), ignora
        if (/^[a-z]\s+/i.test(cleanOrgao)) {
          continue;
        }

        const area = classifyArea(rawTitle, rawDesc);
        const taf = detectTaf(rawTitle, rawDesc, area);

        // Gera id único baseado no título
        const slug = cleanOrgao.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40);

        // Extrai o cargo ou usa denominação padrão
        let cleanCargo = 'Diversos Cargos (Conforme Edital)';
        const titleParts = rawTitle.split(/[\:\-\–\|]/);
        if (titleParts.length > 1) {
          cleanCargo = titleParts.slice(1).join(' - ').trim();
        }

        results.push({
          id: `rss_${slug}`,
          orgao: cleanOrgao,
          area,
          cargo: cleanCargo,
          status,
          banca: 'Consulte no Edital',
          vagas: 'Consulte no Edital',
          remuneracao: 'A Consultar no Edital',
          escolaridade: area === 'TI' ? 'Superior em TI / Qualquer Área' : 'Médio / Superior',
          taf_tipo: taf.tipo,
          taf_descricao: taf.descricao,
          idade_maxima: (area === 'Militar' && rawTitle.toLowerCase().includes('soldado')) ? 30 : null,
          data_publicacao: pubDateStr,
          link_oficial: link,
          detalhes: rawDesc.substring(0, 160) + '...',
          is_live_rss: true,
          termometro: status === 'Inscrições Abertas' || status === 'Edital Publicado' ? 'quente' : 'morno'
        });
      }
    }
  } catch (err) {
    console.warn('Falha temporária ao coletar RSS ao vivo:', err.message);
  }

  cachedLiveUpdates = results;
  lastFetchTime = now;
  return results;
}
