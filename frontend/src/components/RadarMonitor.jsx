import React, { useState, useEffect } from 'react';
import { uploadConcursoPrint, checkConcursoUpdate } from '../services/api';

export default function RadarMonitor({ provider, apiKey, setView, onInitPlanWithMock }) {
  const [monitoredExams, setMonitoredExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Form states para cadastro manual
  const [manualConcurso, setManualConcurso] = useState('');
  const [manualStatus, setManualStatus] = useState('Anunciado');
  const [manualBanca, setManualBanca] = useState('A definir');
  const [manualVagas, setManualVagas] = useState('A definir');
  const [manualSalario, setManualSalario] = useState('A definir');
  const [manualRequisitos, setManualRequisitos] = useState('A definir');
  const [manualDetalhes, setManualDetalhes] = useState('');

  // Carrega lista monitorada do localStorage no início
  useEffect(() => {
    const saved = localStorage.getItem('concurso_monitored_list');
    if (saved) {
      try {
        setMonitoredExams(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar lista monitorada:", e);
      }
    } else {
      // Seed inicial com concursos famosos em pré-edital
      const defaultSeed = [
        {
          id: 'seed_pf_2026',
          concurso: 'Polícia Federal (Agente & Escrivão)',
          status: 'Autorizado',
          banca: 'A definir',
          vagas: '500 vagas previstas',
          salario: 'R$ 13.600,00',
          requisitos: 'Superior em Qualquer Área',
          detalhes: 'Rumores apontam autorização presidencial iminente para novos cargos policiais.',
          lastChecked: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          logs: ['Monitoramento ativado.']
        },
        {
          id: 'seed_correios_2026',
          concurso: 'Correios (Carteiro & Atendente)',
          status: 'Banca Definida',
          banca: 'IBFC',
          vagas: '3.200 vagas',
          salario: 'R$ 2.420,00 + Benefícios',
          requisitos: 'Ensino Médio',
          detalhes: 'Banca IBFC contratada oficialmente. Edital previsto para as próximas semanas.',
          lastChecked: new Date().toLocaleDateString('pt-BR'),
          logs: ['Banca definida: IBFC.', 'Edital em fase de elaboração final.']
        }
      ];
      setMonitoredExams(defaultSeed);
      localStorage.setItem('concurso_monitored_list', JSON.stringify(defaultSeed));
    }
  }, []);

  const saveToStorage = (list) => {
    setMonitoredExams(list);
    localStorage.setItem('concurso_monitored_list', JSON.stringify(list));
  };

  const handleFileUpload = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const data = await uploadConcursoPrint(file, provider, apiKey);
      const newExam = {
        id: 'monitor_' + Date.now(),
        concurso: data.concurso || 'Novo Concurso',
        status: data.status || 'Anunciado',
        banca: data.banca || 'A definir',
        vagas: data.vagas || 'A definir',
        salario: data.salario || 'A definir',
        requisitos: data.requisitos || 'A definir',
        detalhes: data.detalhes || 'Informações extraídas do print.',
        lastChecked: new Date().toLocaleDateString('pt-BR'),
        logs: ['Cadastro realizado via OCR de print.']
      };
      
      const updated = [newExam, ...monitoredExams];
      saveToStorage(updated);
    } catch (err) {
      setError(err.message || 'Erro ao processar a imagem. Certifique-se de enviar um arquivo PNG ou JPG válido.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualConcurso.trim()) return;

    const newExam = {
      id: 'monitor_' + Date.now(),
      concurso: manualConcurso,
      status: manualStatus,
      banca: manualBanca,
      vagas: manualVagas,
      salario: manualSalario,
      requisitos: manualRequisitos,
      detalhes: manualDetalhes || 'Cadastro manual efetuado pelo aluno.',
      lastChecked: new Date().toLocaleDateString('pt-BR'),
      logs: ['Cadastro manual realizado.']
    };

    const updated = [newExam, ...monitoredExams];
    saveToStorage(updated);
    setIsManualModalOpen(false);

    // Limpa campos
    setManualConcurso('');
    setManualStatus('Anunciado');
    setManualBanca('A definir');
    setManualVagas('A definir');
    setManualSalario('A definir');
    setManualRequisitos('A definir');
    setManualDetalhes('');
  };

  const handleDelete = (id) => {
    const updated = monitoredExams.filter(item => item.id !== id);
    saveToStorage(updated);
  };

  const handleCheckUpdate = async (exam) => {
    setCheckingId(exam.id);
    try {
      const data = await checkConcursoUpdate(exam.concurso, exam.status, exam.banca, provider, apiKey);
      
      const updated = monitoredExams.map(item => {
        if (item.id === exam.id) {
          const logs = [...(item.logs || [])];
          if (data.novoStatus !== item.status) {
            logs.unshift(`[${new Date().toLocaleDateString('pt-BR')}] Status alterado para: ${data.novoStatus}`);
          }
          logs.unshift(`[${new Date().toLocaleDateString('pt-BR')}] Verificação: ${data.noticia}`);
          return {
            ...item,
            status: data.novoStatus,
            banca: data.banca,
            detalhes: data.noticia,
            lastChecked: new Date().toLocaleDateString('pt-BR'),
            logs
          };
        }
        return item;
      });
      saveToStorage(updated);
      if (data.atualizado) {
        alert(`📢 Novidade sobre o concurso do ${exam.concurso}!\nStatus atual: ${data.novoStatus}\n${data.noticia}`);
      } else {
        alert(`Sem novidades para o concurso do ${exam.concurso}.`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar atualizações na web.');
    } finally {
      setCheckingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Anunciado': return '#3498db';
      case 'Autorizado': return '#1abc9c';
      case 'Comissão Formada': return '#9b59b6';
      case 'Banca Definida': return '#e67e22';
      case 'Edital Publicado!': return '#2ecc71';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="radar-monitor animate-fade-in" style={{ padding: '0 0 40px' }}>
      
      {/* SEÇÃO HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>📡 Radar de Editais (Pré-Edital)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Monitore concursos anunciados. Mande prints de notícias ou cadastros para que o robô faça varreduras semanais por novidades.
          </p>
        </div>
        <button 
          className="api-key-btn" 
          onClick={() => setIsManualModalOpen(true)}
          style={{ background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)', color: 'white' }}
        >
          ➕ Cadastrar Manualmente
        </button>
      </div>

      {/* ÁREA DE UPLOAD DE PRINTS */}
      <div 
        className="upload-container"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFileUpload(file);
        }}
        onClick={() => document.getElementById('radar-file-input').click()}
        style={{
          border: '2px dashed var(--accent-purple)',
          background: 'rgba(155, 89, 182, 0.03)',
          cursor: 'pointer',
          padding: '30px',
          borderRadius: 'var(--border-radius-lg)',
          textAlign: 'center',
          transition: 'var(--transition-smooth)',
          marginBottom: '32px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(155, 89, 182, 0.08)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(155, 89, 182, 0.03)'}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '6px' }}>
          Arraste e solte o print da notícia/Diário Oficial aqui
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 12px' }}>
          O sistema usará OCR (reconhecimento de imagem) para extrair o nome do órgão e banca e cadastrará o monitoramento.
        </p>
        <input 
          id="radar-file-input"
          type="file" 
          accept="image/*"
          style={{ display: 'none' }} 
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) handleFileUpload(file);
          }}
        />
        <button className="upload-btn" style={{ background: 'var(--accent-purple)', color: 'white', border: 'none' }}>
          Selecionar Imagem
        </button>
      </div>

      {loading && (
        <div className="loading-overlay" style={{ margin: '-16px 0 24px' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--accent-purple)' }}></div>
          <p style={{ fontWeight: '500' }}>Processando imagem e extraindo textos...</p>
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--accent-red)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* GRID DE CONCURSOS MONITORADOS */}
      <h4 style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
        🔍 Editais sob Vigilância ({monitoredExams.length})
      </h4>

      {monitoredExams.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Nenhum edital sob vigilância ainda. Envie um print de edital acima ou cadastre um manualmente!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {monitoredExams.map((exam) => (
            <div 
              key={exam.id} 
              className="glass-card animate-fade-in" 
              style={{ 
                padding: '24px', 
                border: exam.status === 'Edital Publicado!' ? '1px solid rgba(46, 204, 113, 0.4)' : '1px solid var(--border-glass)',
                boxShadow: exam.status === 'Edital Publicado!' ? '0 0 16px rgba(46, 204, 113, 0.15)' : 'none'
              }}
            >
              {/* HEADER DO CARD */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <h4 style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '16px', lineHeight: '1.3' }}>
                  {exam.concurso}
                </h4>
                <button 
                  onClick={() => handleDelete(exam.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                  title="Remover monitoramento"
                >
                  ✕
                </button>
              </div>

              {/* BADGE DE STATUS */}
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span 
                  style={{
                    background: getStatusColor(exam.status) + '15',
                    color: getStatusColor(exam.status),
                    border: `1px solid ${getStatusColor(exam.status)}40`,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                >
                  {exam.status}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Banca: <strong>{exam.banca}</strong>
                </span>
              </div>

              {/* DETALHES DE FICHA TÉCNICA PREVISTA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <div>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Vagas Previstas:</span>
                  <p style={{ color: 'var(--text-main)', marginTop: '2px', fontWeight: '500' }}>{exam.vagas}</p>
                </div>
                <div>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Remuneração:</span>
                  <p style={{ color: 'var(--text-main)', marginTop: '2px', fontWeight: '500' }}>{exam.salario}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Requisitos:</span>
                  <p style={{ color: 'var(--text-main)', marginTop: '2px', fontWeight: '500' }}>{exam.requisitos}</p>
                </div>
              </div>

              {/* ÚLTIMA NOTÍCIA EXTRAÍDA */}
              <div style={{ marginTop: '14px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '10px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>📡 Último Status:</span>
                <p style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '4px', lineHeight: '1.4' }}>
                  {exam.detalhes}
                </p>
              </div>

              {/* BOTÕES DE CONTROLE DO CARD */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button 
                  className="sync-btn"
                  onClick={() => handleCheckUpdate(exam)}
                  disabled={checkingId === exam.id}
                  style={{ flex: 1, margin: 0, padding: '8px 12px', fontSize: '12px' }}
                >
                  {checkingId === exam.id ? 'Buscando...' : '🔄 Rastrear Notícias'}
                </button>

                {exam.status === 'Edital Publicado!' && (
                  <button 
                    onClick={() => {
                      setView('upload');
                      setTimeout(() => {
                        alert("Por favor, faça o upload do PDF oficial do edital no painel principal para gerar seu planejamento de estudos!");
                      }, 200);
                    }}
                    style={{
                      flex: 1.2,
                      background: 'var(--accent-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 0 10px rgba(46, 204, 113, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📥 Iniciar Planejamento
                  </button>
                )}
              </div>

              {/* HISTÓRICO DE LOGS DE RASTREAMENTO */}
              {exam.logs && exam.logs.length > 0 && (
                <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--text-muted)', maxHeight: '60px', overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  <span style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 'bold' }}>Histórico do Robô:</span>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
                    {exam.logs.slice(0, 3).map((log, lIdx) => (
                      <li key={lIdx} style={{ marginBottom: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {log}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CADASTRO MANUAL */}
      {isManualModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Monitorar Novo Concurso</h3>
              <button className="close-modal-btn" onClick={() => setIsManualModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleManualSubmit} className="modal-body">
              <div className="input-group">
                <label>Órgão / Nome do Concurso:</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Ex: Polícia Federal, TJ-SP, Correios..."
                  value={manualConcurso} 
                  onChange={(e) => setManualConcurso(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Status Atual:</label>
                  <select 
                    className="text-input" 
                    value={manualStatus} 
                    onChange={(e) => setManualStatus(e.target.value)}
                  >
                    <option value="Anunciado">Anunciado</option>
                    <option value="Autorizado">Autorizado</option>
                    <option value="Comissão Formada">Comissão Formada</option>
                    <option value="Banca Definida">Banca Definida</option>
                    <option value="Edital Publicado!">Edital Publicado!</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Banca Organizadora:</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="Ex: FGV, Vunesp, Cebraspe..." 
                    value={manualBanca} 
                    onChange={(e) => setManualBanca(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Vagas Previstas:</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="Ex: 50 vagas, CR..." 
                    value={manualVagas} 
                    onChange={(e) => setManualVagas(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Salário Estimado:</label>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="Ex: R$ 8.500,00..." 
                    value={manualSalario} 
                    onChange={(e) => setManualSalario(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Requisitos / Escolaridade:</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Ex: Nível Superior em TI, Médio Completo..." 
                  value={manualRequisitos} 
                  onChange={(e) => setManualRequisitos(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Notas / Últimas Notícias (Detalhes):</label>
                <textarea 
                  className="text-input" 
                  rows="3" 
                  placeholder="Adicione informações adicionais do concurso ou links de notícias..."
                  value={manualDetalhes} 
                  onChange={(e) => setManualDetalhes(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <button type="submit" className="save-modal-btn" style={{ background: 'var(--accent-purple)' }}>
                Rastrear Concurso
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
