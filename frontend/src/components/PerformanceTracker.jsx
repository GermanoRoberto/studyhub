import React, { useState, useEffect } from 'react';

export default function PerformanceTracker({ materias, cargo, concursoKey }) {
  const [stats, setStats] = useState({ totalRespostas: 0, corretas: 0, accuracy: 0 });
  const [subjectStats, setSubjectStats] = useState({});
  const [simResults, setSimResults] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [historyChain, setHistoryChain] = useState([]);
  const [auditStatus, setAuditStatus] = useState('');

  // Carrega estatísticas e histórico criptográfico do localStorage
  useEffect(() => {
    // 1. Carrega histórico de questões resolvidas
    const savedAnswers = localStorage.getItem(`answers_${concursoKey}_${cargo}`);
    let answers = [];
    if (savedAnswers) {
      try {
        answers = JSON.parse(savedAnswers);
      } catch (e) {
        console.error(e);
      }
    }

    // Calcula acurácia geral e por matéria
    let total = answers.length;
    let correct = answers.filter(a => a.isCorrect).length;
    let acc = total > 0 ? Math.round((correct / total) * 100) : 0;
    setStats({ totalRespostas: total, corretas: correct, accuracy: acc });

    const subMap = {};
    materias.forEach(m => {
      subMap[m.nome] = { total: 0, correct: 0 };
    });

    answers.forEach(ans => {
      if (subMap[ans.materia]) {
        subMap[ans.materia].total += 1;
        if (ans.isCorrect) {
          subMap[ans.materia].correct += 1;
        }
      }
    });
    setSubjectStats(subMap);

    // 2. Carrega Cadeia de Hashes (Histórico Auditável)
    const savedChain = localStorage.getItem(`hashchain_${concursoKey}_${cargo}`);
    if (savedChain) {
      try {
        setHistoryChain(JSON.parse(savedChain));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Inicia a cadeia com o bloco Gênese
      const genesisBlock = {
        index: 0,
        timestamp: new Date().toISOString(),
        descricao: "Inicialização do plano de estudos para " + cargo,
        previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
        hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" // SHA-256 de string vazia
      };
      setHistoryChain([genesisBlock]);
      localStorage.setItem(`hashchain_${concursoKey}_${cargo}`, JSON.stringify([genesisBlock]));
    }
  }, [materias, cargo, concursoKey]);

  // Função auxiliar para gerar hash SHA-256 usando Web Crypto API
  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Simulação estatística (Backtesting de Aprovação)
  const runBacktesting = () => {
    setSimulating(true);
    setSimResults(null);

    setTimeout(async () => {
      const numTrials = 100; // 100 simulações de prova
      const numQuestions = 70; // Uma prova padrão de 70 questões
      const notaCorte = 50; // Mínimo de 50 acertos para aprovação (71%)

      // Usa a acurácia geral do aluno, ou 50% (chute básico) se não tiver dados
      const studentAccuracy = stats.totalRespostas > 0 ? stats.accuracy / 100 : 0.5;

      let approvals = 0;
      let totalScores = 0;
      const trialScores = [];

      for (let t = 0; t < numTrials; t++) {
        let score = 0;
        for (let q = 0; q < numQuestions; q++) {
          // Cada questão simulada é resolvida baseando-se na probabilidade de acerto do aluno
          if (Math.random() < studentAccuracy) {
            score++;
          }
        }
        trialScores.push(score);
        totalScores += score;
        if (score >= notaCorte) {
          approvals++;
        }
      }

      const media = Math.round((totalScores / numTrials) * 10) / 10;
      const pctMedia = Math.round((media / numQuestions) * 100);
      const probAprovacao = Math.round((approvals / numTrials) * 100);

      setSimResults({
        media,
        pctMedia,
        probAprovacao,
        notaCorte,
        numQuestions,
        trialScores
      });
      setSimulating(false);

      // Adiciona esta simulação à Cadeia de Hashes
      await appendToHashChain(`Executou Simulação de Prova - Probabilidade de aprovação projetada: ${probAprovacao}%`);
    }, 1500);
  };

  // Adiciona novo bloco à Linked List de Hashes (Hash Chain)
  const appendToHashChain = async (desc) => {
    const savedChain = localStorage.getItem(`hashchain_${concursoKey}_${cargo}`);
    let currentChain = [];
    if (savedChain) {
      try {
        currentChain = JSON.parse(savedChain);
      } catch (e) {
        console.error(e);
      }
    }

    if (currentChain.length === 0) return;

    const previousBlock = currentChain[currentChain.length - 1];
    const newIndex = previousBlock.index + 1;
    const timestamp = new Date().toISOString();
    const dataToHash = `${newIndex}${timestamp}${desc}${previousBlock.hash}`;
    const hash = await sha256(dataToHash);

    const newBlock = {
      index: newIndex,
      timestamp,
      descricao: desc,
      previousHash: previousBlock.hash,
      hash
    };

    const updatedChain = [...currentChain, newBlock];
    setHistoryChain(updatedChain);
    localStorage.setItem(`hashchain_${concursoKey}_${cargo}`, JSON.stringify(updatedChain));
  };

  // Verifica a integridade criptográfica da cadeia (Recalcula todos os hashes)
  const verifyChainIntegrity = async () => {
    setAuditStatus('auditando');
    
    setTimeout(async () => {
      let isValid = true;
      for (let i = 1; i < historyChain.length; i++) {
        const prevBlock = historyChain[i - 1];
        const block = historyChain[i];

        // Verifica encadeamento do previousHash
        if (block.previousHash !== prevBlock.hash) {
          isValid = false;
          break;
        }

        // Recalcula o hash e compara
        const dataToHash = `${block.index}${block.timestamp}${block.descricao}${block.previousHash}`;
        const recalculatedHash = await sha256(dataToHash);
        if (block.hash !== recalculatedHash) {
          isValid = false;
          break;
        }
      }

      if (isValid) {
        setAuditStatus('valido');
      } else {
        setAuditStatus('invalido');
      }
    }, 1200);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Métricas de Estudo */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-main)' }}>📊 Diagnóstico de Desempenho</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="countdown-box" style={{ margin: 0, background: 'rgba(255,255,255,0.01)' }}>
            <div className="countdown-title">Questões Resolvidas</div>
            <div className="countdown-val">{stats.totalRespostas}</div>
          </div>
          <div className="countdown-box" style={{ margin: 0, background: 'rgba(0, 255, 135, 0.02)', borderColor: 'rgba(0, 255, 135, 0.15)' }}>
            <div className="countdown-title" style={{ color: 'var(--accent-green)' }}>Respostas Corretas</div>
            <div className="countdown-val" style={{ color: 'var(--accent-green)' }}>{stats.corretas}</div>
          </div>
          <div className="countdown-box" style={{ margin: 0, background: 'rgba(0, 242, 254, 0.02)', borderColor: 'rgba(0, 242, 254, 0.15)' }}>
            <div className="countdown-title" style={{ color: 'var(--accent-cyan)' }}>Taxa de Acerto (Acurácia)</div>
            <div className="countdown-val" style={{ color: 'var(--accent-cyan)' }}>{stats.accuracy}%</div>
          </div>
        </div>

        <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Acurácia por Disciplina:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(subjectStats).map(([subj, data]) => {
            const acc = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
            const needsFocus = acc < 70 && data.total > 0;
            return (
              <div key={subj} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px', alignItems: 'center', fontSize: '13px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                <span>{subj}</span>
                <span style={{ color: 'var(--text-muted)' }}>{data.correct}/{data.total} acertos</span>
                <span style={{ fontWeight: 'bold', color: needsFocus ? 'var(--accent-red)' : acc > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {data.total > 0 ? `${acc}%` : 'Sem dados'} {needsFocus && '⚠️'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Validação e Testes Práticos (Backtesting de Aprovação) */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>⚡ Backtesting de Aprovação</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
          O simulador executa <strong>100 cenários de prova</strong> (com base na sua taxa de acerto atual nas matérias) 
          para avaliar estatisticamente a probabilidade de você passar no concurso real.
        </p>

        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <button 
            className="generate-btn" 
            onClick={runBacktesting} 
            disabled={simulating}
            style={{ background: 'var(--cyan-gradient)' }}
          >
            {simulating ? 'Rodando 100 Cenários...' : '📊 Rodar Simulação de Aprovação'}
          </button>
        </div>

        {simulating && (
          <div className="loading-overlay" style={{ padding: '20px' }}>
            <div className="spinner"></div>
            <p>Calculando distribuição probabilística de acertos...</p>
          </div>
        )}

        {simResults && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <div>
              <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '16px', fontSize: '15px' }}>Resultado da Simulação</h4>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Acertos Médios Projetados:</span>
                <strong style={{ fontSize: '20px' }}>{simResults.media}</strong> <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>de {simResults.numQuestions} questões ({simResults.pctMedia}%)</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Nota de Corte Requerida:</span>
                <strong style={{ fontSize: '16px' }}>{simResults.notaCorte} acertos</strong> <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({Math.round((simResults.notaCorte/simResults.numQuestions)*100)}%)</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Probabilidade de Aprovação:</span>
                <strong style={{ fontSize: '28px', color: simResults.probAprovacao > 70 ? 'var(--accent-green)' : simResults.probAprovacao > 40 ? '#f1c40f' : 'var(--accent-red)' }}>
                  {simResults.probAprovacao}%
                </strong>
              </div>
            </div>

            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '10px', fontSize: '13px' }}>Distribuição das Notas Simuladas:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '180px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                {simResults.trialScores.map((sc, idx) => {
                  const passed = sc >= simResults.notaCorte;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        fontSize: '11px', 
                        padding: '4px 6px', 
                        borderRadius: '4px', 
                        background: passed ? 'rgba(0, 255, 135, 0.15)' : 'rgba(255, 56, 96, 0.15)',
                        border: `1px solid ${passed ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                        color: passed ? 'var(--accent-green)' : '#ff8a9f',
                        flex: '1 0 18%'
                      }}
                      title={`Simulação ${idx+1}`}
                    >
                      S{idx+1}: <strong>{sc}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Provably Fair / Auditabilidade do Progresso */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px' }}>🔒 Registro de Estudo Auditável (Linked Hash Chain)</h3>
          
          <button 
            className="api-key-btn" 
            onClick={verifyChainIntegrity}
            disabled={auditStatus === 'auditando'}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {auditStatus === 'auditando' ? 'Recalculando Hashes...' : '🛡️ Auditar Histórico'}
          </button>
        </div>
        
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
          Cada ação de estudo gera um comprovante criptográfico (SHA-256) encadeado ao bloco anterior.
          Isso assegura que o seu histórico de revisões e notas é <strong>imutável e auditável</strong>.
        </p>

        {auditStatus && (
          <div 
            style={{ 
              padding: '12px', 
              borderRadius: '6px', 
              marginBottom: '16px', 
              fontSize: '13px', 
              textAlign: 'center',
              fontWeight: '600',
              background: auditStatus === 'valido' ? 'rgba(0, 255, 135, 0.1)' : auditStatus === 'invalido' ? 'rgba(255, 56, 96, 0.1)' : 'rgba(255,255,255,0.05)',
              color: auditStatus === 'valido' ? 'var(--accent-green)' : auditStatus === 'invalido' ? 'var(--accent-red)' : 'var(--accent-cyan)'
            }}
          >
            {auditStatus === 'auditando' && '⏳ Calculando hashes do bloco Gênese até o bloco atual...'}
            {auditStatus === 'valido' && '✓ Cadeia Íntegra! Todos os hashes batem perfeitamente. Histórico livre de alterações.'}
            {auditStatus === 'invalido' && '❌ AVISO: Cadeia violada! Algum hash anterior foi alterado manualmente.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
          {[...historyChain].reverse().map((block) => (
            <div key={block.index} style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(0,0,0,0.15)', borderLeft: '3px solid var(--accent-primary)', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>Bloco #{block.index}</span>
                <span>{new Date(block.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{block.descricao}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-highlight)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Hash: {block.hash}
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
