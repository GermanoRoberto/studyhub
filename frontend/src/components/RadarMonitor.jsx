import React, { useState, useEffect, useMemo } from 'react';
import { getRadarConcursos, checkConcursoUpdate, fetchCloudUserData, saveCloudUserData } from '../services/api';
import ProfileModal from './ProfileModal';

export default function RadarMonitor({ provider, apiKey, setView, onInitPlanWithMock }) {
  const [concursos, setConcursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' (interesse) | 'explore' (todos) | 'ignored' (dispensados)
  
  // Perfil de Elegibilidade (Idade, Formação e Condições Físicas/Ombro)
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('studyhub_user_profile');
      return saved ? JSON.parse(saved) : { idade: 28, escolaridade: 'medio', sem_barra: true, sem_taf: false };
    } catch (e) {
      return { idade: 28, escolaridade: 'medio', sem_barra: true, sem_taf: false };
    }
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(() => {
    return !localStorage.getItem('studyhub_user_profile');
  });
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const [hideExpired, setHideExpired] = useState(true);

  // Filtros
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [selectedEscolaridade, setSelectedEscolaridade] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de interesse pessoal (sem concursos com barra fixa por padrão)
  const [interestedIds, setInterestedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('studyhub_interested_concursos');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Remove concursos com barra fixa caso tenham sido favoritados no passado
        return parsed.filter(id => id !== 'exercito_espcex_2026' && id !== 'pmdf_oficial_2026' && id !== 'pmsp_soldado_2026');
      }
      return ['bb_ti_2026', 'receita_federal_ti_2026', 'tj_sp_escrevente_2026', 'bacen_ti_2026'];
    } catch (e) {
      return ['bb_ti_2026', 'receita_federal_ti_2026'];
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

  // Carrega catálogo e sincroniza perfil
  const loadData = async (isMounted = true) => {
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
        try {
          const localData = await import('../../../backend/concursosData.js');
          setConcursos(localData.concursosCatalog || []);
        } catch (e) {}
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadData(isMounted);

    // Sincroniza preferências do Radar e Perfil com o Supabase
    fetchCloudUserData().then(cloud => {
      if (cloud && isMounted) {
        if (cloud.radar_preferences) {
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
        if (cloud.user_profile) {
          setUserProfile(cloud.user_profile);
          localStorage.setItem('studyhub_user_profile', JSON.stringify(cloud.user_profile));
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

    if (interestedIds.includes(id)) {
      setInterestedIds(prev => {
        nextInterested = prev.filter(x => x !== id);
        localStorage.setItem('studyhub_interested_concursos', JSON.stringify(nextInterested));
        return nextInterested;
      });
    }

    saveCloudUserData('radar_preferences', { interested: nextInterested, ignored: nextIgnored });
  };

  // Checagem de compatibilidade com o perfil pessoal (Ombro, TAF, Idade, Status)
  const checkCompatibility = (item) => {
    const issues = [];
    const statusLower = (item.status || '').toLowerCase();

    // 1. Concurso encerrado ou prova já realizada
    if (statusLower.includes('encerrado') || statusLower.includes('prova realizada') || statusLower.includes('gabarito')) {
      issues.push({ type: 'expired', text: 'Concurso Encerrado / Prova Já Realizada' });
    }

    // 2. Limitação no Ombro (Barra Fixa)
    if (userProfile.sem_barra && item.taf_tipo === 'com_barra') {
      issues.push({ type: 'shoulder', text: 'Exige Barra Fixa no TAF (Incompatível com Limitação de Ombro)' });
    }

    // 3. Apenas sem TAF
    if (userProfile.sem_taf && item.taf_tipo && item.taf_tipo !== 'nenhum') {
      issues.push({ type: 'taf', text: 'Exige Teste Físico (TAF)' });
    }

    // 4. Limite de Idade
    if (item.idade_maxima && userProfile.idade > item.idade_maxima) {
      issues.push({ type: 'age', text: `Idade acima do limite (Máximo: ${item.idade_maxima} anos)` });
    }

    return {
      isCompatible: issues.length === 0,
      isExpired: issues.some(i => i.type === 'expired'),
      issues
    };
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

  // Filtra a lista com base no perfil e seleções
  const filteredConcursos = useMemo(() => {
    return concursos.filter(item => {
      const isInterested = interestedIds.includes(item.id);
      const isIgnored = ignoredIds.includes(item.id);

      if (activeTab === 'radar' && !isInterested) return false;
      if (activeTab === 'ignored' && !isIgnored) return false;
      if (activeTab === 'explore' && isIgnored) return false;

      // Validação de compatibilidade
      const compat = checkCompatibility(item);

      // Oculta provas encerradas se o filtro estiver ativo
      if (hideExpired && compat.isExpired) return false;

      // Filtra apenas compatíveis se o toggle estiver ativo
      if (onlyCompatible && !compat.isCompatible) return false;

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
  }, [concursos, activeTab, interestedIds, ignoredIds, selectedArea, selectedEscolaridade, selectedStatus, searchTerm, userProfile, onlyCompatible, hideExpired]);

  // Contadores
  const totalInterested = concursos.filter(c => interestedIds.includes(c.id)).length;
  const totalIgnored = concursos.filter(c => ignoredIds.includes(c.id)).length;
  const totalExplore = concursos.filter(c => !ignoredIds.includes(c.id)).length;

  return (
    <div className="radar-monitor animate-fade-in">
      {/* MODAL DE PERFIL */}
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={userProfile}
        onSaveProfile={(newProf) => setUserProfile(newProf)}
      />

      {/* CABEÇALHO DO RADAR */}
      <div className="radar-header glass-card">
        <div className="radar-header-info">
          <div className="radar-badge">
            <span className="live-dot pulse"></span>
            <span>MONITORAMENTO ATIVO 2026/2027 (SEM CHAVES)</span>
          </div>
          <h2>Radar de Editais & Oportunidades Reais</h2>
          <p>
            Atualizações automáticas da web com validação de elegibilidade física (TAF) e prazos de validade do concurso.
          </p>

          {/* BARRA DE PERFIL DO CONCURSEIRO */}
          <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <span style={{ fontSize: '18px' }}>🎯</span>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Seu Perfil Concurseiro:</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                  Idade: <strong style={{ color: 'var(--accent-cyan)' }}>{userProfile.idade} anos</strong> | 
                  Ombro: <strong style={{ color: userProfile.sem_barra ? '#ff6b6b' : 'var(--accent-green)' }}>{userProfile.sem_barra ? '🚫 Sem Barra Fixa' : 'Apto'}</strong> | 
                  TAF: <strong style={{ color: 'var(--accent-purple)' }}>{userProfile.sem_taf ? 'Sem Teste Físico' : 'Livre'}</strong>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="secondary-btn"
                onClick={() => setIsProfileModalOpen(true)}
                style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--bg-glass)', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
              >
                ⚙️ Ajustar Perfil
              </button>
              <button 
                className="secondary-btn"
                onClick={() => loadData(true)}
                title="Consulta feeds RSS em tempo real do Gran Cursos e portais públicos"
                style={{ fontSize: '12px', padding: '6px 12px', background: 'rgba(62, 207, 142, 0.1)', borderColor: '#3ecf8e', color: '#3ecf8e' }}
              >
                🔄 Atualizar da Web
              </button>
            </div>
          </div>
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

      {/* FILTROS E ABAS */}
      <div className="radar-controls glass-card">
        <div className="tabs-nav-bar">
          <button 
            className={`tab-btn ${activeTab === 'radar' ? 'active' : ''}`} 
            onClick={() => setActiveTab('radar')}
          >
            ⭐ Concursos de Meu Interesse ({totalInterested})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`} 
            onClick={() => setActiveTab('explore')}
          >
            🔍 Explorar Todos os Concursos ({totalExplore})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'ignored' ? 'active' : ''}`} 
            onClick={() => setActiveTab('ignored')}
          >
            🗑️ Dispensados ({totalIgnored})
          </button>
        </div>

        {/* TOGGLES INTELIGENTES DE ELEGIBILIDADE */}
        <div style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={onlyCompatible}
              onChange={(e) => setOnlyCompatible(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ fontWeight: '600', color: onlyCompatible ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
              🎯 Exibir apenas compatíveis com meu perfil ({filteredConcursos.length} disponíveis)
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={hideExpired}
              onChange={(e) => setHideExpired(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ fontWeight: '600', color: hideExpired ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              ⏰ Ocultar provas já realizadas / encerradas
            </span>
          </label>
        </div>

        {/* FILTROS DE CARREIRA (CHIPS) */}
        <div className="filters-container">
          <div className="filter-group-areas">
            <span className="filter-title">Carreiras / Áreas:</span>
            <div className="area-chips-list">
              {areas.map(a => (
                <button
                  key={a.value}
                  className={`area-chip ${selectedArea === a.value ? 'active' : ''}`}
                  onClick={() => setSelectedArea(a.value)}
                >
                  <span className="chip-icon">{a.icon}</span>
                  <span className="chip-text">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="secondary-filters-row">
            <div className="search-bar-box">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Pesquisar concurso, órgão, cargo, banca ou estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="radar-search-input"
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={() => setSearchTerm('')}>×</button>
              )}
            </div>

            <div className="dropdowns-group">
              <select 
                value={selectedEscolaridade} 
                onChange={(e) => setSelectedEscolaridade(e.target.value)}
                className="radar-select"
              >
                <option value="Todas">Toda Escolaridade</option>
                <option value="Médio">Nível Médio</option>
                <option value="Superior">Nível Superior</option>
                <option value="Fundamental">Nível Fundamental</option>
              </select>

              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="radar-select"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Inscrições Abertas">📝 Inscrições Abertas</option>
                <option value="Edital Publicado">🔥 Edital Publicado</option>
                <option value="Banca Definida">⚡ Banca Definida</option>
                <option value="Comissão Formada">📝 Comissão Formada</option>
                <option value="Autorizado">✅ Autorizado</option>
                <option value="Previsto">🔮 Previsto 2026/2027</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK DE CARREGAMENTO OU ERRO */}
      {loading && (
        <div className="loading-state glass-card">
          <div className="spinner"></div>
          <p>Consultando editais e feeds em tempo real da internet...</p>
        </div>
      )}

      {/* LISTA DE CONCURSOS FILTRADOS */}
      {!loading && (
        <div className="radar-cards-grid">
          {filteredConcursos.length === 0 ? (
            <div className="empty-radar glass-card">
              <div className="empty-icon">{activeTab === 'radar' ? '⭐' : '🔎'}</div>
              <h3>Nenhum concurso encontrado para os filtros ativos</h3>
              <p>
                {onlyCompatible 
                  ? 'Você ativou o filtro de elegibilidade. Nenhum concurso desta carreira bateu com suas restrições de ombro/idade, ou os concursos já encerraram.' 
                  : 'Tente ajustar os filtros de carreira ou o termo de pesquisa.'}
              </p>
              {onlyCompatible && (
                <button 
                  className="secondary-btn" 
                  onClick={() => setOnlyCompatible(false)}
                  style={{ marginTop: '12px', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                >
                  Exibir todos (inclusive incompatíveis) para conferir
                </button>
              )}
            </div>
          ) : (
            filteredConcursos.map(item => {
              const isInterested = interestedIds.includes(item.id);
              const isIgnored = ignoredIds.includes(item.id);
              const log = examLogs[item.id];
              const compat = checkCompatibility(item);

              return (
                <div key={item.id} className={`radar-exam-card glass-card ${isInterested ? 'starred-card' : ''}`}>
                  
                  {/* BADGES DE COMPATIBILIDADE COM O PERFIL */}
                  <div style={{ marginBottom: '8px' }}>
                    {compat.isCompatible ? (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                        ✅ 100% Compatível com seu Perfil
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {compat.issues.map((iss, i) => (
                          <span key={i} style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', background: iss.type === 'shoulder' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(243, 156, 18, 0.15)', color: iss.type === 'shoulder' ? '#ff6b6b' : '#f39c12', border: `1px solid ${iss.type === 'shoulder' ? 'rgba(231, 76, 60, 0.3)' : 'rgba(243, 156, 18, 0.3)'}` }}>
                            {iss.type === 'shoulder' ? '🚫' : '⚠️'} {iss.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TOPO DO CARD */}
                  <div className="card-top-row">
                    <div className="area-badge-tag">
                      <span className="area-pill">{item.area}</span>
                      {item.is_live_rss && (
                        <span style={{ fontSize: '10px', background: 'rgba(231, 76, 60, 0.2)', color: '#ff6b6b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(231, 76, 60, 0.4)' }}>
                          🔴 Feed Ao Vivo
                        </span>
                      )}
                    </div>

                    <div className="card-status-badge">
                      <span className={`status-pill status-${(item.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.status === 'Inscrições Abertas' ? '📝 Inscrições Abertas' : (item.status === 'Edital Publicado' ? '🔥 Edital Publicado' : item.status)}
                      </span>
                    </div>
                  </div>

                  {/* TÍTULO E CARGO */}
                  <div className="card-body-section">
                    <div className="uf-indicator">{item.uf || 'BR'}</div>
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

                  {/* DETALHE DE TESTE FÍSICO (TAF) */}
                  <div style={{ margin: '8px 0', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏃‍♂️</span>
                    <span>
                      <strong style={{ color: item.taf_tipo === 'com_barra' ? '#ff6b6b' : (item.taf_tipo === 'nenhum' ? '#2ecc71' : 'var(--text-main)') }}>
                        {item.taf_tipo === 'nenhum' ? 'Sem Teste Físico (Apenas Prova Teórica)' : (item.taf_tipo === 'com_barra' ? 'Exige Barra Fixa no TAF' : 'TAF Sem Barra Fixa')}
                      </strong>
                      {item.taf_descricao && item.taf_tipo !== 'nenhum' && ` (${item.taf_descricao})`}
                    </span>
                  </div>

                  {item.detalhes && (
                    <p className="card-notes-text">
                      {item.detalhes}
                    </p>
                  )}

                  {/* LINK OFICIAL SE FOR RSS */}
                  {item.link_oficial && (
                    <div style={{ marginTop: '6px' }}>
                      <a 
                        href={item.link_oficial} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 'bold' }}
                      >
                        🔗 Ver Matéria Completa & Edital Oficial →
                      </a>
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
                      {isIgnored ? '↩️ Reativar' : '🚫 Dispensar'}
                    </button>

                    <button
                      className="study-now-btn"
                      onClick={() => onInitPlanWithMock(item)}
                      title="Criar plano de estudos e simulados para este concurso"
                    >
                      🚀 Estudar Agora
                    </button>
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
