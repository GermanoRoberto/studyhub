// Mapeador cirúrgico de disciplinas e cronogramas por cargo específico

export function getSubjectsForCargo(cargoName = '', area = '') {
  const c = cargoName.toLowerCase();
  const a = area.toLowerCase();

  // 1. CARREIRA DE TI / COMPUTAÇÃO / DADOS
  if (c.includes('ti') || c.includes('computa') || c.includes('software') || c.includes('sistemas') || c.includes('redes') || c.includes('dados') || a === 'ti') {
    return [
      {
        nome: 'Língua Portuguesa',
        topicos: [
          'Interpretação e compreensão de textos técnicos',
          'Sintaxe da oração e do período',
          'Crase e pontuação',
          'Coesão e coerência textual'
        ]
      },
      {
        nome: 'Raciocínio Lógico e Matemática',
        topicos: [
          'Lógica proposicional e tabelas-verdade',
          'Análise combinatória e contagem',
          'Probabilidade e noções de estatística descritiva',
          'Álgebra linear básica e matrizes'
        ]
      },
      {
        nome: 'Engenharia de Software e Banco de Dados',
        topicos: [
          'Modelagem relacional e consultas SQL (DDL/DML, JOINs, Índices)',
          'Bancos de dados NoSQL e cache (Redis, MongoDB)',
          'Arquitetura de microsserviços e APIs RESTful',
          'Controle de versão com Git e práticas CI/CD',
          'Metodologias ágeis (Scrum, Kanban)'
        ]
      },
      {
        nome: 'Redes, Nuvem e Segurança da Informação',
        topicos: [
          'Arquitetura TCP/IP, DNS, HTTP/HTTPS e roteamento',
          'Princípios de segurança (CID), criptografia e certificados SSL',
          'Prevenção de ataques (SQL Injection, XSS, DDoS) e OWASP Top 10',
          'Conceitos de nuvem (AWS/Azure/GCP) e contêineres (Docker, Kubernetes)',
          'Lei Geral de Proteção de Dados (LGPD - Lei 13.709/18)'
        ]
      }
    ];
  }

  // 2. CARREIRA FISCAL / TRIBUTÁRIA / AUDITORIA
  if (c.includes('fiscal') || c.includes('tribut') || c.includes('auditor') || c.includes('receita') || a === 'fiscal') {
    return [
      {
        nome: 'Língua Portuguesa',
        topicos: [
          'Interpretação e análise discursiva de textos',
          'Concordância e regência verbal/nominal',
          'Emprego do sinal indicativo de crase',
          'Redação oficial e clareza de atos'
        ]
      },
      {
        nome: 'Raciocínio Lógico e Estatística',
        topicos: [
          'Lógica de argumentação e equivalências',
          'Matemática financeira (juros compostos e amortizações)',
          'Estatística descritiva e probabilidade para auditoria'
        ]
      },
      {
        nome: 'Direito Tributário e Legislação',
        topicos: [
          'Sistema Tributário Nacional na CF/88 (Princípios e Imunidades)',
          'Código Tributário Nacional (CTN - Obrigação e Crédito Tributário)',
          'Espécies tributárias (Impostos, Taxas e Contribuições)',
          'Processo Administrativo Fiscal'
        ]
      },
      {
        nome: 'Contabilidade Geral e Auditoria',
        topicos: [
          'Estrutura do Balanço Patrimonial e DRE (Lei 6.404/76 e CPCs)',
          'Lançamentos contábeis, depreciação e provisões',
          'Normas de Auditoria e testes de conformidade fiscal',
          'Auditoria digital e cruzamento de notas fiscais eletrônicas'
        ]
      }
    ];
  }

  // 3. CARREIRA BANCÁRIA E FINANCEIRA
  if (c.includes('banc') || c.includes('escritur') || c.includes('comercial') || c.includes('caixa') || a === 'bancária') {
    return [
      {
        nome: 'Língua Portuguesa',
        topicos: [
          'Compreensão e interpretação de textos',
          'Ortografia oficial e pontuação',
          'Concordância verbal e nominal',
          'Redação oficial aplicada'
        ]
      },
      {
        nome: 'Matemática Financeira',
        topicos: [
          'Juros simples e compostos',
          'Taxas proporcionais, nominais e efetivas',
          'Descontos e fluxo de caixa',
          'Sistemas de amortização (SAC e Price)'
        ]
      },
      {
        nome: 'Conhecimentos Bancários',
        topicos: [
          'Estrutura do Sistema Financeiro Nacional (CMN, BACEN, CVM)',
          'Instituições financeiras públicas e privadas',
          'Produtos bancários (contas, cartões, crédito, câmbio)',
          'Prevenção à Lavagem de Dinheiro (Lei 9.613/98) e Sigilo Bancário',
          'Open Finance, Pix e segurança cibernética bancária'
        ]
      },
      {
        nome: 'Atendimento, Vendas e Ética',
        topicos: [
          'Técnicas de negociação e vendas consultivas em serviços',
          'Código de Proteção e Defesa do Consumidor bancário',
          'Resolução pacífica de conflitos e foco na experiência do cliente',
          'Ética e conduta no atendimento ao público'
        ]
      }
    ];
  }

  // 4. CARREIRA JURÍDICA E TRIBUNAIS (DIREITO)
  if (c.includes('direito') || c.includes('jur[ií]dic') || c.includes('analista judici') || c.includes('juiz') || c.includes('procurador') || c.includes('escrevente') || a === 'tribunais') {
    return [
      {
        nome: 'Língua Portuguesa',
        topicos: [
          'Compreensão e interpretação textual',
          'Sintaxe do período e termos da oração',
          'Pontuação e emprego da crase',
          'Normas gramaticais de padrão culto'
        ]
      },
      {
        nome: 'Direito Constitucional',
        topicos: [
          'Direitos e garantias fundamentais (Art. 5º da CF)',
          'Remédios constitucionais (Habeas Corpus, Mandado de Segurança)',
          'Poder Judiciário e Funções Essenciais à Justiça',
          'Princípios da Administração Pública (Arts. 37 a 41)'
        ]
      },
      {
        nome: 'Direito Administrativo',
        topicos: [
          'Regime Jurídico dos Servidores Públicos',
          'Atos administrativos (requisitos, atributos e anulação)',
          'Poderes da Administração e poder de polícia',
          'Licitações e Contratos Administrativos'
        ]
      },
      {
        nome: 'Direito Processual e Normas Aplicadas',
        topicos: [
          'Atos processuais, prazos e comunicações judiciais',
          'Procedimento comum e petição inicial',
          'Normas da Corregedoria Geral da Justiça e atendimento ao público forense'
        ]
      }
    ];
  }

  // 5. CARREIRA EDUCACIONAL / MAGISTÉRIO
  if (c.includes('professor') || c.includes('pedagog') || c.includes('educa') || a === 'educação') {
    return [
      {
        nome: 'Língua Portuguesa',
        topicos: [
          'Compreensão textual e gêneros discursivos',
          'Coesão, coerência e concordância verbal/nominal',
          'Ortografia e pontuação'
        ]
      },
      {
        nome: 'Legislação Educacional',
        topicos: [
          'Lei de Diretrizes e Bases da Educação Nacional (LDB - Lei 9.394/96)',
          'Estatuto da Criança e do Adolescente (ECA - Lei 8.069/90)',
          'Base Nacional Comum Curricular (BNCC)',
          'Plano Nacional de Educação (PNE)'
        ]
      },
      {
        nome: 'Didática e Prática Pedagógica',
        topicos: [
          'Teorias da aprendizagem e desenvolvimento infantil/juvenil',
          'Planejamento de aulas, interdisciplinaridade e projetos pedagógicos',
          'Avaliação formativa e inclusão escolar'
        ]
      },
      {
        nome: 'Tecnologias na Educação e Gestão Escolar',
        topicos: [
          'Recursos digitais no processo de ensino-aprendizagem',
          'Gestão democrática da escola pública e relação família-escola'
        ]
      }
    ];
  }

  // 6. CARREIRA DE SAÚDE
  if (c.includes('sa[uú]de') || c.includes('enferm') || c.includes('m[eé]dic') || a === 'saúde') {
    return [
      {
        nome: 'Língua Portuguesa',
        topicos: [
          'Compreensão e interpretação de textos',
          'Normas ortográficas e sintáticas',
          'Crase e pontuação'
        ]
      },
      {
        nome: 'Legislação do SUS',
        topicos: [
          'Constituição Federal de 1988 (Artigos 196 a 200 - Da Saúde)',
          'Lei Orgânica da Saúde (Lei nº 8.080/1990)',
          'Participação da comunidade e transferências de recursos (Lei nº 8.142/1990)',
          'Redes de Atenção à Saúde (RAS) e Estratégia Saúde da Família'
        ]
      },
      {
        nome: 'Saúde Coletiva e Epidemiologia',
        topicos: [
          'Vigilância em saúde (epidemiológica, sanitária e ambiental)',
          'Indicadores de morbidade e mortalidade',
          'Políticas de imunização e biossegurança'
        ]
      },
      {
        nome: 'Conhecimentos Específicos e Ética Profissional',
        topicos: [
          'Procedimentos técnicos e protocolos de atendimento',
          'Segurança do paciente e humanização hospitalar',
          'Código de Ética e Legislação do Conselho Profissional'
        ]
      }
    ];
  }

  // 7. CARREIRA ADMINISTRATIVA / TÉCNICO / ASSISTENTE (PADRÃO GERAL MUNICIPAL/ESTADUAL/FEDERAL)
  // Atende Assistente Administrativo, Técnico de Gestão, Agente de Serviços, Prefeituras
  return [
    {
      nome: 'Língua Portuguesa',
      topicos: [
        'Interpretação e compreensão de textos variados',
        'Ortografia oficial, acentuação e divisão silábica',
        'Concordância e regência verbal e nominal',
        'Pontuação e emprego do sinal de crase',
        'Manual de Redação Oficial (padrão ofício, memorando, circular)'
      ]
    },
    {
      nome: 'Raciocínio Lógico e Matemática Básica',
      topicos: [
        'Operações fundamentais, frações e números decimais',
        'Regra de três simples e composta, razão e proporção',
        'Porcentagem e matemática aplicada a situações cotidianas',
        'Estruturas lógicas elementares e diagramas'
      ]
    },
    {
      nome: 'Noções de Direito Administrativo e Constitucional',
      topicos: [
        'Princípios constitucionais da Administração Pública (LIMPE - Art. 37 da CF)',
        'Direitos e deveres fundamentais do cidadão (Art. 5º da CF)',
        'Deveres, proibições e responsabilidades do servidor público',
        'Atos administrativos e atendimento ao público'
      ]
    },
    {
      nome: 'Administração Geral e Gestão de Documentos',
      topicos: [
        'Noções de arquivos, protocolo e tramitação de documentos',
        'Comunicação interpessoal e atendimento com qualidade no setor público',
        'Noções de controle de estoque, patrimônio e compras públicas',
        'Uso básico de ferramentas de escritório (processador de texto e planilhas)'
      ]
    }
  ];
}

