import React, { useState, useEffect, useMemo } from 'react';
import { getRadarConcursos, checkConcursoUpdate, fetchCloudUserData, saveCloudUserData } from '../services/api';

export default function RadarMonitor({ provider, apiKey, setView, onInitPlanWithMock }) {
  const [concursos, setConcursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' (interesse) | 'explore' (todos) | 'ignored' (dispensados)
  
  // Filtros
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [selectedEscolaridade, setSelectedEscolaridade] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de interesse pessoal
  const [interestedIds, setInterestedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('studyhub_interested_concursos');
      return saved ? JSON.parse(saved) : ['exercito_espcex_2026', 'bb_ti_2026', 'receita_federal_ti_2026', 'pmdf_oficial_2026'];
    } catch (e) {
      return ['exercito_espcex_2026', 'bb_ti_2026'];
    }
  });

  const [ignoredIds, setIgnoredIds] = useState(() => {
    try {
      const saved = localStorage.getItem('studyhub_ignored_concursos');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Notícias / logs de atualizações consultadas
  const [examLogs, setExamLogs] = useState({});

  // Carrega catálogo atualizado automaticamente na abertura
  useEffect(() => {
    let isMounted = true;
    async function fetchCatalog() {
      setLoading(true);
      setError(null);
      try {
        const data = await getRadarConcursos();
        if (isMounted) {
          setConcursos(data.concursos || []);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Falha ao buscar via API, usando fallback local:", err);
          // Fallback se estiver offline
          try {
            const localData = await import('../../../backend/concursosData.js');
            setConcursos(localData.concursosCatalog || []);
          } catch (e) {}
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchCatalog();

    // Sincroniza preferências do Radar com o Supabase
    fetchCloudUserData().then(cloud => {
      if (cloud && cloud.radar_preferences && isMounted) {
        const { interested, ignored } = cloud.radar_preferences;
        if (Array.isArray(interested) && interested.length > 0) {
          setInterestedIds(interested);
          localStorage.setItem('studyhub_interested_concursos', JSON.stringify(interested));
        }
        if (Array.isArray(ignored)) {
          setIgnoredIds(ignored);
          localStorage.setItem('studyhub_ignored_concursos', JSON.stringify(ignored));
        }
      }
    }).catch(e => console.warn('Radar cloud sync notice:', e));

    return () => { isMounted = false; };
  }, []);

  // Salva interesses no storage e na nuvem Supabase
  const toggleInterest = (id) => {
    let nextInterested = [];
    let nextIgnored = ignoredIds;

    setInterestedIds(prev => {
      const exists = prev.includes(id);
      nextInterested = exists ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('studyhub_interested_concursos', JSON.stringify(nextInterested));
      return nextInterested;
    });

    // Se estava ignorado, remove do ignorado
    if (ignoredIds.includes(id)) {
      setIgnoredIds(prev => {
        nextIgnored = prev.filter(x => x !== id);
        localStorage.setItem('studyhub_ignored_concursos', JSON.stringify(nextIgnored));
        return nextIgnored;
      });
    }

    saveCloudUserData('radar_preferences', { interested: nextInterested, ignored: nextIgnored });
  };

  const toggleIgnore = (id) => {
    let nextIgnored = [];
    let nextInterested = interestedIds;

    setIgnoredIds(prev => {
      const exists = prev.includes(id);
      nextIgnored = exists ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('studyhub_ignored_concursos', JSON.stringify(nextIgnored));
      return nextIgnored;
    });

    // Se estava nos favoritos, remove
    if (interestedIds.includes(id)) {
      setInterestedIds(prev => {
        nextInterested = prev.filter(x => x !== id);
        localStorage.setItem('studyhub_interested_concursos', JSON.stringify(nextInterested));
        return nextInterested;
      });
    }

    saveCloudUserData('radar_preferences', { interested: nextInterested, ignored: nextIgnored });
  };

  // Checagem de atualizações com IA
  const handleCheckUpdate = async (item) => {
    setCheckingId(item.id);
    try {
      const res = await checkConcursoUpdate(item.orgao, item.status, item.banca, provider, apiKey);
      setExamLogs(prev => ({
        ...prev,
        [item.id]: {
          timestamp: new Date().toLocaleDateString('pt-BR'),
          mudanca: res.mudancaDetectada,
          detalhes: res.detalhes
        }
      }));
    } catch (err) {
      alert("Não foi possível verificar atualizações agora. Verifique a chave ou modo IA.");
    } finally {
      setCheckingId(null);
    }
  };

  // Áreas disponíveis para filtro
  const areas = [
    { label: 'Todas as Áreas', value: 'Todas', icon: '🌐' },
    { label: 'Militar & Forças Armadas', value: 'Militar', icon: '⚔️' },
    { label: 'Tecnologia da Informação', value: 'TI', icon: '💻' },
    { label: 'Policial & Segurança', value: 'Policial', icon: '👮' },
    { label: 'Fiscal & Tributária', value: 'Fiscal', icon: '💰' },
    { label: 'Tribunais & Jurídica', value: 'Tribunais', icon: '⚖️' },
    { label: 'Bancária & Financeira', value: 'Bancária', icon: '🏛️' },
    { label: 'Controle & Auditoria', value: 'Controle', icon: '📊' },
    { label: 'Educação', value: 'Educação', icon: '🎓' },
    { label: 'Administrativa', value: 'Administrativa', icon: '🏢' },
    { label: 'Saúde', value: 'Saúde', icon: '🏥' }
  ];

  // Filtra a lista
  const filteredConcursos = useMemo(() => {
    return concursos.filter(item => {
      // Filtro de aba
      const isInterested = interestedIds.includes(item.id);
      const isIgnored = ignoredIds.includes(item.id);

      if (activeTab === 'radar' && !isInterested) return false;
      if (activeTab === 'ignored' && !isIgnored) return false;
      if (activeTab === 'explore' && isIgnored) return false;

      // Filtro de Área
      if (selectedArea !== 'Todas' && item.area !== selectedArea) return false;

      // Filtro de Escolaridade
      if (selectedEscolaridade !== 'Todas' && !(item.escolaridade || '').toLowerCase().includes(selectedEscolaridade.toLowerCase())) {
        return false;
      }

      // Filtro de Status
      if (selectedStatus !== 'Todos' && (item.status || '').toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }

      // Busca por texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = 
          (item.orgao || '').toLowerCase().includes(term) ||
          (item.cargo || '').toLowerCase().includes(term) ||
          (item.banca || '').toLowerCase().includes(term) ||
          (item.uf || '').toLowerCase().includes(term) ||
          (item.subarea || '').toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [concursos, activeTab, interestedIds, ignoredIds, selectedArea, selectedEscolaridade, selectedStatus, searchTerm]);

  // Contadores
  const totalInterested = concursos.filter(c => interestedIds.includes(c.id)).length;
  const totalIgnored = concursos.filter(c => ignoredIds.includes(c.id)).length;
  const totalExplore = concursos.filter(c => !ignoredIds.includes(c.id)).length;

  return (
    <div className="radar-monitor animate-fade-in">
      {/* CABEÇALHO DO RADAR */}
      <div className="radar-header glass-card">
        <div className="radar-header-info">
          <div className="radar-badge">
            <span className="live-dot pulse"></span>
            <span>MONITORAMENTO ATIVO 2026/2027</span>
          </div>
          <h2>Radar de Editais & Concursos Públicos</h2>
          <p>
            Atualizações automáticas baseadas nos maiores portais de concursos do Brasil (Gran Cursos, Diários Oficiais e Editais).
            Selecione suas carreiras de interesse para focar sua preparação.
          </p>
        </div>

        {/* CONTADORES EM MINI CARDS */}
        <div className="radar-stat-cards">
          <div className={`radar-stat-box ${activeTab === 'radar' ? 'active' : ''}`} onClick={() => setActiveTab('radar')}>
            <span className="stat-label">⭐ No Meu Radar</span>
            <span className="stat-num text-cyan">{totalInterested}</span>
          </div>
          <div className={`radar-stat-box ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
            <span className="stat-label">🌐 Total Disponível</span>
            <span className="stat-num text-purple">{totalExplore}</span>
          </div>
          <div className={`radar-stat-box ${activeTab === 'ignored' ? 'active' : ''}`} onClick={() => setActiveTab('ignored')}>
            <span className="stat-label">🚫 Dispensados</span>
            <span className="stat-num text-muted">{totalIgnored}</span>
          </div>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO PRINCIPAL */}
      <div className="radar-tab-bar">
        <button
          className={`radar-tab-btn ${activeTab === 'radar' ? 'active' : ''}`}
          onClick={() => setActiveTab('radar')}
        >
          ⭐ Concursos de Meu Interesse ({totalInterested})
        </button>
        <button
          className={`radar-tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          🔍 Explorar Todos os Concursos ({totalExplore})
        </button>
        <button
          className={`radar-tab-btn ${activeTab === 'ignored' ? 'active' : ''}`}
          onClick={() => setActiveTab('ignored')}
        >
          🚫 Dispensados ({totalIgnored})
        </button>
      </div>

      {/* PAINEL DE FILTRAGEM POR ÁREA / CARREIRA */}
      <div className="radar-filters-container glass-card">
        <div className="filter-section-title">
          <span>🎯 Filtrar por Carreira / Tipo de Trabalho:</span>
        </div>
        <div className="area-chips-scroll">
          {areas.map(a => (
            <button
              key={a.value}
              className={`area-chip ${selectedArea === a.value ? 'active' : ''}`}
              onClick={() => setSelectedArea(a.value)}
            >
              <span className="chip-icon">{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>

        {/* SUB-FILTROS: ESCOLARIDADE, STATUS E BUSCA */}
        <div className="sub-filters-row">
          <div className="search-input-box">
            <span className="search-icon">🔎</span>
            <input
              type="text"
              className="radar-search-input"
              placeholder="Buscar órgão, cargo, banca ou estado (ex: Exército, TI, DF)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>

          <div className="select-filters-group">
            <div className="filter-select-wrap">
              <label>Escolaridade:</label>
              <select
                className="radar-select"
                value={selectedEscolaridade}
                onChange={(e) => setSelectedEscolaridade(e.target.value)}
              >
                <option value="Todas">Todas as Escolaridades</option>
                <option value="Médio">Nível Médio</option>
                <option value="Técnico">Nível Técnico</option>
                <option value="Superior">Nível Superior</option>
              </select>
            </div>

            <div className="filter-select-wrap">
              <label>Status do Edital:</label>
              <select
                className="radar-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="Todos">Todos os Status</option>
                <option value="Edital Publicado">🔥 Edital Publicado</option>
                <option value="Banca Definida">⚡ Banca Definida</option>
                <option value="Banca em Definição">⏳ Banca em Definição</option>
                <option value="Comissão Formada">📝 Comissão Formada</option>
                <option value="Autorizado">✅ Autorizado</option>
                <option value="Previsto">🔮 Previsto / Anunciado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK DE CARREGAMENTO OU ERRO */}
      {loading && (
        <div className="loading-state glass-card">
          <div className="spinner"></div>
          <p>Sincronizando editais e concursos mais recentes do Brasil...</p>
        </div>
      )}

      {/* LISTA DE CONCURSOS FILTRADOS */}
      {!loading && (
        <div className="radar-cards-grid">
          {filteredConcursos.length === 0 ? (
            <div className="empty-radar glass-card">
              <div className="empty-icon">{activeTab === 'radar' ? '⭐' : '🔎'}</div>
              <h3>Nenhum concurso encontrado</h3>
              <p>
                {activeTab === 'radar'
                  ? 'Você ainda não favoritou concursos nesta categoria. Vá na aba "Explorar Todos os Concursos" e clique em "⭐ Tenho Interesse"!'
                  : 'Tente ajustar os filtros de carreira ou o termo de pesquisa.'}
              </p>
              {activeTab === 'radar' && (
                <button className="btn-primary" onClick={() => setActiveTab('explore')}>
                  Explorar Concursos Agora →
                </button>
              )}
            </div>
          ) : (
            filteredConcursos.map(item => {
              const isInterested = interestedIds.includes(item.id);
              const isIgnored = ignoredIds.includes(item.id);
              const log = examLogs[item.id];

              return (
                <div key={item.id} className={`radar-exam-card glass-card ${isInterested ? 'starred-card' : ''}`}>
                  {/* TOPO DO CARD */}
                  <div className="card-top-row">
                    <div className="area-badge-tag">
                      <span className="area-pill">{item.area}</span>
                      {item.subarea && <span className="subarea-text">• {item.subarea}</span>}
                    </div>

                    <div className="card-status-badge">
                      <span className={`status-pill status-${(item.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.status === 'Edital Publicado' ? '🔥 Edital Publicado' : item.status}
                      </span>
                    </div>
                  </div>

                  {/* TÍTULO E CARGO */}
                  <div className="card-body-section">
                    <div className="uf-indicator">{item.uf}</div>
                    <h3 className="exam-card-title">{item.orgao}</h3>
                    <div className="exam-card-role">
                      <strong>Cargo(s):</strong> {item.cargo}
                    </div>
                  </div>

                  {/* DETALHES RÁPIDOS (VAGAS, REMUNERAÇÃO, BANCA) */}
                  <div className="exam-details-chips">
                    <div className="chip-info">
                      <span className="chip-k">💰 Salário:</span>
                      <span className="chip-v text-highlight">{item.remuneracao || 'A consultar'}</span>
                    </div>
                    <div className="chip-info">
                      <span className="chip-k">👥 Vagas:</span>
                      <span className="chip-v">{item.vagas || 'A definir'}</span>
                    </div>
                    <div className="chip-info">
                      <span className="chip-k">🏢 Banca:</span>
                      <span className="chip-v">{item.banca || 'A definir'}</span>
                    </div>
                    <div className="chip-info">
                      <span className="chip-k">🎓 Nível:</span>
                      <span className="chip-v">{item.escolaridade || 'Médio/Superior'}</span>
                    </div>
                  </div>

                  {item.detalhes && (
                    <p className="card-notes-text">
                      {item.detalhes}
                    </p>
                  )}

                  {log && (
                    <div className="update-log-box animate-fade-in">
                      <div className="log-time">📅 Atualizado em: {log.timestamp}</div>
                      <div className="log-msg">
                        {log.mudanca ? '🚨 Novidade:' : 'ℹ️'} {log.detalhes}
                      </div>
                    </div>
                  )}

                  {/* AÇÕES NO CARD */}
                  <div className="card-actions-footer">
                    <button
                      className={`interest-btn ${isInterested ? 'is-interested' : ''}`}
                      onClick={() => toggleInterest(item.id)}
                      title={isInterested ? 'Remover dos favoritos' : 'Adicionar aos meus concursos'}
                    >
                      {isInterested ? '⭐ No Meu Radar' : '☆ Tenho Interesse'}
                    </button>

                    <button
                      className={`ignore-btn ${isIgnored ? 'is-ignored' : ''}`}
                      onClick={() => toggleIgnore(item.id)}
                      title={isIgnored ? 'Reativar concurso' : 'Dispensar este concurso'}
                    >
                      {isIgnored ? '↩️ Reativar' : '🚫 Não me Interessa'}
                    </button>

                    <button
                      className="check-ia-btn"
                      onClick={() => handleCheckUpdate(item)}
                      disabled={checkingId === item.id}
                      title="Consultar se há novas movimentações no órgão"
                    >
                      {checkingId === item.id ? '⏳ Verificando...' : '🔄 Atualização'}
                    </button>

                    {onInitPlanWithMock && (
                      <button
                        className="prepare-btn"
                        onClick={() => {
                          onInitPlanWithMock({
                            cargo: item.cargo,
                            concurso: item.orgao,
                            banca: item.banca,
                            vagas: item.vagas,
                            salario: item.remuneracao
                          });
                          setView('dashboard');
                        }}
                        title="Abrir área de estudo e cronograma para este cargo"
                      >
                        🚀 Estudar Agora
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
