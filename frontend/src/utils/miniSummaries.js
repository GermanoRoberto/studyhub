// Dicionário inteligente e gerador contextual de mini-resumos (máx. 2 linhas) para tópicos de editais de concurso

const KNOWLEDGE_BASE = [
  // LÍNGUA PORTUGUESA
  {
    regex: /interpreta[cç][aã]o|compreens[aã]o\s+de\s+texto|tipologia\s+textual/i,
    summary: 'Compreensão de ideias centrais, inferência de sentidos, tipologia textual e mecanismos de coesão.'
  },
  {
    regex: /sintaxe|termos\s+da\s+ora[cç][aã]o|per[ií]odo\s+composto/i,
    summary: 'Análise da oração (sujeito, predicado, complementos), coordenação e subordinação de períodos.'
  },
  {
    regex: /crase/i,
    summary: "Fusão da preposição 'a' com artigo/pronome; casos obrigatórios, facultativos e proibições clássicas."
  },
  {
    regex: /pontua[cç][aã]o|v[ií]rgula/i,
    summary: 'Emprego correto da vírgula entre orações e termos, ponto e vírgula, dois-pontos e efeitos de sentido.'
  },
  {
    regex: /ortografia|acentua[cç][aã]o/i,
    summary: 'Novo acordo ortográfico, regras de acentuação gráfica (oxítonas, paroxítonas) e grafia correta.'
  },
  {
    regex: /concord[aâ]ncia/i,
    summary: 'Harmonia entre sujeito e verbo, regras para coletivos, partitivos e concordância nominal de adjetivos.'
  },
  {
    regex: /reg[eê]ncia/i,
    summary: 'Relação de dependência com preposições, verbos transitivos de alta incidência e regência nominal.'
  },
  {
    regex: /coes[aã]o|coer[eê]ncia/i,
    summary: 'Mecanismos de referência anafórica/catafórica, conectivos argumentativos e clareza textual.'
  },
  {
    regex: /morfologia|classes\s+de\s+palavras/i,
    summary: 'Identificação e função de substantivos, pronomes, verbos, conjunções e advérbios em contexto.'
  },
  {
    regex: /reda[cç][aã]o\s+oficial/i,
    summary: 'Padrão ofício, concisão, formalidade e regras do Manual de Redação da Presidência da República.'
  },
  {
    regex: /sem[aâ]ntica|significa[cç][aã]o|figuras\s+de\s+linguagem/i,
    summary: 'Sinonímia, antonímia, sentido próprio e figurado (conotação/denotação) e figuras de estilo.'
  },

  // DIREITO CONSTITUCIONAL
  {
    regex: /art(?:igo)?\.?\s*5|direitos?\s*(?:e\s*deveres?)?\s*fundamentais?|individuais/i,
    summary: 'Garantias individuais, inviolabilidade de domicílio, presunção de inocência e remédios constitucionais.'
  },
  {
    regex: /administra[cç][aã]o\s+p[uú]blica|arts?\.?\s*37\s*a\s*41/i,
    summary: 'Princípios do LIMPE, regras de concurso, investidura, acumulação de cargos e estabilidade do servidor.'
  },
  {
    regex: /organiza[cç][aã]o\s+dos?\s+poderes?|executivo|legislativo|judici[aá]rio/i,
    summary: 'Funções típicas e atípicas dos poderes, processo legislativo e mecanismo de freios e contrapesos.'
  },
  {
    regex: /direitos?\s+sociais?|nacionalidade/i,
    summary: 'Direitos dos trabalhadores, garantias sindicais, critérios de nacionalidade e direitos políticos.'
  },
  {
    regex: /seguridade\s+social|arts?\.?\s*194\s*a\s*204/i,
    summary: 'Saúde, previdência e assistência social; princípios de universalidade e fontes de financiamento.'
  },

  // DIREITO ADMINISTRATIVO
  {
    regex: /atos?\s+administrativos?/i,
    summary: 'Requisitos de validade (competência, finalidade, forma, motivo, objeto), atributos e revogação.'
  },
  {
    regex: /licita[cç][oõ]es?|lei\s*14\.?133|lei\s*8\.?666/i,
    summary: 'Modalidades licitatórias, dispensa, inexigibilidade, critérios de julgamento e fases do certame.'
  },
  {
    regex: /servidores?\s+p[uú]blicos?|regime\s+jur[ií]dico|lei\s*8\.?112/i,
    summary: 'Provimento, vacância, direitos, deveres, vedações, regime disciplinar e processo administrativo.'
  },
  {
    regex: /poderes?\s+administrativos?|poder\s+de\s+pol[ií]cia/i,
    summary: 'Poder de polícia, discricionariedade, poder hierárquico, disciplinar e controle contra abusos.'
  },
  {
    regex: /responsabilidade\s+civil\s+do\s+estado/i,
    summary: 'Teoria do risco administrativo, responsabilidade objetiva do Estado e direito de regresso.'
  },
  {
    regex: /princ[ií]pios?\s+administrativos?/i,
    summary: 'Princípios expressos (LIMPE) e princípios implícitos como razoabilidade, proporcionalidade e autotutela.'
  },

  // ÉTICA
  {
    regex: /[eé]tica|decreto\s*1\.?171/i,
    summary: 'Código de Ética Profissional do Servidor Público Federal, deveres, vedações e comissões de ética.'
  },

  // RACIOCÍNIO LÓGICO & MATEMÁTICA
  {
    regex: /l[oó]gica\s+proposicional|tabela[\s-]verdade|proposi[cç][oõ]es/i,
    summary: 'Conectivos lógicos (e, ou, se...então), tabelas-verdade, negações e equivalências proposicionais.'
  },
  {
    regex: /porcentagem|juros/i,
    summary: 'Acréscimos e descontos sucessivos, cálculos de juros simples e compostos aplicados a questões.'
  },
  {
    regex: /probabilidade|estat[ií]stica/i,
    summary: 'Cálculo de chances em espaço amostral, probabilidade condicional, média, mediana e desvio padrão.'
  },
  {
    regex: /an[aá]lise\s+combinat[oó]ria|contagem|permuta[cç][aã]o/i,
    summary: 'Princípio multiplicativo da contagem, permutações, arranjos e combinações sem repetição.'
  },
  {
    regex: /conjuntos?|diagramas?\s+de\s+venn/i,
    summary: 'Operações de união, interseção e diferença; resolução de problemas de raciocínio com diagramas.'
  },

  // INFORMÁTICA & TI
  {
    regex: /seguran[cç]a\s+da\s+informa[cç][aã]o|malware|v[ií]rus/i,
    summary: 'Princípios de confidencialidade e integridade, tipos de malware, phishing e boas práticas defensivas.'
  },
  {
    regex: /redes?\s+de\s+computadores?|tcp[\/-]ip|protocolos/i,
    summary: 'Arquitetura TCP/IP, portas, protocolos (HTTP, DNS, DHCP), roteamento e modelo cliente-servidor.'
  },
  {
    regex: /bancos?\s+de\s+dados?|sql/i,
    summary: 'Modelagem relacional, comandos DML/DDL (SELECT, INSERT, UPDATE, JOIN) e integridade referencial.'
  },
  {
    regex: /excel|planilhas?/i,
    summary: 'Fórmulas essenciais (PROCV, SE, SOMA, CONT.SE), formatação condicional e gráficos de análise.'
  },
  {
    regex: /engenharia\s+de\s+software|metodologias?\s+[aá]geis?|scrum/i,
    summary: 'Ciclos de vida de software, papéis do Scrum (PO, Master), sprints e engenharia de requisitos.'
  },

  // CONHECIMENTOS BANCÁRIOS
  {
    regex: /sistema\s+financeiro\s+nacional|sfn|cmn|bacen/i,
    summary: 'Estrutura normativa do CMN, supervisão do BACEN/CVM e instituições operadoras do mercado.'
  },
  {
    regex: /lavagem\s+de\s+dinheiro|lei\s*9\.?613/i,
    summary: 'Fases da lavagem (colocação, ocultação, integração), obrigações de compliance e COAF.'
  },
  {
    regex: /mercado\s+de\s+c[aâ]mbio/i,
    summary: 'Operações de compra e venda de moeda estrangeira, taxas de câmbio e regulamentação cambial.'
  },
  {
    regex: /produtos?\s+banc[aá]rios?|investimentos?/i,
    summary: 'Contas correntes/poupança, cartões, fundos de investimento, CDB, LCI/LCA e previdência privada.'
  },

  // ATENDIMENTO & VENDAS
  {
    regex: /atendimento|t[eé]cnicas\s+de\s+vendas?|marketing/i,
    summary: 'Comunicação assertiva, resolução pacífica de conflitos, foco no cliente e fidelização em serviços.'
  },

  // DIREITO PENAL & PROCESSUAL
  {
    regex: /crimes?\s+contra\s+a\s+administra[cç][aã]o|peculato|corrup[cç][aã]o/i,
    summary: 'Peculato, concussão, corrupção ativa e passiva, prevaricação e crimes praticados por servidor.'
  },
  {
    regex: /teoria\s+do\s+crime|tipicidade|ilicitude|culpabilidade/i,
    summary: 'Fato típico, antijurídico e culpável; dolo e culpa; consumação, tentativa e excludentes legais.'
  },
  {
    regex: /inqu[eé]rito\s+policial|provas?/i,
    summary: 'Características do inquérito (inquisitivo, escrito, sigiloso), prazos legais e colheita de provas.'
  },

  // DIREITO PREVIDENCIÁRIO
  {
    regex: /regime\s+geral|rgps|segurados?/i,
    summary: 'Filiação obrigatória e facultativa ao RGPS, categorias de segurados e classes de dependentes.'
  },
  {
    regex: /benef[ií]cios?\s+previdenci[aá]rios?|aposentadorias?/i,
    summary: 'Aposentadoria programada, auxílio por incapacidade temporária, pensão por morte e carência.'
  }
];

