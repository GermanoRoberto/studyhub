import React, { useState, useEffect } from 'react';
import { generateSubjectExercises, generateRevisional } from '../services/api';

const renderTextWithBold = (text) => {
  if (!text) return '';
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

export default function SubjectStudySimulator({ materia, cargo, concursoKey, provider, apiKey, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { qId: 'A' }
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null); // { correct, total }

  const [loadingRevisional, setLoadingRevisional] = useState(false);
  const [revisionalText, setRevisionalText] = useState('');
  const [revisionalError, setRevisionalError] = useState('');

  // Carrega simulado ao montar
  useEffect(() => {
    loadSimulado();
  }, [materia]);

  const loadSimulado = async () => {
    setLoading(true);
    setError('');
    setSubmitted(false);
    setAnswers({});
    setScore(null);
    setRevisionalText('');
    
    try {
      const data = await generateSubjectExercises(cargo, materia, 10, provider, apiKey);
      if (data && data.questoes) {
        setQuestions(data.questoes);
      } else {
        throw new Error("Formato de resposta inválido.");
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar o simulado. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qIdx, opt) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [qIdx]: opt
    }));
  };

  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const auditSimuladoSubmission = async (materiaName, correctCount, totalCount, questionResults) => {
    if (!concursoKey) return;
    
    // 1. Grava no histórico de respostas
    const ansKey = `answers_${concursoKey}_${cargo}`;
    const savedAns = localStorage.getItem(ansKey);
    let answersLog = [];
    if (savedAns) {
      try { answersLog = JSON.parse(savedAns); } catch(e) {}
    }
    
    questionResults.forEach(res => {
      answersLog.push({
        materia: materiaName,
        isCorrect: res.isCorrect,
        timestamp: new Date().toISOString()
      });
    });
    localStorage.setItem(ansKey, JSON.stringify(answersLog));

    // 2. Grava no Hash Chain auditável
    const chainKey = `hashchain_${concursoKey}_${cargo}`;
    const savedChain = localStorage.getItem(chainKey);
    let chain = [];
    if (savedChain) {
      try { chain = JSON.parse(savedChain); } catch(e) {}
    }

    if (chain.length === 0) {
      const genesis = {
        index: 0,
        timestamp: new Date().toISOString(),
        descricao: "Inicialização do plano de estudos para " + cargo,
        previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
        hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      };
      chain = [genesis];
    }

    const prev = chain[chain.length - 1];
    const index = prev.index + 1;
    const timestamp = new Date().toISOString();
    const desc = `Finalizou Simulado Geral de ${materiaName} - Nota: ${correctCount}/${totalCount} (${Math.round((correctCount/totalCount)*100)}%)`;
    const hash = await sha256(`${index}${timestamp}${desc}${prev.hash}`);

    const newBlock = { index, timestamp, descricao: desc, previousHash: prev.hash, hash };
    localStorage.setItem(chainKey, JSON.stringify([...chain, newBlock]));
  };

  const handleSubmitSimulado = () => {
    // Valida se respondeu pelo menos alguma coisa
    if (Object.keys(answers).length === 0) {
      alert("Por favor, responda a pelo menos uma questão antes de entregar!");
      return;
    }

    let correctCount = 0;
    const questionResults = [];
    questions.forEach((q, idx) => {
      const isCorrect = answers[idx] === q.correta;
      if (isCorrect) {
        correctCount++;
      }
      questionResults.push({
        isCorrect
      });
    });

    setScore({
      correct: correctCount,
      total: questions.length
    });
    setSubmitted(true);

    // Salva na auditoria auditável do aluno
    auditSimuladoSubmission(materia, correctCount, questions.length, questionResults);
  };

  const handleGenerateRevisional = async () => {
    if (!submitted) return;

    setLoadingRevisional(true);
    setRevisionalError('');
    setRevisionalText('');

    // Monta a lista de erros
    const errorsList = [];
    questions.forEach((q, idx) => {
      const userAns = answers[idx];
      if (userAns !== q.correta) {
        errorsList.push({
          enunciado: q.enunciado,
          correta: q.correta,
          respostaUsuario: userAns || 'NÃO RESPONDIDA',
          topico: q.topico || 'Geral',
          explicacao: q.explicacao
        });
      }
    });

    try {
      const data = await generateRevisional(cargo, materia, errorsList, provider, apiKey);
      if (data && data.revisional) {
        setRevisionalText(data.revisional);
      } else {
        throw new Error("Erro na formatação da resposta.");
      }
    } catch (err) {
      console.error(err);
      setRevisionalError('Erro ao gerar relatório revisional. Tente novamente.');
    } finally {
      setLoadingRevisional(false);
    }
  };

  // Parser simples de Markdown para o relatório revisional
  const renderMarkdown = (text) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^\s*[\-\*]\s+(.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
    html = html.replace(/\r?\n\r?\n/g, '</p><p>');
    html = html.replace(/\r?\n/g, '<br/>');

    return `<div class="markdown-body"><p>${html}</p></div>`
      .replace(/<p><h([1-3])>/g, '<h$1>')
      .replace(/<\/h([1-3])><br\/>/g, '</h$1>')
      .replace(/<\/h([1-3])><\/p>/g, '</h$1>')
      .replace(/<p><ul>/g, '<ul>')
      .replace(/<\/ul><\/p>/g, '</ul>');
  };

  return (
    <div className="simulado-page-container animate-fade-in" style={{ padding: '16px 0', width: '100%', margin: '0 auto' }}>
      
      <style>{`
        .sim-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 16px;
        }
        .sim-title {
          font-size: 22px;
          font-weight: bold;
          color: var(--text-main);
          margin: 0;
        }
        .sim-question-card {
          background: rgba(255,255,255,0.015);
          border: 1px solid var(--border-glass);
          border-radius: 10px;
          padding: 24px;
          margin-bottom: 24px;
          position: relative;
        }
        .sim-question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .sim-opt-btn {
          width: 100%;
          text-align: left;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          color: var(--text-main);
          padding: 12px 18px;
          border-radius: 6px;
          margin-top: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }
        .sim-opt-btn:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
        }
        .sim-opt-btn.selected {
          border-color: var(--accent-cyan);
          background: rgba(0, 240, 255, 0.06);
        }
        .sim-opt-btn.correct {
          background: rgba(76, 175, 80, 0.15) !important;
          border-color: rgba(76, 175, 80, 0.5) !important;
          color: #81c784 !important;
          font-weight: 600;
        }
        .sim-opt-btn.incorrect {
          background: rgba(244, 67, 54, 0.15) !important;
          border-color: rgba(244, 67, 54, 0.5) !important;
          color: #e57373 !important;
          font-weight: 600;
        }
        .score-card {
          background: rgba(0, 240, 255, 0.05);
          border: 1px solid rgba(0, 240, 255, 0.25);
          border-radius: 10px;
          padding: 24px;
          text-align: center;
          margin-bottom: 32px;
          box-shadow: 0 0 24px rgba(0, 240, 255, 0.1);
        }
        .revisional-panel {
          background: rgba(10, 14, 26, 0.6);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          padding: 32px;
          margin-top: 32px;
          line-height: 1.6;
        }
        
        /* Relatório Revisional Markdown Styles */
        .revisional-panel h1 {
          font-size: 24px;
          color: var(--accent-cyan);
          border-bottom: 1px solid rgba(0,240,255,0.2);
          padding-bottom: 8px;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .revisional-panel h2 {
          font-size: 18px;
          color: var(--accent-purple);
          margin-top: 24px;
          margin-bottom: 12px;
        }
        .revisional-panel h3 {
          font-size: 15px;
          color: var(--text-main);
          margin-top: 16px;
          margin-bottom: 8px;
        }
        .revisional-panel p {
          margin-bottom: 14px;
          color: rgba(255,255,255,0.9);
        }
        .revisional-panel ul {
          padding-left: 20px;
          margin-bottom: 16px;
        }
        .revisional-panel li {
          margin-bottom: 6px;
          color: rgba(255,255,255,0.85);
        }
        .revisional-panel strong {
          color: var(--accent-cyan);
        }
      `}</style>

      {/* Cabeçalho */}
      <div className="sim-header">
        <div>
          <button className="back-link" onClick={onBack} style={{ marginBottom: '8px' }}>
            ← Voltar para Matérias
          </button>
          <h2 className="sim-title">🏆 Simulado de Nível Real: {materia}</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Cargo: <strong>{cargo}</strong> | Quantidade: <strong>10 Exercícios</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-muted)' }}>
            {provider === 'offline' 
              ? 'Compilando banco de dados de provas anteriores offline...' 
              : 'IA formulando questões inéditas no formato de provas passadas da banca...'}
          </p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--accent-red)' }}>
          <p>{error}</p>
          <button className="sync-btn" onClick={loadSimulado} style={{ display: 'inline-block', width: 'auto', marginTop: '16px' }}>
            Tentar Novamente
          </button>
        </div>
      ) : (
        <div>
          
          {/* Se estiver submetido, mostra painel de notas no topo */}
          {submitted && score && (
            <div className="score-card animate-fade-in">
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                Simulado Concluído
              </span>
              <h3 style={{ margin: '8px 0', fontSize: '28px', color: 'var(--text-main)', fontWeight: 'bold' }}>
                {score.correct} de {score.total} Acertos
              </h3>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                Acurácia Geral de prova: <strong>{Math.round((score.correct / score.total) * 100)}%</strong>
              </p>

              {score.correct < score.total ? (
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginBottom: '16px' }}>
                    Identificamos falhas de memorização em alguns tópicos. Recomendamos gerar o revisional personalizado de erros!
                  </p>
                  <button
                    onClick={handleGenerateRevisional}
                    disabled={loadingRevisional}
                    className="chk-btn"
                    style={{
                      background: 'var(--accent-gradient)',
                      border: 'none',
                      padding: '10px 24px',
                      color: 'white',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      boxShadow: 'var(--shadow-glow)'
                    }}
                  >
                    {loadingRevisional ? 'Processando Guia Revisional...' : '🧠 Gerar Guia de Recuperação de Erros (Revisional)'}
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '14px', margin: '0' }}>
                  🎯 Espetacular! Acurácia de 100%! Você está plenamente preparado nesta matéria.
                </p>
              )}
            </div>
          )}

          {/* LISTA DE QUESTÕES */}
          <div className="questions-list">
            {questions.map((q, idx) => {
              const selectedOpt = answers[idx];
              const isCorrect = selectedOpt === q.correta;

              return (
                <div key={idx} className="sim-question-card">
                  <div className="sim-question-header">
                    <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                      Questão {idx + 1}
                    </span>
                    {q.topico && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600' }}>
                        Tópico: {q.topico}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'rgba(255,255,255,0.95)', whiteSpace: 'pre-line', margin: '0 0 16px 0' }}>
                    {renderTextWithBold(q.enunciado)}
                  </p>

                  <div className="alternatives-section">
                    {Object.entries(q.alternativas).map(([code, text]) => {
                      const isSelected = selectedOpt === code;
                      
                      let optClass = "sim-opt-btn";
                      if (submitted) {
                        if (code === q.correta) optClass += " correct";
                        else if (isSelected && !isCorrect) optClass += " incorrect";
                      } else if (isSelected) {
                        optClass += " selected";
                      }

                      return (
                        <button
                          key={code}
                          className={optClass}
                          disabled={submitted}
                          onClick={() => handleSelectOption(idx, code)}
                        >
                          <strong>{code})</strong> {renderTextWithBold(text)}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="animate-fade-in" style={{ marginTop: '16px', padding: '14px 18px', background: 'rgba(255,255,255,0.015)', borderLeft: `3px solid ${isCorrect ? '#4caf50' : '#f44336'}`, borderRadius: '0 6px 6px 0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: isCorrect ? '#81c784' : '#e57373', marginBottom: '4px' }}>
                        {isCorrect ? '✓ Gabarito Correto' : `✗ Errou (Gabarito: ${q.correta})`}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0', lineHeight: '1.5' }}>
                        <strong>Justificativa:</strong> {renderTextWithBold(q.explicacao)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botão de Enviar no rodapé se não submetido */}
          {!submitted && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                className="chk-btn checked"
                onClick={handleSubmitSimulado}
                style={{
                  background: 'var(--accent-gradient)',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                ✓ Finalizar Simulado & Corrigir
              </button>
            </div>
          )}

          {/* RELATÓRIO REVISIONAL DE ERROS */}
          {loadingRevisional && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', marginTop: '32px' }}>
              <div className="spinner"></div>
              <p style={{ color: 'var(--text-muted)' }}>Gerando guia de correção de falhas cognitivas...</p>
            </div>
          )}

          {revisionalError && (
            <div style={{ textAlign: 'center', color: 'var(--accent-red)', padding: '20px 0' }}>
              <p>{revisionalError}</p>
            </div>
          )}

          {revisionalText && (
            <div className="revisional-panel glass-card animate-fade-in">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(revisionalText) }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <button
                  className="back-link"
                  onClick={() => window.print()}
                  style={{ background: 'rgba(179, 136, 255, 0.1)', borderColor: 'rgba(179, 136, 255, 0.25)', color: 'var(--accent-purple)' }}
                >
                  🖨️ Imprimir Guia Revisional
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
