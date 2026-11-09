// Banco de dados local offline de matérias e questões para concursos brasileiros
const localSubjectsDb = {
  "Língua Portuguesa": {
    topicos: [
      "Compreensão e interpretação de textos",
      "Ortografia oficial e acentuação",
      "Crase (emprego do sinal indicativo)",
      "Concordância verbal e nominal",
      "Regência verbal e nominal",
      "Pontuação (emprego da vírgula)"
    ],
    questoes: [
      {
        enunciado: "(CESGRANRIO) Assinale a opção em que a concordância nominal está adequada às normas da Língua Portuguesa padrão:",
        alternativas: {
          "A": "Seguem anexos os documentos solicitados pelo departamento de recursos humanos.",
          "B": "A candidata estava meia nervosa durante a realização da prova objetiva.",
          "C": "É proibido a entrada de pessoas não autorizadas neste recinto.",
          "D": "Elas mesmas disseram que não queriam fazer a inscrição no concurso.",
          "E": "Tivemos bastante oportunidades de estudar as matérias do edital."
        },
        correta: "A",
        explicacao: "A alternativa A está correta. A palavra 'anexo' funciona como adjetivo e deve concordar em gênero e número com o substantivo a que se refere ('os documentos anexos' -> 'seguem anexos os documentos'). Erros nas demais: B) 'meia' (advérbio de intensidade deve ser invariável: 'meio nervosa'); C) 'É proibido a entrada' (havendo determinante 'a', deve haver concordância: 'É proibida a entrada'); D) 'Elas mesmas' está correto, mas a alternativa A é gramaticalmente irretocável em anexo; E) 'bastante' deveria ser plural para concordar com oportunidades ('bastantes oportunidades')."
      },
      {
        enunciado: "(FGV) Assinale a frase em que o sinal indicativo de crase foi empregado CORRETAMENTE:",
        alternativas: {
          "A": "O candidato dirigiu-se à uma sala localizada no segundo andar.",
          "B": "Os fiscais começaram à entregar os cadernos de provas às nove horas.",
          "C": "O gabarito preliminar será divulgado a partir de amanhã.",
          "D": "Refiro-me à candidata que foi aprovada em primeiro lugar geral.",
          "E": "Todos os candidatos andavam à pé pelas dependências do colégio."
        },
        correta: "D",
        explicacao: "A alternativa D está correta. O verbo referir-se exige a preposição 'a' (Quem se refere, refere-se a algo/alguém) e a palavra 'candidata' é substantivo feminino antecedido pelo artigo 'a'. A fusão resulta em 'à'. Erros nas outras: A) Não ocorre crase antes de artigo indefinido 'uma'; B) Não ocorre crase antes de verbo no infinitivo 'entregar'; C) Não ocorre crase antes de palavra masculina 'amanhã'; E) Não ocorre crase antes de palavra masculina 'pé'."
      }
    ]
  },
  "Direito Constitucional": {
    topicos: [
      "Direitos e deveres fundamentais (Art. 5º da CF)",
      "Direitos Sociais e Nacionalidade",
      "Organização do Estado e dos Poderes",
      "Seguridade Social na Constituição",
      "Administração Pública (Arts. 37 a 41)"
    ],
    questoes: [
      {
        enunciado: "(CEBRASPE) À luz dos direitos e garantias fundamentais previstos na Constituição Federal de 1988, assinale a opção correta:",
        alternativas: {
          "A": "A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo, durante a noite, por determinação judicial.",
          "B": "A prática do racismo constitui crime inafiançável e imprescritível, sujeito à pena de reclusão, nos termos da lei.",
          "C": "O mandado de segurança coletivo pode ser impetrado por qualquer cidadão em pleno gozo de seus direitos políticos.",
          "D": "É livre a manifestação do pensamento, sendo garantido o anonimato nas publicações científicas.",
          "E": "A lei penal retroagirá sempre para beneficiar ou prejudicar o réu em crimes hediondos."
        },
        correta: "B",
        explicacao: "A alternativa B é a correta, pois reproduz literalmente o texto do Art. 5º, inciso XLII, da CF/88: 'a prática do racismo constitui crime inafiançável e imprescritível, sujeito à pena de reclusão, nos termos da lei'. A) Determinação judicial para entrada em domicílio só pode ser executada durante o dia; C) Cidadão impetra Ação Popular, enquanto Mandado de Segurança Coletivo exige partido político ou associação/sindicato; D) O anonimato é expressamente vedado; E) A lei penal NÃO retroagirá, salvo para beneficiar o réu."
      },
      {
        enunciado: "(FGV) No que tange à administração pública e aos servidores públicos (Art. 37 da CF), é correto afirmar que:",
        alternativas: {
          "A": "Os cargos, empregos e funções públicas são acessíveis apenas aos brasileiros natos ou naturalizados.",
          "B": "O prazo de validade do concurso público será de até dois anos, prorrogável uma vez, por igual período.",
          "C": "A lei reservará percentual dos cargos e empregos públicos para as pessoas portadoras de deficiência, independentemente de concurso.",
          "D": "A investidura em cargo ou emprego público depende sempre de aprovação prévia em concurso público de provas e títulos, sem exceções.",
          "E": "A publicidade dos atos da administração pública pode constar nomes ou imagens que caracterizem promoção pessoal de autoridades."
        },
        correta: "B",
        explicacao: "A alternativa B está correta de acordo com o Art. 37, inciso III da CF/88. A) Estrangeiros também têm acesso na forma da lei; C) A reserva existe, mas a aprovação em concurso é obrigatória para a investidura; D) Cargos em comissão de livre nomeação e exoneração são exceções ao concurso; E) A publicidade não pode ter caráter de promoção pessoal (princípio da impessoalidade)."
      }
    ]
  },
  "Direito Administrativo": {
    topicos: [
      "Princípios básicos da Administração Pública (LIMPE)",
      "Atos Administrativos (requisitos e atributos)",
      "Poderes da Administração Pública",
      "Processo Administrativo e Lei 9.784/99",
      "Agentes Públicos e Lei 8.112/90"
    ],
    questoes: [
      {
        enunciado: "(FCC) O atributo do ato administrativo pelo qual o ato se impõe a terceiros, independentemente de sua concordância, denomina-se:",
        alternativas: {
          "A": "Presunção de legitimidade",
          "B": "Imperatividade",
          "C": "Autoexecutoriedade",
          "D": "Tipicidade",
          "E": "Discricionariedade"
        },
        correta: "B",
        explicacao: "A alternativa B está correta. A imperatividade é o atributo pelo qual os atos administrativos se impõem a terceiros de forma unilateral, obrigando ao seu cumprimento independentemente da vontade do administrado. A autoexecutoriedade permite à administração executar suas decisões diretamente sem autorização judicial prévia. A presunção de legitimidade presume que o ato foi praticado conforme a lei. A tipicidade exige que o ato corresponda a figuras previamente definidas em lei."
      },
      {
        enunciado: "(CEBRASPE) Em relação aos poderes administrativos, o poder que permite à Administração Pública aplicar penalidades disciplinares aos seus servidores e particulares com vínculo especial denomina-se:",
        alternativas: {
          "A": "Poder Hierárquico",
          "B": "Poder de Polícia",
          "C": "Poder Regulamentar",
          "D": "Poder Disciplinar",
          "E": "Poder Vinculado"
        },
        correta: "D",
        explicacao: "A alternativa D está correta. O Poder Disciplinar é a faculdade de punir as infrações funcionais dos servidores e de outras pessoas sujeitas à disciplina dos órgãos e serviços da Administração (vínculo especial, como um concessionário de serviço público ou aluno de escola pública)."
      }
    ]
  },
  "Raciocínio Lógico e Matemática": {
    topicos: [
      "Proposições, conectivos e tabelas-verdade",
      "Equivalências lógicas e negação de proposições",
      "Porcentagem e Regra de Três simples/composta",
      "Juros Simples e Compostos",
      "Probabilidade básica e análise combinatória"
    ],
    questoes: [
      {
        enunciado: "(FGV) A negação lógica da proposição 'Se eu estudar, então passarei no concurso' é:",
        alternativas: {
          "A": "Se eu não estudar, então não passarei no concurso.",
          "B": "Eu não estudo e não passo no concurso.",
          "C": "Eu estudo e não passo no concurso.",
          "D": "Se eu passar no concurso, então estudei.",
          "E": "Eu estudo ou não passo no concurso."
        },
        correta: "C",
        explicacao: "A alternativa C está correta. A regra de negação do condicional 'Se P, então Q' (P -> Q) é manter a primeira proposição E negar a segunda: 'P e não Q'. Portanto, a negação de 'Se estudar (P), passarei (Q)' é 'Estudo (P) e não passo (não Q)'."
      },
      {
        enunciado: "(FCC) Em uma loja de apostilas para concursos, um livro que custava R$ 80,00 sofreu um aumento de 15%. Um mês depois, devido à baixa procura, o gerente concedeu um desconto de 10% sobre o novo valor. O preço final do livro passou a ser:",
        alternativas: {
          "A": "R$ 84,00",
          "B": "R$ 82,80",
          "C": "R$ 83,60",
          "D": "R$ 81,00",
          "E": "R$ 85,20"
        },
        correta: "B",
        explicacao: "A alternativa B está correta. Vamos calcular em duas etapas: 1) Preço com aumento de 15%: R$ 80,00 * 1,15 = R$ 92,00. 2) Desconto de 10% sobre o novo preço (R$ 92,00): R$ 92,00 * 0,90 = R$ 82,80. Portanto, o valor final é R$ 82,80."
      }
    ]
  },
  "Noções de Informática": {
    topicos: [
      "Sistemas Operacionais (Windows e Linux)",
      "Editores de texto e planilhas (Word/Excel/Writer/Calc)",
      "Redes de computadores, internet e navegadores",
      "Segurança da Informação (vírus, malware, backup)",
      "Serviços de Nuvem e Armazenamento virtual"
    ],
    questoes: [
      {
        enunciado: "(CESGRANRIO) No Microsoft Excel, a fórmula que soma o conteúdo das células da célula A1 até a célula A5 de forma consecutiva é:",
        alternativas: {
          "A": "=SOMA(A1;A5)",
          "B": "=SOMA(A1:A5)",
          "C": "=ADICIONAR(A1..A5)",
          "D": "=SUM(A1-A5)",
          "E": "=SOMA(A1+A5)"
        },
        correta: "B",
        explicacao: "A alternativa B está correta. No Excel, o operador de dois pontos (:) indica um intervalo contínuo (da célula A1 até a A5). O ponto e vírgula (;) serve para separar argumentos individuais (somaria apenas A1 e A5)."
      },
      {
        enunciado: "(CEBRASPE) Um tipo de programa malicioso que se propaga criando cópias de si mesmo de computador para computador através de redes de comunicação, sem a necessidade de infectar arquivos existentes, é conhecido como:",
        alternativas: {
          "A": "Ransomware",
          "B": "Trojan Horse (Cavalo de Troia)",
          "C": "Worm (Verme)",
          "D": "Spyware",
          "E": "Adware"
        },
        correta: "C",
        explicacao: "A alternativa C está correta. Os Worms diferem dos vírus tradicionais porque são programas autônomos que se propagam diretamente pelas redes explorando vulnerabilidades, sem precisar infectar outros arquivos ou hospedeiros."
      }
    ]
  },
  "Ética no Serviço Público": {
    topicos: [
      "Conceito de ética, moral e cidadania",
      "Código de Ética Profissional do Servidor Público (Decreto 1.171/94)",
      "Lei de Improbidade Administrativa (Lei 8.429/92)",
      "Princípios éticos da conduta administrativa"
    ],
    questoes: [
      {
        enunciado: "(CESPE) Segundo o Código de Ética do Servidor Público Federal (Decreto nº 1.171/94), assinale a opção correta:",
        alternativas: {
          "A": "A publicidade de qualquer ato administrativo é requisito de eficácia e moralidade, não podendo ser omitida em nenhuma hipótese.",
          "B": "O servidor público não pode omitir a verdade, exceto quando for para proteger o interesse superior do órgão estatal onde atua.",
          "C": "A cortesia e a boa vontade são opcionais e dependem do comportamento prévio do cidadão que solicita o atendimento.",
          "D": "O trabalho desenvolvido pelo servidor público perante a comunidade deve ser entendido como acréscimo ao seu próprio bem-estar.",
          "E": "Toda ausência injustificada do servidor de seu local de trabalho é fator de desmoralização do serviço público, o que quase sempre conduz à desordem nas relações humanas."
        },
        correta: "E",
        explicacao: "A alternativa E está correta conforme a Seção I, inciso XII do Decreto 1.171/94: 'Toda ausência injustificada do servidor de seu local de trabalho é fator de desmoralização do serviço público, o que quase sempre conduz à desordem nas relações humanas'. A) Há exceções relativas à segurança do Estado; B) O dever de verdade é absoluto; C) Cortesia e urbanidade são deveres permanentes e obrigatórios; D) O trabalho é acréscimo ao bem comum da sociedade e não do próprio servidor."
      }
    ]
  },
  "Modelagem Estatística, Machine Learning e Criptografia": {
    topicos: [
      "Regressão Linear e Aprendizado de Ruído",
      "Árvores de Decisão e Random Forest (Ensembles)",
      "Séries Temporais, LSTM e Mecanismos de Atenção (Transformers)",
      "Validação de Modelos e Simulação de Resultados (Backtesting)",
      "Criptografia, Hash SHA-256 e Cadeia de Hashes (Linked Lists)",
      "Verificabilidade (Auditável) e Imprevisibilidade em Algoritmos"
    ],
    questoes: [
      {
        enunciado: "(Analista - Ciência de Dados) Em sistemas de auditoria algorítmica baseados no conceito de \"Provably Fair\", utiliza-se uma cadeia de hashes encadeados (Hash Chain) gerados por meio de uma função hash unidirecional (como SHA-256). A respeito da segurança e verificabilidade dessa arquitetura, assinale a opção correta:",
        alternativas: {
          "A": "A previsibilidade do próximo número gerado é trivial se o usuário conhecer a sequência dos últimos três hashes publicados na rede.",
          "B": "Devido às propriedades do SHA-256, é possível reverter matematicamente o hash resultante para descobrir a semente (seed) original sem usar força bruta.",
          "C": "Como o hash do jogo atual, quando submetido à função SHA-256, resulta exatamente no hash da partida anterior, qualquer usuário consegue comprovar de forma auditável que o resultado já estava pré-determinado e não foi alterado em tempo real.",
          "D": "A integridade do jogo é garantida por criptografia de chave pública e privada, impossibilitando a verificação independente por navegadores de internet.",
          "E": "Uma cadeia de hashes encadeados exige que o servidor realize o cálculo reverso em tempo real a cada aposta, tornando o algoritmo suscetível a ataques de negação de serviço (DoS)."
        },
        correta: "C",
        explicacao: "A alternativa C está correta. A cadeia funciona de trás para frente ($Hash_n \\rightarrow Hash_{n-1} \\rightarrow ... \\rightarrow Hash_0$). Como o hash do jogo atual ($Hash_{x}$), após ser submetido à função SHA-256, gera o hash anterior ($Hash_{x-1}$), qualquer usuário pode reexecutar a função hash localmente para comprovar que a sequência é íntegra, pré-gerada e imutável. Erros nas demais: A e B) SHA-256 é unidirecional e resistente a colisão/reversão (imprevisível); D) Não exige chaves assimétricas complexas para verificação do hash público; E) O cálculo é simples e pré-gerado, sem gargalo computacional."
      },
      {
        enunciado: "(Especialista - Machine Learning) No contexto de modelagem sequencial e predição temporais, a escolha da arquitetura do modelo impacta o aprendizado de padrões reais versus ruídos. Sobre Árvores de Decisão, Random Forest, LSTM e Transformers aplicados a esse contexto, assinale a afirmativa correta:",
        alternativas: {
          "A": "A Regressão Linear é a modelagem ideal para testar relações temporais complexas em grandes volumes de dados caóticos sem sofrer com aprendizado de ruído.",
          "B": "O Random Forest consiste em um ensemble de árvores de decisão cujas respostas são combinadas por votação majoritária para reduzir a variância e mitigar o sobreajuste (overfitting).",
          "C": "Redes LSTM possuem a limitação estrutural de necessitar de uma janela fixa máxima de dados do passado para realizar predições de séries temporais.",
          "D": "Os Transformers dependem de estruturas de recorrência para sequencializar a leitura e comparar cada posição da sequência com as anteriores.",
          "E": "A simulação em ambiente prático (backtesting) com saldo fictício demonstra que modelos baseados em redes recorrentes (LSTM) conseguem manter lucros consistentes no longo prazo quando aplicados a geradores pseudoaleatórios criptograficamente seguros."
        },
        correta: "B",
        explicacao: "A alternativa B está correta. O Random Forest combina centenas de árvores de decisão independentes (bootstrap aggregation) e calcula a média/votação final das predições, o que ajuda expressivamente a reduzir o overfitting comparado a uma única árvore. Erros nas demais: A) Regressão linear sofre intensamente em dados caóticos não-lineares, aprendendo ruído; C) Redes LSTM processam sequências sem limites rígidos de janela devido à sua célula de memória persistente; D) Os Transformers abandonam a recorrência sequencial em favor dos mecanismos de auto-atenção (self-attention); E) O backtesting prova que geradores criptográficos seguros (Provably Fair) são imprevisíveis e zeram o saldo no longo prazo."
      }
    ]
  }
};

module.exports = { localSubjectsDb };
