import React, { useState, useEffect } from 'react';
import { uploadEdital, getMocks } from '../services/api';

export default function UploadPanel({ provider, apiKey, uploadedEditais, studyPlan, setView, onDeleteEdital, onCargoSelect, onEditalParsed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [demoExams, setDemoExams] = useState([]);

  useEffect(() => {
    // Carrega concursos demo para teste inicial
    const loadDemos = async () => {
      try {
        const mocks = await getMocks();
        setDemoExams(mocks);
      } catch (err) {
        console.error("Não foi possível carregar os exames demonstrativos:", err);
      }
    };
    loadDemos();
  }, []);

  const handleFileUpload = async (file) => {
    setLoading(true);
    setError(null);
    setCargos([]);
    try {
      const data = await uploadEdital(file, provider, apiKey);
      setExtractedData(data);
      setCargos(data.cargos || []);
      onEditalParsed(data);
    } catch (err) {
      setError(err.message || 'Erro ao processar arquivo. Verifique se o tamanho é menor que 15MB e se é um PDF/TXT válido.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleSelectDemo = (demo) => {
    // Simula o fluxo como se o edital tivesse sido processado
    const simulatedParsedData = {
      concurso: demo.concurso,
      banca: demo.banca,
      datas: demo.datas,
      cargos: demo.cargos,
      editalText: "Conteúdo simulado do concurso " + demo.concurso,
      isMock: true
    };
    setExtractedData(simulatedParsedData);
    setCargos(demo.cargos);
    onEditalParsed(simulatedParsedData);
  };

  const handleSelectHistory = (edital) => {
    setExtractedData(edital);
    setCargos(edital.cargos || []);
    onEditalParsed(edital);
  };

  return (
    <div className="animate-fade-in">
      {cargos.length === 0 ? (
        <>
          {/* BANNER DO PLANO DE ESTUDOS EM ANDAMENTO */}
          {studyPlan && (
            <div 
              className="active-plan-banner glass-card animate-fade-in"
              onClick={() => setView('dashboard')}
              style={{
                background: 'rgba(0, 240, 255, 0.06)',
                border: '1px solid rgba(0, 240, 255, 0.25)',
                padding: '16px 24px',
                borderRadius: '8px',
                marginBottom: '24px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 16px rgba(0, 240, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 240, 255, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 240, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.25)';
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
                  ⚡ Plano de Estudos Ativo (Salvo no Navegador)
                </span>
                <h4 style={{ margin: '4px 0 0 0', color: 'var(--text-main)', fontSize: '15px', fontWeight: '600' }}>
                  {studyPlan.concurso} - <span style={{ color: 'var(--accent-purple)' }}>{studyPlan.cargo}</span>
                </h4>
              </div>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Continuar Estudando →
              </span>
            </div>
          )}

          <div 
            className="upload-container"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('edital-file-input').click()}
          >
            <div className="upload-icon">📂</div>
            <h3 className="upload-title">Arraste seu edital em PDF aqui</h3>
            <p className="upload-desc">
              ou clique para selecionar do seu computador. O sistema irá ler o edital, 
              mapear os cargos e estruturar as matérias de estudo automaticamente.
            </p>
            <input 
              id="edital-file-input"
              type="file" 
              accept=".pdf,.txt" 
              style={{ display: 'none' }} 
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleFileUpload(file);
              }}
            />
            <button className="upload-btn">Escolher Arquivo</button>
          </div>

          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Analisando edital e estruturando dados...</p>
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--accent-red)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* HISTÓRICO DE EDITAIS ENVIADOS PELO USUÁRIO */}
          {uploadedEditais && uploadedEditais.length > 0 && !loading && (
            <div className="demo-section" style={{ marginTop: '40px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '32px' }}>
              <h4 className="demo-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🗂️ Seus Editais Enviados (Salvos localmente):
              </h4>
              <div className="demo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {uploadedEditais.map((edital, idx) => (
                  <div 
                    key={idx} 
                    className="demo-card glass-card"
                    onClick={() => handleSelectHistory(edital)}
                    style={{ position: 'relative', padding: '20px', border: '1px solid rgba(0, 240, 255, 0.15)' }}
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEdital(edital.concurso);
                      }}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(255, 56, 96, 0.1)',
                        border: 'none',
                        color: 'var(--accent-red)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        fontWeight: 'bold'
                      }}
                      title="Excluir histórico"
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 56, 96, 0.25)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255, 56, 96, 0.1)'}
                    >
                      ✕
                    </button>
                    <div className="demo-concurso" style={{ paddingRight: '20px', color: 'var(--text-main)', fontWeight: 'bold' }}>
                      {edital.concurso}
                    </div>
                    <div className="demo-banca" style={{ background: 'rgba(0, 240, 255, 0.08)', color: 'var(--accent-cyan)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginTop: '6px' }}>
                      {edital.banca || 'Banca Não Definida'}
                    </div>
                    <div className="demo-details" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{edital.cargos?.length || 0} cargo(s)</span>
                      <span>Prova: {edital.datas?.prova ? edital.datas.prova.split('-').reverse().join('/') : 'Ver edital'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {demoExams.length > 0 && !loading && (
            <div className="demo-section">
              <h4 className="demo-title">Ou selecione um concurso de demonstração para testar:</h4>
              <div className="demo-grid">
                {demoExams.map((demo) => (
                  <div 
                    key={demo.id} 
                    className="demo-card glass-card"
                    onClick={() => handleSelectDemo(demo)}
                  >
                    <div className="demo-concurso">{demo.concurso}</div>
                    <div className="demo-banca">{demo.banca}</div>
                    <div className="demo-details">
                      <span>{demo.cargos.length} cargo(s)</span>
                      <span>Prova: {demo.datas.prova.split('-').reverse().join('/')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="cargo-selection glass-card">
          <button 
            onClick={() => setCargos([])}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '16px'
            }}
          >
            ← Voltar para upload
          </button>
          <h3 className="cargo-title">Selecione o Cargo Pretendido</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
            Detectamos {cargos.length} cargo(s) descritos no edital. Escolha um para gerar seu cronograma e simulados específicos:
          </p>
          <div className="cargo-list">
            {cargos.map((cargo) => (
              <div 
                key={cargo.id} 
                className="cargo-card"
                onClick={() => onCargoSelect(cargo.nome)}
              >
                <div className="cargo-header">
                  <div className="cargo-name">{cargo.nome}</div>
                  <div style={{ color: 'var(--accent-cyan)', fontSize: '14px', fontWeight: 'bold' }}>→ Selecionar</div>
                </div>
                <div className="cargo-meta">
                  <span>Vagas: <strong>{cargo.vagas}</strong></span>
                  <span>Salário Inicial: <strong>{cargo.salario}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
