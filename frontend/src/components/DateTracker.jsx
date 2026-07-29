import React, { useState, useEffect } from 'react';
import { searchDates } from '../services/api';

export default function DateTracker({ dates, concursoName, banca, apiKey, onDatesUpdated, cargoDetails, cargoName }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Trunca texto longo
  const truncateText = (str, max) => {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  };

  // Formata data de YYYY-MM-DD para DD/MM/AAAA
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.includes('Não') || dateStr.includes('encontrada')) return 'Ver Edital';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Cálculo da contagem regressiva
  useEffect(() => {
    if (!dates || !dates.prova || dates.prova.includes('Não') || dates.prova.includes('encontrada')) return;

    const calculateTime = () => {
      const difference = +new Date(dates.prova + 'T00:00:00') - +new Date();
      let remaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        remaining = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      setTimeLeft(remaining);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [dates]);

  const handleSyncDates = async () => {
    setSyncing(true);
    setStatusMessage('');
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(`${concursoName} ${banca || ''} edital site oficial`)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setStatusMessage('Consulte as datas na fonte oficial aberta em outra aba.');
    setSyncing(false);
    return;
  };

  const isProvaValid = dates && dates.prova && !dates.prova.includes('Não') && !dates.prova.includes('encontrada');
  const finalCargoName = cargoDetails ? cargoDetails.nome : (cargoName || 'Cargo Geral');

  return (
    <div className="concurso-info-card glass-card animate-fade-in" style={{ padding: '20px' }}>
      
      {/* CABEÇALHO DO CARGO (Título Principal) */}
      <h3 className="concurso-name-title" style={{ fontSize: '16px', color: 'var(--accent-cyan)', fontWeight: 'bold', lineHeight: '1.4', margin: '0 0 4px 0' }}>
        💼 {finalCargoName}
      </h3>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {banca || 'Banca Não Definida'} | {truncateText(concursoName, 60)}
      </div>

      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
        
        {/* FICHA TÉCNICA DO CARGO (Vagas, Salário, Requisitos, Locais) */}
        {cargoDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>Vagas:</span>
                <p style={{ color: 'var(--text-main)', fontWeight: '600', marginTop: '2px' }}>{cargoDetails.vagas}</p>
              </div>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>Salário:</span>
                <p style={{ color: 'var(--text-main)', fontWeight: '600', marginTop: '2px' }}>{cargoDetails.salario}</p>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>Requisitos:</span>
              <p style={{ color: 'var(--text-main)', marginTop: '2px', lineHeight: '1.3' }}>{cargoDetails.requisitos}</p>
            </div>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>Locais de Prova:</span>
              <p style={{ color: 'var(--text-main)', marginTop: '2px', lineHeight: '1.3' }}>{cargoDetails.locais_prova}</p>
            </div>
            {cargoDetails.taf && 
             cargoDetails.taf.toLowerCase() !== 'não exigido' && 
             cargoDetails.taf.toLowerCase() !== 'não se aplica' && 
             cargoDetails.taf.toLowerCase() !== 'não' && (
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>🏃‍♂️ Teste Físico (TAF):</span>
                <p style={{ color: 'var(--accent-purple)', fontWeight: '600', marginTop: '2px', lineHeight: '1.3' }}>{cargoDetails.taf}</p>
              </div>
            )}
          </div>
        )}

        {/* DATAS CRÍTICAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '14px', fontSize: '13px' }}>
          <div className="date-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="date-label" style={{ color: 'var(--text-muted)' }}>📝 Inscrições:</span>
            <span className="date-value" style={{ fontWeight: '600', color: 'var(--text-main)' }}>
              {formatDate(dates.inscricao_inicio)} a {formatDate(dates.inscricao_fim)}
            </span>
          </div>
          <div className="date-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="date-label" style={{ color: 'var(--text-muted)' }}>📅 Prova Objetiva:</span>
            <span className="date-value" style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
              {formatDate(dates.prova)}
            </span>
          </div>
        </div>
      </div>

      {/* CONTAGEM REGRESSIVA */}
      {isProvaValid ? (
        <div className="countdown-box" style={{ marginTop: '16px' }}>
          <div className="countdown-title">Tempo até a Prova</div>
          <div className="countdown-numbers">
            <div className="countdown-item">
              <span className="countdown-val">{timeLeft.days}</span>
              <span className="countdown-lbl">Dias</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-val">{timeLeft.hours}</span>
              <span className="countdown-lbl">Horas</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-val">{timeLeft.minutes}</span>
              <span className="countdown-lbl">Mins</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-val">{timeLeft.seconds}</span>
              <span className="countdown-lbl">Segs</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="countdown-box" style={{ marginTop: '16px', background: 'rgba(255, 56, 96, 0.03)', borderColor: 'rgba(255, 56, 96, 0.15)' }}>
          <div className="countdown-title" style={{ color: 'var(--accent-red)' }}>Contagem Regressiva Indisponível</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Data da prova não definida ou em formato inválido.</p>
        </div>
      )}

      {/* BOTÕES DE AÇÃO */}
      {dates.link_inscricao && (
        <a 
          href={dates.link_inscricao} 
          target="_blank" 
          rel="noopener noreferrer"
          className="sync-btn"
          style={{ 
            display: 'block', 
            textDecoration: 'none', 
            textAlign: 'center', 
            marginTop: '16px',
            background: 'var(--accent-gradient)',
            color: 'white',
            fontWeight: 'bold',
            border: 'none',
            boxShadow: 'var(--shadow-glow)'
          }}
        >
          📝 Página de Inscrição Oficial
        </a>
      )}

      <button 
        className="sync-btn" 
        onClick={handleSyncDates} 
        disabled={syncing}
        style={{ marginTop: dates.link_inscricao ? '10px' : '16px' }}
      >
        {syncing ? 'Pesquisando na web...' : '🔍 Buscar datas na web'}
      </button>
      
      {statusMessage && (
        <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '8px', color: statusMessage.includes('✓') ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          {statusMessage}
        </p>
      )}
    </div>
  );
}
