import React, { useState, useEffect } from 'react';
import { generateSummary } from '../services/api';

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

const cleanRevisaoText = (text) => {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    // Remove cabeçalhos de flashcard
    if (/(?:flashcard|deck)/i.test(trimmed) && /^(?:##|###|\*|\-)/.test(trimmed)) {
      return false;
    }
    // Remove linhas com estrutura de cards (ex: card 1, frente:, verso:, frente**:, verso**:)
    if (/(?:card\s*\d+|frente\s*\**\s*:|\bverso\s*\**\s*:)/i.test(trimmed)) {
      return false;
    }
    return true;
  });
  return filteredLines.join('\n');
};

export default function TopicStudyPage({ topicDetails, cargo, concursoKey, provider, apiKey, banca, onBack, progress, handleToggle }) {
  const { subjectIndex, topicIndex, subjectName, topicName } = topicDetails;
  
  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const logQuizAnswer = async (qId, isCorrect) => {
    if (!concursoKey) return;
    const ansKey = `answers_${concursoKey}_${cargo}`;
    const savedAns = localStorage.getItem(ansKey);
    let answers = [];
    if (savedAns) {
      try { answers = JSON.parse(savedAns); } catch(e) {}
    }
    answers.push({
      materia: subjectName,
      isCorrect,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(ansKey, JSON.stringify(answers));

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
    const desc = `Resolveu questão #${qId} do mini-simulado de ${topicName} (${subjectName}) - ${isCorrect ? 'ACERTO ✓' : 'ERRO ❌'}`;
    const hash = await sha256(`${index}${timestamp}${desc}${prev.hash}`);

    const newBlock = { index, timestamp, descricao: desc, previousHash: prev.hash, hash };
    localStorage.setItem(chainKey, JSON.stringify([...chain, newBlock]));
  };
  
  const [activeTab, setActiveTab] = useState('explicador'); // 'explicador' | 'revisao' | 'plano' | 'simulado'
  const [summaryCache, setSummaryCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados dos Flashcards
  const [flippedCards, setFlippedCards] = useState({});

  // Estados do Plano de 7 Dias (checklists diários)
  const [completedDays, setCompletedDays] = useState({});

  // Estados do Simulado Interativo
  const [quizAnswers, setQuizAnswers] = useState({}); // { questionIndex: 'A' }
  const [quizSubmitted, setQuizSubmitted] = useState({}); // { questionIndex: true }

  // Carrega a aba inicial ao montar
  // Limpa estados e cache ao trocar de tópico
  useEffect(() => {
    setSummaryCache({});
    setFlippedCards({});
    setCompletedDays({});
    setQuizAnswers({});
    setQuizSubmitted({});
    setActiveTab('explicador');
  }, [topicDetails]);

  const loadTabContent = async (tabToLoad) => {
    const targetTab = tabToLoad || activeTab;
    if (!topicName) return;

    setLoading(true);
    setError('');
    try {
      const data = await generateSummary(cargo, subjectName, topicName, targetTab, banca, provider, apiKey);
      if (data && data.summary) {
        setSummaryCache(prev => ({
          ...prev,
          [targetTab]: data.summary
        }));
      } else {
        throw new Error('Resposta do servidor em formato inválido.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar o conteúdo teórico. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Carrega conteúdo dinamicamente com base no cache do tópico ativo
  useEffect(() => {
    if (topicName && !summaryCache[activeTab] && !loading) {
      loadTabContent(activeTab);
    }
  }, [topicName, activeTab, summaryCache]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const key = `${subjectIndex}_${topicIndex}`;
  const states = progress[key] || { studied: false, revised: false, exercises: false };

  // Parser de Markdown Básico para didática
  const parseMarkdownToHtml = (text) => {
    if (!text) return '';
    
    // Garantia de tipo string para proteção contra erros do servidor
    let stringText = text;
    if (typeof stringText !== 'string') {
      try {
        stringText = String(stringText);
      } catch (e) {
        return '';
      }
    }
    
    // Escapa caracteres HTML
    let escaped = stringText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    const lines = escaped.split(/\r?\n/);
    let html = '';
    let inList = false;
    let inParagraph = false;

    lines.forEach(line => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('#')) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inParagraph) { html += '</p>'; inParagraph = false; }

        const level = (trimmed.match(/^#+/) || ['#'])[0].length;
        const content = trimmed.replace(/^#+\s*/, '');
        html += `<h${level}>${content}</h${level}>`;
        return;
      }

      // Horizontal rule
      if (trimmed === '---') {
        if (inList) { html += '</ul>'; inList = false; }
        if (inParagraph) { html += '</p>'; inParagraph = false; }
        html += '<hr/>';
        return;
      }

      // List items
      const listMatch = line.match(/^(\s*)(?:\*|\-)\s+(.*)/);
      if (listMatch) {
        if (inParagraph) { html += '</p>'; inParagraph = false; }
        if (!inList) { html += '<ul>'; inList = true; }
        
        const indent = listMatch[1].length;
        const content = listMatch[2];
        const style = indent > 0 ? ` style="padding-left: ${indent * 8}px; list-style-type: circle;"` : '';
        html += `<li${style}>${content}</li>`;
        return;
      }

      // Empty line
      if (trimmed === '') {
        if (inList) { html += '</ul>'; inList = false; }
        if (inParagraph) { html += '</p>'; inParagraph = false; }
        return;
      }

      // Regular text
      if (inList) { html += '</ul>'; inList = false; }
      
      if (!inParagraph) {
        html += '<p>';
        inParagraph = true;
        html += trimmed;
      } else {
        html += ' ' + trimmed;
      }
    });

    if (inList) html += '</ul>';
    if (inParagraph) html += '</p>';

    // Substituições em linha
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    return html;
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    let html = parseMarkdownToHtml(text);
    
    html = html.replace(
      /<h3>⚠️?\s*O Erro Mais Comum<\/h3>([\s\S]*?)(?=<h3>|$)/gi, 
      '<div class="warning-callout"><h3>⚠️ O Erro Mais Comum</h3>$1</div>'
    );
    
    html = html.replace(
      /<h3>📌?\s*5 Pontos Principais[^<]*<\/h3>([\s\S]*?)(?=<h3>|$)/gi, 
      '<div class="points-callout"><h3>📌 5 Pontos Principais de Fixação</h3>$1</div>'
    );
    
    html = html.replace(
      /<h3>✨?\s*Versão Ultra Resumida<\/h3>([\s\S]*?)(?=<h3>|$)/gi, 
      '<div class="summary-callout"><h3>✨ Versão Ultra Resumida</h3>$1</div>'
    );
    
    return `<div class="markdown-body">${html}</div>`;
  };

  // Parser avançado para extrair Flashcards de Revisão Ativa
  const parseFlashcards = (mdText) => {
    if (!mdText) return [];
    const flashcards = [];
    const normalizeQuestion = (text) => text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const stopWords = new Set(['a', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'o', 'os', 'qual', 'que', 'uma']);
    const isDuplicate = (front) => {
      const candidate = normalizeQuestion(front).filter(word => !stopWords.has(word));
      const candidateIntent = candidate.slice(0, 2).join(' ');
      return flashcards.some(card => {
        const existing = normalizeQuestion(card.front).filter(word => !stopWords.has(word));
        const existingIntent = existing.slice(0, 2).join(' ');
        const shared = candidate.filter(word => existing.includes(word)).length;
        const overlap = shared / Math.max(candidate.length, existing.length, 1);
        return candidateIntent && candidateIntent === existingIntent && overlap >= 0.5;
      });
    };
    
    // Procura por campos "FRENTE" e "VERSO" de forma insensível a maiúsculas e tags negrito
    const frontRegex = /(?:\*|\-)?\s*(?:\*\*)?FRENTE(?:\*\*)?\s*:\s*(.*?)(?=\r?\n|$)/gi;
    const backRegex = /(?:\*|\-)?\s*(?:\*\*)?VERSO(?:\*\*)?\s*:\s*(.*?)(?=\r?\n|$)/gi;
    
    const fronts = [];
    const backs = [];
    
    let match;
    while ((match = frontRegex.exec(mdText)) !== null) {
      fronts.push(match[1].trim());
    }
    
    backRegex.lastIndex = 0;
    while ((match = backRegex.exec(mdText)) !== null) {
      backs.push(match[1].trim());
    }
    
    const count = Math.min(fronts.length, backs.length);
    for (let i = 0; i < count; i++) {
      if (!isDuplicate(fronts[i])) {
        flashcards.push({
          id: flashcards.length + 1,
          front: fronts[i],
          back: backs[i]
        });
      }
    }

    if (flashcards.length === 0) {
      flashcards.push(
        { id: 1, front: 'Qual o conceito chave de ' + topicName + '?', back: 'Consulte a aba de Explicação Didática para revisar as regras fundamentais.' },
        { id: 2, front: 'Quais as principais exceções ou pegadinhas deste assunto?', back: 'As bancas adoram cobrar restrições e palavras absolutistas (sempre, nunca).' }
      );
    }
    return flashcards;
  };

  // Parser avançado para extrair Dias de Cronograma do Plano de 7 Dias
  const parsePlanoDays = (mdText) => {
    if (!mdText) return [];
    const days = [];
    
    const dayRegex = /(?:\*|\-)?\s*\*\*(Dia\s*\d+)\s*:\s*(.*?)\*\*(.*?)(?=(?:\*|\-)?\s*\*\*Dia\s*\d+|$)/gis;
    
    let match;
    while ((match = dayRegex.exec(mdText)) !== null) {
      days.push({
        day: match[1].trim(),
        title: match[2].trim(),
        content: match[3].trim()
      });
    }

    return days;
  };

  // Parser avançado para extrair as Questões do Simulado
  const parseQuestions = (mdText) => {
    if (!mdText) return [];
    const questions = [];
    
    const segments = mdText.split(/###\s*(?:QUESTÃO|Questão|Questao)\s*\d+/gi);
    if (segments.length <= 1) return [];

    const gabaritoMatch = mdText.match(/(?:Gabarito Comentado|GABARITO|🔑 Gabarito Comentado)[\s\S]*/i);
    const gabaritoText = gabaritoMatch ? gabaritoMatch[0] : "";

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      const lines = seg.split('\n');
      let questionBody = "";
      const options = {};

      lines.forEach(line => {
        const optionMatch = line.match(/^\s*[-\*]?\s*([A-E])\)\s*(.*)/i);
        if (optionMatch) {
          options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
        } else if (Object.keys(options).length === 0) {
          const cleanLine = line.trim();
          if (cleanLine && !cleanLine.startsWith('#') && !cleanLine.includes('Gabarito')) {
            questionBody += line + '\n';
          }
        }
      });

      let correct = 'A';
      const correctRegexes = [
        new RegExp(`(?:Questão|QUESTÃO)\\s*${i}\\s*:\\s*(?:Alternativa\\s*Correta\\s*:\\s*)?([A-E])`, 'i'),
        new RegExp(`(?:Questão|QUESTÃO)\\s*${i}[^A-E]*([A-E])`, 'i'),
        new RegExp(`QUESTÃO\\s*${i}\\s*:\\s*Alternativa\\s*Correta\\s*:\\s*([A-E])`, 'i'),
        new RegExp(`QUESTÃO\\s*${i}\\s*.*?([A-E])`, 'i')
      ];
      
      for (const regex of correctRegexes) {
        const m = gabaritoText.match(regex);
        if (m) {
          correct = m[1].toUpperCase();
          break;
        }
      }

      let explanation = "Gabarito comentado contendo as fundamentações teóricas.";
      const explStart = gabaritoText.search(new RegExp(`(?:Questão|QUESTÃO)\\s*${i}`, 'i'));
      if (explStart !== -1) {
        const remainingGabarito = gabaritoText.substring(explStart);
        const nextExplStart = remainingGabarito.slice(15).search(new RegExp(`(?:Questão|QUESTÃO)\\s*${i+1}`, 'i'));
        if (nextExplStart !== -1) {
          explanation = remainingGabarito.substring(0, nextExplStart + 15).replace(/^(?:Questão|QUESTÃO)\s*\d+.*?\n/gi, '').trim();
        } else {
          explanation = remainingGabarito.replace(/^(?:Questão|QUESTÃO)\s*\d+.*?\n/gi, '').trim();
        }
      }

      if (questionBody.trim() && Object.keys(options).length > 0) {
        questions.push({
          id: i,
          body: questionBody.trim(),
          options,
          correct,
          explanation
        });
      }
    }

    return questions;
  };

  const parsedQuestions = activeTab === 'simulado' ? parseQuestions(summaryCache['simulado']) : [];
  const parsedFlashcards = activeTab === 'revisao' ? parseFlashcards(summaryCache['revisao']) : [];
  const parsedPlanoDays = activeTab === 'plano' ? parsePlanoDays(summaryCache['plano']) : [];

  // Extrai o bloco "O que priorizar"
  const getPrioridadeSection = () => {
    if (activeTab !== 'plano' || !summaryCache['plano']) return '';
    const match = summaryCache['plano'].match(/(?:O que Priorizar|Focos Quentes|Prioridades)[\s\S]*/i);
    return match ? match[0] : '';
  };
  const prioridadeContent = getPrioridadeSection();

  return (
    <div className="study-page-container animate-fade-in" style={{ padding: '16px 0', width: '100%', margin: '0 auto' }}>
      
      <style>{`
        .study-breadcrumb {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .study-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 24px;
        }
        .study-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-main);
          margin: 6px 0;
        }
        .back-link {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-glass);
          color: var(--text-muted);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .back-link:hover {
          color: var(--text-main);
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
        }
        .study-nav-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--border-glass);
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .study-tab-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .study-tab-btn:hover {
          color: var(--text-main);
        }
        .study-tab-btn.active {
          color: var(--accent-cyan);
          border-bottom-color: var(--accent-cyan);
        }
        .study-content-panel {
          min-height: 400px;
          padding: 32px;
          line-height: 1.6;
          background: rgba(10, 14, 26, 0.4);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
        }
        
        /* 1. Estilizações Markdown Premium */
        .markdown-body h1 {
          font-size: 24px;
          color: var(--accent-cyan);
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(0, 240, 255, 0.2);
          padding-bottom: 10px;
          font-weight: 700;
        }
        .markdown-body h2 {
          font-size: 19px;
          color: var(--accent-purple);
          margin-top: 28px;
          margin-bottom: 14px;
          font-weight: 600;
        }
        .markdown-body h3 {
          font-size: 16px;
          color: var(--text-main);
          margin-top: 20px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .markdown-body p {
          margin-bottom: 16px;
          color: rgba(255,255,255,0.9);
          font-size: 15.5px;
          line-height: 1.7;
        }
        .markdown-body ul {
          padding-left: 20px;
          margin-bottom: 20px;
        }
        .markdown-body li {
          margin-bottom: 8px;
          list-style-type: square;
          color: rgba(255,255,255,0.85);
          font-size: 15px;
          line-height: 1.6;
        }
        .markdown-body strong {
          color: var(--accent-cyan);
          font-weight: bold;
        }
        .markdown-body hr {
          border: 0;
          height: 1px;
          background: var(--border-glass);
          margin: 32px 0;
        }
        .markdown-body code {
          background: rgba(255,255,255,0.08);
          color: #ff79c6;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 13px;
        }

        /* Callouts Customizados Didática */
        .warning-callout {
          background: rgba(239, 83, 80, 0.04);
          border-left: 4px solid #ef5350;
          padding: 18px 22px;
          border-radius: 0 8px 8px 0;
          margin: 24px 0;
          box-shadow: 0 4px 12px rgba(239, 83, 80, 0.05);
        }
        .warning-callout h3 {
          margin-top: 0;
          color: #ef5350;
          font-size: 15px;
          font-weight: 700;
        }
        .points-callout {
          background: rgba(0, 240, 255, 0.03);
          border-left: 4px solid var(--accent-cyan);
          padding: 18px 22px;
          border-radius: 0 8px 8px 0;
          margin: 24px 0;
        }
        .points-callout h3 {
          margin-top: 0;
          color: var(--accent-cyan);
          font-size: 15px;
          font-weight: 700;
        }
        .summary-callout {
          background: rgba(179, 136, 255, 0.03);
          border-left: 4px solid var(--accent-purple);
          padding: 18px 22px;
          border-radius: 0 8px 8px 0;
          margin: 24px 0;
        }
        .summary-callout h3 {
          margin-top: 0;
          color: var(--accent-purple);
          font-size: 15px;
          font-weight: 700;
        }

        /* 2. Estilizações do Flashcard (Flipping 3D) */
        .flashcards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }
        .flashcard {
          height: 190px;
          perspective: 1000px;
          cursor: pointer;
        }
        .flashcard-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-style: preserve-3d;
        }
        .flashcard.flipped .flashcard-inner {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 10px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }
        .card-front {
          background: linear-gradient(135deg, rgba(16, 24, 48, 0.95), rgba(24, 34, 68, 0.95));
          border: 1px solid rgba(0, 240, 255, 0.25);
          color: var(--text-main);
        }
        .card-back {
          background: linear-gradient(135deg, rgba(32, 16, 60, 0.95), rgba(52, 24, 90, 0.95));
          border: 1px solid rgba(179, 136, 255, 0.25);
          color: var(--text-main);
          transform: rotateY(180deg);
        }

        /* 3. Estilizações do Plano de 7 Dias */
        .timeline-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-top: 24px;
        }
        .timeline-card {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-glass);
          border-radius: 8px;
          padding: 20px;
          transition: all 0.2s ease;
        }
        .timeline-card.completed {
          border-color: rgba(76, 175, 80, 0.4);
          background: rgba(76, 175, 80, 0.02);
        }
        .day-badge {
          background: var(--accent-gradient);
          color: white;
          font-weight: 700;
          font-size: 12px;
          padding: 5px 12px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }
        .day-badge.completed {
          background: #4caf50;
        }

        /* 4. Estilizações do Simulado Interativo */
        .quiz-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-glass);
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .option-btn {
          width: 100%;
          text-align: left;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-main);
          padding: 14px 18px;
          border-radius: 6px;
          margin-top: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .option-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.15);
        }
        .option-btn.selected-correct {
          background: rgba(76, 175, 80, 0.15) !important;
          border-color: rgba(76, 175, 80, 0.5) !important;
          color: #81c784 !important;
          font-weight: 600;
        }
        .option-btn.selected-incorrect {
          background: rgba(244, 67, 54, 0.15) !important;
          border-color: rgba(244, 67, 54, 0.5) !important;
          color: #e57373 !important;
          font-weight: 600;
        }
        .option-btn.correct-highlight {
          background: rgba(76, 175, 80, 0.08) !important;
          border-color: rgba(76, 175, 80, 0.3) !important;
          color: #81c784 !important;
        }
      `}</style>

      {/* Breadcrumbs */}
      <div className="study-breadcrumb">
        <span style={{ cursor: 'pointer' }} onClick={onBack}>Área de Estudos</span>
        <span>/</span>
        <span style={{ color: 'var(--text-muted)' }}>{subjectName}</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)' }}>{topicName}</span>
      </div>

      {/* Topo do Header */}
      <div className="study-header">
        <div>
          <button className="back-link" onClick={onBack}>
            ← Voltar para Matérias
          </button>
          <h2 className="study-title">{topicName}</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Disciplina: <strong>{subjectName}</strong> | Cargo: <strong>{cargo}</strong></span>
        </div>

        {/* Checkbox Checklist Progresso Geral do Tópico */}
        <div className="topic-checkboxes" style={{ background: 'rgba(10, 15, 30, 0.6)', padding: '12px 18px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Status da Ementa
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`chk-btn ${states.studied ? 'checked' : ''}`}
              onClick={() => handleToggle(subjectIndex, topicIndex, 'studied')}
            >
              {states.studied ? '✓ Estudado' : 'Estudar'}
            </button>
            <button 
              className={`chk-btn ${states.revised ? 'checked-revision' : ''}`}
              onClick={() => handleToggle(subjectIndex, topicIndex, 'revised')}
            >
              {states.revised ? '✓ Revisado' : 'Revisar'}
            </button>
            <button 
              className={`chk-btn ${states.exercises ? 'checked-questions' : ''}`}
              onClick={() => handleToggle(subjectIndex, topicIndex, 'exercises')}
            >
              {states.exercises ? '✓ Exercícios' : 'Exercícios'}
            </button>
          </div>
        </div>
      </div>

      {/* Abas Metodológicas */}
      <div className="study-nav-tabs">
        <button 
          className={`study-tab-btn ${activeTab === 'explicador' ? 'active' : ''}`}
          onClick={() => handleTabChange('explicador')}
        >
          📚 Didática Simples
        </button>
        <button 
          className={`study-tab-btn ${activeTab === 'revisao' ? 'active' : ''}`}
          onClick={() => handleTabChange('revisao')}
        >
          🧠 Revisão Ativa
        </button>
        <button 
          className={`study-tab-btn ${activeTab === 'plano' ? 'active' : ''}`}
          onClick={() => handleTabChange('plano')}
        >
          📅 Plano 7 Dias
        </button>
        <button 
          className={`study-tab-btn ${activeTab === 'simulado' ? 'active' : ''}`}
          onClick={() => handleTabChange('simulado')}
        >
          ✍️ Mini-Simulado Interativo (10Q)
        </button>
      </div>

      {/* Painel Central de Estudo */}
      <div className="study-content-panel glass-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-muted)' }}>
              {provider === 'offline' 
                ? 'Estruturando apostila teórica no modo offline local...' 
                : `Organizando recursos pedagógicos do modo ${activeTab}...`}
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--accent-red)' }}>
            <p>{error}</p>
            <button className="sync-btn" onClick={() => loadTabContent(activeTab)} style={{ display: 'inline-block', width: 'auto', marginTop: '16px' }}>
              Tentar Recarregar
            </button>
          </div>
        ) : (
          <div>
            
            {/* 1. ABA DIDÁTICA SIMPLES */}
            {activeTab === 'explicador' && summaryCache['explicador'] && (
              <div>
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(summaryCache['explicador']) }} />

                {/* SEÇÃO DE VIDEOAULAS DO YOUTUBE RECOMENDADAS */}
                <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-glass)', paddingTop: '28px' }}>
                  <h3 style={{ color: 'var(--accent-cyan)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
                    <span>📺</span> Videoaulas Recomendadas (YouTube)
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                    Selecione uma aula recomendada abaixo para assistir a resoluções e explicações detalhadas sobre <strong>{topicName}</strong>:
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + ' ' + subjectName + ' concurso publico aula completa')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="timeline-card"
                      style={{ 
                        textDecoration: 'none', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '16px',
                        background: 'rgba(255, 0, 0, 0.02)',
                        border: '1px solid rgba(255, 0, 0, 0.15)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 0, 0, 0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.15)';
                      }}
                    >
                      <span className="day-badge" style={{ background: '#ff0000', fontSize: '10px' }}>▶ Aula Completa</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
                        Teoria Completa e Passo a Passo
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pesquisar no YouTube →</span>
                    </a>

                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + ' ' + subjectName + ' questoes resolvidas concurso')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="timeline-card"
                      style={{ 
                        textDecoration: 'none', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '16px',
                        background: 'rgba(255, 0, 0, 0.02)',
                        border: '1px solid rgba(255, 0, 0, 0.15)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 0, 0, 0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.15)';
                      }}
                    >
                      <span className="day-badge" style={{ background: '#ff0000', fontSize: '10px' }}>✍️ Questões Comentadas</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
                        Questões de Provas da Banca
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pesquisar no YouTube →</span>
                    </a>

                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + ' ' + subjectName + ' pegadinhas macetes concurso')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="timeline-card"
                      style={{ 
                        textDecoration: 'none', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '16px',
                        background: 'rgba(255, 0, 0, 0.02)',
                        border: '1px solid rgba(255, 0, 0, 0.15)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 0, 0, 0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.15)';
                      }}
                    >
                      <span className="day-badge" style={{ background: '#ff0000', fontSize: '10px' }}>⚡ Dicas Rápidas</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
                        Pegadinhas Comuns & Macetes de Prova
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pesquisar no YouTube →</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ABA REVISÃO ATIVA */}
            {activeTab === 'revisao' && summaryCache['revisao'] && (
              <div>
                {/* Doutrina / Conceitos Iniciais sem a poluição do deck de flashcards em texto */}
                <div className="markdown-body" dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(cleanRevisaoText(summaryCache['revisao'])) 
                }} />

                {/* Grid de Flashcards 3D interativos */}
                {parsedFlashcards.length > 0 && (
                  <div style={{ marginTop: '36px', borderTop: '1px solid var(--border-glass)', paddingTop: '28px' }}>
                    <h3 style={{ color: 'var(--accent-cyan)', fontSize: '18px', marginBottom: '4px', fontWeight: 'bold' }}>🧠 Flashcards Interativos (Fixação de Termos)</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                      Clique no card para revelar a resposta.
                    </p>
                    <div className="flashcards-grid">
                      {parsedFlashcards.map(card => {
                        const isFlipped = flippedCards[card.id];
                        return (
                          <div 
                            key={card.id} 
                            className={`flashcard ${isFlipped ? 'flipped' : ''}`}
                            onClick={() => setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                          >
                            <div className="flashcard-inner">
                              <div className="card-front" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <p style={{ fontSize: '14px', fontWeight: '600', lineHeight: '1.6', margin: '0', textAlign: 'center', color: '#ffffff' }}>
                                    {renderTextWithBold(card.front)}
                                  </p>
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '12px' }}>
                                  💡 Pergunta
                                </span>
                              </div>
                              <div className="card-back" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <p style={{ fontSize: '13px', fontWeight: '500', lineHeight: '1.6', color: '#a0aec0', margin: '0', textAlign: 'center' }}>
                                    {renderTextWithBold(card.back)}
                                  </p>
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--accent-purple)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '12px' }}>
                                  🔑 Resposta / Explicação
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. ABA PLANO 7 DIAS */}
            {activeTab === 'plano' && summaryCache['plano'] && (
              <div>
                {parsedPlanoDays.length > 0 ? (
                  <div>
                    <h3 style={{ color: 'var(--accent-cyan)', fontSize: '18px', marginBottom: '4px', fontWeight: 'bold' }}>📅 Cronograma Semanal de Fixação</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
                      Acompanhe o cronograma sugerido de 30-45 minutos por dia e marque os dias concluídos para controle.
                    </p>

                    <div className="timeline-grid">
                      {parsedPlanoDays.map((d, index) => {
                        const isDone = completedDays[d.day];
                        return (
                          <div key={index} className={`timeline-card ${isDone ? 'completed' : ''}`}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className={`day-badge ${isDone ? 'completed' : ''}`}>
                                  {isDone ? '✓ ' + d.day : d.day}
                                </span>
                                <button
                                  onClick={() => setCompletedDays(prev => ({ ...prev, [d.day]: !prev[d.day] }))}
                                  style={{
                                    background: isDone ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${isDone ? '#4caf50' : 'var(--border-glass)'}`,
                                    color: isDone ? '#4caf50' : 'var(--text-muted)',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isDone ? 'Dia Concluído' : 'Marcar Concluído'}
                                </button>
                              </div>
                              <h4 style={{ margin: '4px 0', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>
                                {d.title}
                              </h4>
                              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: '0', whiteSpace: 'pre-line' }}>
                                {d.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Exibe O que Priorizar se houver */}
                    {prioridadeContent && (
                      <div className="summary-callout" style={{ marginTop: '28px' }}>
                        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(prioridadeContent) }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(summaryCache['plano']) }} />
                )}
              </div>
            )}

            {/* 4. ABA MINI-SIMULADO INTERATIVO */}
            {activeTab === 'simulado' && summaryCache['simulado'] && (
              <div>
                {parsedQuestions.length > 0 ? (
                  <div>
                    <h3 style={{ color: 'var(--accent-cyan)', fontSize: '18px', marginBottom: '4px', fontWeight: 'bold' }}>✍️ Mini-Simulado de Fixação</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
                      Responda às questões e valide seu raciocínio com as correções fundamentadas.
                    </p>

                    <div className="quiz-list">
                      {parsedQuestions.map((q) => {
                        const selectedOption = quizAnswers[q.id];
                        const submitted = quizSubmitted[q.id];

                        return (
                          <div key={q.id} className="quiz-card">
                            <span style={{ fontSize: '11px', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)', padding: '3px 8px', borderRadius: '4px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                              Questão {q.id}
                            </span>
                            <p style={{ fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.95)', marginTop: '12px', whiteSpace: 'pre-line' }}>
                              {renderTextWithBold(q.body)}
                            </p>

                            <div style={{ marginTop: '16px' }}>
                              {Object.entries(q.options).map(([optCode, optText]) => {
                                const isSelected = selectedOption === optCode;
                                const isCorrect = q.correct === optCode;
                                
                                let btnClass = "option-btn";
                                if (submitted) {
                                  if (isSelected && isCorrect) btnClass += " selected-correct";
                                  else if (isSelected && !isCorrect) btnClass += " selected-incorrect";
                                  else if (isCorrect) btnClass += " correct-highlight";
                                } else if (isSelected) {
                                  btnClass += " selected-correct"; 
                                }

                                return (
                                  <button
                                    key={optCode}
                                    className={btnClass}
                                    disabled={submitted}
                                    onClick={() => {
                                      const isCorrect = optCode === q.correct;
                                      setQuizAnswers(prev => ({ ...prev, [q.id]: optCode }));
                                      setQuizSubmitted(prev => ({ ...prev, [q.id]: true }));
                                      logQuizAnswer(q.id, isCorrect);
                                    }}
                                  >
                                    <strong>{optCode})</strong> {renderTextWithBold(optText)}
                                  </button>
                                );
                              })}
                            </div>

                            {submitted && (
                              <div className="animate-fade-in" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255, 255, 255, 0.015)', borderLeft: `4px solid ${selectedOption === q.correct ? '#4caf50' : '#f44336'}`, borderRadius: '0 8px 8px 0' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: selectedOption === q.correct ? '#81c784' : '#e57373', marginBottom: '6px' }}>
                                  {selectedOption === q.correct ? '✓ RESPOSTA CORRETA' : `✗ RESPOSTA INCORRETA (Gabarito: ${q.correct})`}
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0', lineHeight: '1.5' }}>
                                  <strong>Justificativa:</strong> {renderTextWithBold(q.explanation)}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(summaryCache['simulado']) }} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Roda-pé de Ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
        <button className="back-link" onClick={onBack}>
          ← Voltar para Matérias
        </button>

        {!loading && !error && (
          <button
            onClick={() => {
              if (!states.studied) {
                handleToggle(subjectIndex, topicIndex, 'studied');
              }
              onBack();
            }}
            className="chk-btn checked"
            style={{ background: 'var(--accent-gradient)', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', boxShadow: 'var(--shadow-glow)' }}
          >
            ✓ Concluir Estudo & Marcar Concluído
          </button>
        )}
      </div>
    </div>
  );
}