export function getTopicMiniSummary(topic, subjectName = '') {
  if (!topic) return 'Conceitos fundamentais e questões de banca.';

  // Se já for um objeto com resumo personalizado fornecido pelo plano
  if (typeof topic === 'object') {
    if (topic.miniResumo) return topic.miniResumo;
    if (topic.resumo) return topic.resumo.slice(0, 110) + '...';
    if (topic.descricao) return topic.descricao.slice(0, 110) + '...';
  }

  const topicStr = typeof topic === 'string' ? topic : (topic.nome || topic.topico || topic.title || String(topic));
  const fullContext = `${subjectName} ${topicStr}`;

  // Busca na base de conhecimento especializada
  for (const item of KNOWLEDGE_BASE) {
    if (item.regex.test(topicStr) || item.regex.test(fullContext)) {
      return item.summary;
    }
  }

  // Detecção dinâmica de Lei
  const leiMatch = topicStr.match(/lei\s*(?:nº?|n\.)?\s*([\d\.\/]+)/i);
  if (leiMatch) {
    return `Estudo focado na Lei nº ${leiMatch[1]}: dispositivos centrais, obrigações, prazos e penalidades mais cobradas.`;
  }

  // Detecção dinâmica de Artigo
  const artMatch = topicStr.match(/arts?\.?\s*([\d\s,eaoº]+)/i);
  if (artMatch) {
    return `Análise minuciosa dos Artigos ${artMatch[1]}: literalidade do texto legal e entendimentos da jurisprudência.`;
  }

  // Detecção de conceitos/noções
  if (/no[cç][oõ]es|conceitos?|introdu[cç][aã]o|fundamentos?/i.test(topicStr)) {
    return `Fundamentos teóricos, definições elementares e enquadramento prático no contexto de ${subjectName || 'concursos'}.`;
  }

  // Fallback elegante e objetivo de no máximo 2 linhas
  if (subjectName) {
    return `Conceitos essenciais, legislação aplicável e pontos de maior recorrência em ${subjectName}.`;
  }

  return 'Pontos-chave do conteúdo programático, regras aplicáveis e tópicos mais cobrados pela banca.';
}
