import React, { useState, useEffect } from 'react';
import TopicStudyPage from './TopicStudyPage';
import SubjectStudySimulator from './SubjectStudySimulator';
import { getTopicMiniSummary } from '../utils/miniSummaries';

export default function SubjectList({ materias, cargo, concursoKey, provider, apiKey, banca, studyPlan, onUpdatePlan }) {
  const [progress, setProgress] = useState({});
  const [openSubject, setOpenSubject] = useState(0);
  const [activeStudyTopic, setActiveStudyTopic] = useState(null); // { subjectIndex, topicIndex, subjectName, topicName }
  const [activeSubjectSimulado, setActiveSubjectSimulado] = useState(null); // { subjectIndex, subjectName }
  const [newTopicTexts, setNewTopicTexts] = useState({});
  const [newSubjectText, setNewSubjectText] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Carrega progresso salvo no localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`progress_${concursoKey}_${cargo}`);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao ler progresso salvo", e);
      }
    } else {
      setProgress({});
    }
  }, [materias, cargo, concursoKey]);

  // Salva progresso no localStorage
  const saveProgress = (newProgress) => {
    setProgress(newProgress);
    localStorage.setItem(`progress_${concursoKey}_${cargo}`, JSON.stringify(newProgress));
  };

  const handleToggle = (subjectIndex, topicIndex, type) => {
    const key = `${subjectIndex}_${topicIndex}`;
    const current = progress[key] || { studied: false, revised: false, exercises: false };
    
    const updated = {
      ...progress,
      [key]: {
        ...current,
        [type]: !current[type]
      }
    };
    saveProgress(updated);
  };

  const handleViewSummary = (subjectIndex, topicIndex, subjectName, topicName) => {
    setActiveStudyTopic({ subjectIndex, topicIndex, subjectName, topicName });
  };

  const handleStartSubjectSimulado = (subjectIndex, subjectName) => {
    setActiveSubjectSimulado({ subjectIndex, subjectName });
  };

  const handleAddTopic = (subjectIndex) => {
    const text = (newTopicTexts[subjectIndex] || '').trim();
    if (!text || !studyPlan || !onUpdatePlan) return;

    const updatedMaterias = materias.map((m, idx) => {
      if (idx === subjectIndex) {
        return {
          ...m,
          topicos: [...(m.topicos || []), text]
        };
      }
      return m;
    });

    const updatedPlan = {
      ...studyPlan,
      materias: updatedMaterias
    };
    onUpdatePlan(updatedPlan);
    setNewTopicTexts(prev => ({ ...prev, [subjectIndex]: '' }));
  };

  const handleRemoveTopic = (subjectIndex, topicIndex) => {
    if (!studyPlan || !onUpdatePlan) return;
    const updatedMaterias = materias.map((m, idx) => {
      if (idx === subjectIndex) {
        return {
          ...m,
          topicos: m.topicos.filter((_, tIdx) => tIdx !== topicIndex)
        };
      }
      return m;
    });

    const updatedPlan = {
      ...studyPlan,
      materias: updatedMaterias
    };
    onUpdatePlan(updatedPlan);
  };

  const handleAddSubject = () => {
    const text = newSubjectText.trim();
    if (!text || !studyPlan || !onUpdatePlan) return;

    const newSubject = {
      nome: text,
      topicos: ['Introdução e legislação geral']
    };

    const updatedPlan = {
      ...studyPlan,
      materias: [...(studyPlan.materias || []), newSubject]
    };
    onUpdatePlan(updatedPlan);
    setNewSubjectText('');
    setShowAddSubject(false);
  };

  // Cálculo de estatísticas de progresso
  const getProgressStats = () => {
    if (!materias || materias.length === 0) return 0;
    let totalItems = 0;
    let checkedItems = 0;

    materias.forEach((m, sIdx) => {
      m.topicos.forEach((t, tIdx) => {
        totalItems += 3;
        const key = `${sIdx}_${tIdx}`;
        const item = progress[key];
        if (item) {
          if (item.studied) checkedItems++;
          if (item.revised) checkedItems++;
          if (item.exercises) checkedItems++;
        }
      });
    });

    if (totalItems === 0) return 0;
    return Math.round((checkedItems / totalItems) * 100);
  };

  const overallProgress = getProgressStats();

  // Se houver um tópico ativo, renderiza a Página de Estudos dedicada
  if (activeStudyTopic) {
    return (
      <TopicStudyPage 
        topicDetails={activeStudyTopic}
        cargo={cargo}
        concursoKey={concursoKey}
        provider={provider}
        apiKey={apiKey}
        banca={banca}
        progress={progress}
        handleToggle={handleToggle}
        onBack={() => setActiveStudyTopic(null)}
      />
    );
  }

  // Se houver um simulado de disciplina ativo, renderiza a Página de Simulado dedicada
  if (activeSubjectSimulado) {
    return (
      <SubjectStudySimulator 
        materia={activeSubjectSimulado.subjectName}
        cargo={cargo}
        concursoKey={concursoKey}
        provider={provider}
        apiKey={apiKey}
        onBack={() => setActiveSubjectSimulado(null)}
      />
    );
  }

  return (
    <div className="subjects-card glass-card animate-fade-in">
      <div className="section-header">
        <h3 style={{ fontSize: '20px' }}>Matérias e Conteúdo do Edital</h3>
        <div className="overall-progress">
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Progresso Geral:</span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{overallProgress}%</span>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="subjects-accordion">
        {materias && materias.map((subject, sIdx) => {
          const isOpen = openSubject === sIdx;
          
          let mTotal = subject.topicos.length * 3;
          let mChecked = 0;
          subject.topicos.forEach((_, tIdx) => {
            const key = `${sIdx}_${tIdx}`;
            if (progress[key]) {
              if (progress[key].studied) mChecked++;
              if (progress[key].revised) mChecked++;
              if (progress[key].exercises) mChecked++;
            }
          });
          const mProgress = mTotal > 0 ? Math.round((mChecked / mTotal) * 100) : 0;

          return (
            <div key={sIdx} className="subject-item">
              <div 
                className="subject-header"
                onClick={() => setOpenSubject(isOpen ? null : sIdx)}
              >
                <div className="subject-title">
                  <span>{isOpen ? '▼' : '▶'}</span>
                  <span>{subject.nome}</span>
                </div>
                <div className="subject-header-right">
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {subject.topicos.length} tópicos
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-green)' }}>
                    {mProgress}% concluído
                  </span>
                </div>
              </div>

              {isOpen && (
                <div className="topic-list animate-fade-in">
                  {subject.topicos.map((topic, tIdx) => {
                    const key = `${sIdx}_${tIdx}`;
                    const states = progress[key] || { studied: false, revised: false, exercises: false };
                    const topicName = typeof topic === 'string' ? topic : (topic.nome || topic.topico || topic.title || String(topic));
                    const miniSummary = getTopicMiniSummary(topic, subject.nome);

                    return (
                      <div key={tIdx} className="topic-item" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px' }}>
                        {/* Linha superior: Título do tópico + Botão de Ver Resumo Teórico */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="topic-name" style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>{topicName}</span>
                            {onUpdatePlan && (
                              <button 
                                onClick={() => handleRemoveTopic(sIdx, tIdx)}
                                title="Remover este tópico"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'rgba(255,255,255,0.2)',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  padding: '2px 4px'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#ff5555'}
                                onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.2)'}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          
                          <button 
                            className="study-notes-btn"
                            onClick={() => handleViewSummary(sIdx, tIdx, subject.nome, topicName)}
                            style={{
                              background: 'rgba(0, 240, 255, 0.08)',
                              color: 'var(--accent-cyan)',
                              border: '1px solid rgba(0, 240, 255, 0.2)',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            📖 Ver Resumo Teórico
                          </button>
                        </div>
                        
                        {/* Linha inferior: Mini-resumo de no máximo 2 linhas + Ações de Estudo */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          gap: '16px',
                          flexWrap: 'wrap'
                        }}>
                          <p style={{
                            margin: 0,
                            flex: 1,
                            minWidth: '220px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.55)',
                            lineHeight: '1.45',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {miniSummary}
                          </p>

                          <div className="topic-checkboxes" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button 
                              className={`chk-btn ${states.studied ? 'checked' : ''}`}
                              onClick={() => handleToggle(sIdx, tIdx, 'studied')}
                            >
                              {states.studied ? '✓ Estudado' : 'Estudar'}
                            </button>
                            <button 
                              className={`chk-btn ${states.revised ? 'checked-revision' : ''}`}
                              onClick={() => handleToggle(sIdx, tIdx, 'revised')}
                            >
                              {states.revised ? '✓ Revisado' : 'Revisar'}
                            </button>
                            <button 
                              className={`chk-btn ${states.exercises ? 'checked-questions' : ''}`}
                              onClick={() => handleToggle(sIdx, tIdx, 'exercises')}
                            >
                              {states.exercises ? '✓ Exercícios' : 'Exercícios'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* ADICIONAR TÓPICO / LEGISLAÇÃO MANUALMENTE NESTA MATÉRIA */}
                  {onUpdatePlan && (
                    <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <input 
                        type="text" 
                        placeholder="+ Adicionar tópico ou lei nesta matéria..."
                        className="text-input"
                        style={{ fontSize: '12px', padding: '6px 10px', flex: 1 }}
                        value={newTopicTexts[sIdx] || ''}
                        onChange={(e) => setNewTopicTexts({ ...newTopicTexts, [sIdx]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTopic(sIdx);
                        }}
                      />
                      <button 
                        onClick={() => handleAddTopic(sIdx)}
                        style={{
                          background: 'rgba(0, 240, 255, 0.12)',
                          color: 'var(--accent-cyan)',
                          border: '1px solid rgba(0, 240, 255, 0.25)',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        + Adicionar
                      </button>
                    </div>
                  )}

                  {/* BANNER DO SIMULADO GERAL DA DISCIPLINA */}
                  <div style={{
                    margin: '16px',
                    padding: '16px',
                    background: 'rgba(0, 240, 255, 0.02)',
                    border: '1px solid rgba(0, 240, 255, 0.15)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: '1', minWidth: '240px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-main)', fontWeight: 'bold' }}>
                        🏆 Simulado Geral de {subject.nome}
                      </h4>
                      <p style={{ margin: '0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Gere um simulado de 10 questões no estilo da banca. Ao terminar, receba um guia revisional automático com base nos seus erros!
                      </p>
                    </div>
                    <button
                      className="chk-btn"
                      onClick={() => handleStartSubjectSimulado(sIdx, subject.nome)}
                      style={{
                        background: 'var(--accent-gradient)',
                        border: 'none',
                        color: 'white',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: '0 0 8px rgba(0,240,255,0.2)'
                      }}
                    >
                      ✍️ Iniciar Simulado Geral (10Q)
                    </button>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ADICIONAR NOVA DISCIPLINA AO PLANO DE ESTUDOS */}
      {onUpdatePlan && (
        <div style={{ marginTop: '20px', padding: '16px 0', borderTop: '1px solid var(--border-glass)' }}>
          {showAddSubject ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Nome da disciplina (ex: Direito Previdenciário)..."
                className="text-input"
                style={{ fontSize: '13px', padding: '8px 12px', flex: '1', minWidth: '200px' }}
                value={newSubjectText}
                onChange={(e) => setNewSubjectText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubject();
                }}
              />
              <button 
                onClick={handleAddSubject}
                style={{
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Salvar Matéria
              </button>
              <button 
                onClick={() => setShowAddSubject(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAddSubject(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px dashed rgba(0, 240, 255, 0.3)',
                color: 'var(--accent-cyan)',
                borderRadius: '6px',
                padding: '10px 16px',
                width: '100%',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              ➕ Adicionar Outra Matéria ao Edital
            </button>
          )}
        </div>
      )}
    </div>
  );
}
