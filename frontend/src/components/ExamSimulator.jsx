import React, { useState } from 'react';
import { generateExercises } from '../services/api';

export default function ExamSimulator({ materias, cargo, apiKey, concursoKey }) {
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({}); // { questionIndex: selectedOption }
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const currentSubject = materias[selectedSubjectIndex] || null;

  const handleSubjectChange = (e) => {
    const idx = parseInt(e.target.value);
    setSelectedSubjectIndex(idx);
    setSelectedTopic('');
  };

  const handleStartSimulado = async () => {
    setLoading(true);
    setQuestions([]);
    setUserAnswers({});
    setScore({ correct: 0, total: 0 });
    
    try {
      const subjectName = currentSubject ? currentSubject.nome : '';
      const response = await generateExercises(cargo, subjectName, selectedTopic, apiKey);
      if (response && response.questoes) {
        setQuestions(response.questoes);
        setScore({ correct: 0, total: response.questoes.length });
      }
    } catch (error) {
      console.error("Erro ao gerar exercícios:", error);
      alert("Não foi possível gerar exercícios. Verifique sua conexão ou tente outra matéria.");
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para gerar hash SHA-256
  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Adiciona logs auditáveis ao localStorage para o PerformanceTracker
  const logAnswer = async (materiaName, isCorrect, num) => {
    // 1. Grava no histórico de acertos/erros
    const ansKey = `answers_${concursoKey}_${cargo}`;
    const savedAns = localStorage.getItem(ansKey);
    let answers = [];
    if (savedAns) {
      try { answers = JSON.parse(savedAns); } catch(e) {}
    }
    answers.push({
      materia: materiaName,
      isCorrect,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(ansKey, JSON.stringify(answers));

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
    const desc = `Resolveu questão #${num} de ${materiaName} - ${isCorrect ? 'ACERTO ✓' : 'ERRO ❌'}`;
    const hash = await sha256(`${index}${timestamp}${desc}${prev.hash}`);

    const newBlock = { index, timestamp, descricao: desc, previousHash: prev.hash, hash };
    localStorage.setItem(chainKey, JSON.stringify([...chain, newBlock]));
  };

  const handleSelectOption = (qIdx, option) => {
    if (userAnswers[qIdx] !== undefined) return;

    const correctOption = questions[qIdx].correta;
    const isCorrect = option === correctOption;

    setUserAnswers(prev => ({
      ...prev,
      [qIdx]: option
    }));

    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    }

    // Registra a resposta de forma assíncrona
    logAnswer(currentSubject.nome, isCorrect, qIdx + 1);
  };

  const getOptionClass = (qIdx, optionKey) => {
    const selected = userAnswers[qIdx];
    const correct = questions[qIdx].correta;

    if (selected === undefined) {
      return '';
    }

    if (optionKey === correct) {
      return 'correct';
    }

    if (selected === optionKey && selected !== correct) {
      return 'incorrect';
    }

    return 'disabled';
  };

  return (
    <div className="simulator-card glass-card animate-fade-in">
      <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Área de Simulados e Exercícios</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
        Gere questões de provas de concursos anteriores customizadas para a matéria que você está estudando hoje:
      </p>

      <div className="sim-selectors">
        <div className="sim-select-wrapper">
          <label>Selecione a Disciplina</label>
          <select 
            className="sim-select" 
            value={selectedSubjectIndex}
            onChange={handleSubjectChange}
          >
            {materias.map((m, idx) => (
              <option key={idx} value={idx}>{m.nome}</option>
            ))}
          </select>
        </div>

        <div className="sim-select-wrapper">
          <label>Selecione o Tópico (Opcional)</label>
          <select 
            className="sim-select" 
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            <option value="">-- Todos os Tópicos --</option>
            {currentSubject && currentSubject.topicos.map((t, idx) => (
              <option key={idx} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ textAlign: 'right', marginBottom: '32px' }}>
        <button 
          className="generate-btn" 
          onClick={handleStartSimulado} 
          disabled={loading}
        >
          {loading ? 'Preparando Questões com IA...' : '⚡ Gerar Simulados'}
        </button>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Elaborando questões personalizadas baseadas em provas de concursos anteriores...</p>
        </div>
      )}

      {questions.length > 0 && !loading && (
        <div className="questions-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-glass)' }}>
            <h4 style={{ color: 'var(--accent-cyan)' }}>Simulado Gerado</h4>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
              Pontuação: <span style={{ color: 'var(--accent-green)' }}>{score.correct}</span> / {score.total}
            </div>
          </div>

          {questions.map((q, qIdx) => {
            const isAnswered = userAnswers[qIdx] !== undefined;
            return (
              <div key={qIdx} className="question-block">
                <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                  QUESTÃO {qIdx + 1}
                </div>
                <div className="question-text">{q.enunciado}</div>
                
                <div className="options-list">
                  {Object.entries(q.alternativas).map(([key, val]) => (
                    <button 
                      key={key}
                      className={`option-btn ${getOptionClass(qIdx, key)}`}
                      onClick={() => handleSelectOption(qIdx, key)}
                      disabled={isAnswered}
                    >
                      <span className="option-letter">{key}</span>
                      <span>{val}</span>
                    </button>
                  ))}
                </div>

                {isAnswered && (
                  <div className="explanation-box animate-fade-in">
                    <h4>💡 Explicação da Resposta</h4>
                    <p>{q.explicacao}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