export function buildScheduleFromSubjects(subjects) {
  if (!subjects || subjects.length === 0) return [];
  const s0 = subjects[0] ? subjects[0].nome : 'Língua Portuguesa';
  const s1 = subjects[1] ? subjects[1].nome : 'Raciocínio Lógico';
  const s2 = subjects[2] ? subjects[2].nome : (subjects[0] ? subjects[0].nome : 'Conhecimentos Específicos');
  const s3 = subjects[3] ? subjects[3].nome : (subjects[1] ? subjects[1].nome : 'Revisão Específica');

  return [
    { dia: 'Segunda-feira', materias: [s0] },
    { dia: 'Terça-feira', materias: [s1] },
    { dia: 'Quarta-feira', materias: [s2] },
    { dia: 'Quinta-feira', materias: [s3] },
    { dia: 'Sexta-feira', materias: [s0, 'Revisão Geral da Semana'] },
    { dia: 'Sábado', materias: ['Simulados & Resolução de Questões'] },
    { dia: 'Domingo', materias: ['Descanso'] }
  ];
}

// Sugere cargos inteligentes para um concurso com base no perfil do concurseiro e área do certame
export function getSuggestedCargos(concursoItem, userProfile) {
  const area = (concursoItem.area || '').toLowerCase();
  const orgao = (concursoItem.orgao || '').toLowerCase();
  const userEsc = userProfile?.escolaridade || 'medio';

  const suggestions = [];

  // Se o usuário tem formação em TI
  if (userEsc === 'superior_ti') {
    suggestions.push({
      nome: 'Analista de Tecnologia da Informação (TI)',
      vagas: 'Conforme edital',
      salario: 'R$ 6.500 a R$ 14.000',
      escolaridade: 'Superior em TI'
    });
    suggestions.push({
      nome: 'Técnico de Suporte e Redes de Computadores',
      vagas: 'Conforme edital',
      salario: 'R$ 3.800 a R$ 6.500',
      escolaridade: 'Médio / Técnico'
    });
  }

  // Se o usuário tem formação em Direito
  if (userEsc === 'superior_direito') {
    if (area === 'tribunais') {
      suggestions.push({
        nome: 'Analista Judiciário - Área Judiciária',
        vagas: 'Conforme edital',
        salario: 'R$ 15.200,00',
        escolaridade: 'Bacharelado em Direito'
      });
    } else {
      suggestions.push({
        nome: 'Procurador / Assessor Jurídico Municipal',
        vagas: 'Conforme edital',
        salario: 'R$ 8.500 a R$ 16.000',
        escolaridade: 'Bacharelado em Direito'
      });
    }
  }

  // Se o certame é da área Fiscal ou o usuário é Adm/Economia
  if (area === 'fiscal' || userEsc === 'superior_adm') {
    suggestions.push({
      nome: 'Auditor Fiscal de Tributos Municipais / Estaduais',
      vagas: 'Conforme edital',
      salario: 'R$ 9.800 a R$ 22.000',
      escolaridade: 'Superior em Qualquer Área'
    });
    suggestions.push({
      nome: 'Agente / Fiscal de Rendas e Posturas',
      vagas: 'Conforme edital',
      salario: 'R$ 5.200 a R$ 8.900',
      escolaridade: 'Médio ou Superior'
    });
  }

  // Se for concurso bancário
  if (area === 'bancária' || orgao.includes('banco') || orgao.includes('caixa')) {
    suggestions.push({
      nome: 'Escriturário - Agente Comercial',
      vagas: 'Vagas imediatas + CR',
      salario: 'R$ 4.200 a R$ 6.500 + Benefícios',
      escolaridade: 'Ensino Médio'
    });
    suggestions.push({
      nome: 'Agente de Tecnologia (TI)',
      vagas: 'Vagas imediatas + CR',
      salario: 'R$ 5.500 a R$ 8.000 + Benefícios',
      escolaridade: 'Ensino Médio / Superior'
    });
  }

  // Cargos Administrativos Gerais (Sempre presentes e populares em Prefeituras, Câmaras e Autarquias)
  suggestions.push({
    nome: 'Assistente Administrativo',
    vagas: 'Maior número de vagas',
    salario: 'R$ 2.800 a R$ 5.400',
    escolaridade: 'Ensino Médio Completo'
  });

  suggestions.push({
    nome: 'Agente de Administração e Políticas Públicas',
    vagas: 'Conforme edital',
    salario: 'R$ 3.500 a R$ 6.800',
    escolaridade: 'Médio / Superior em Qualquer Área'
  });

  suggestions.push({
    nome: 'Analista de Gestão e Planejamento',
    vagas: 'Conforme edital',
    salario: 'R$ 5.800 a R$ 9.500',
    escolaridade: 'Superior em Qualquer Área'
  });

  return suggestions;
}
