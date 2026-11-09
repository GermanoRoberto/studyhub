import React, { useState, useEffect, useMemo } from 'react';
import { getRadarConcursos, checkConcursoUpdate, fetchCloudUserData, saveCloudUserData } from '../services/api';
import ProfileModal from './ProfileModal';
import CargoSelectionModal from './CargoSelectionModal';

export default function RadarMonitor({ provider, apiKey, setView, onInitPlanWithMock }) {
  const [concursos, setConcursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' (interesse) | 'explore' (todos) | 'ignored' (dispensados)
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selectedConcursoForCargo, setSelectedConcursoForCargo] = useState(null);
  
  // Perfil de Elegibilidade (Idade, Formação e Condições Físicas/Ombro)
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('studyhub_user_profile');
      return saved ? JSON.parse(saved) : { idade: 37, escolaridade: 'superior_qualquer', sem_barra: true, sem_taf: true };
    } catch (e) {
      return { idade: 37, escolaridade: 'superior_qualquer', sem_barra: true, sem_taf: true };
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

  // Checagem de compatibilidade com o perfil pessoal (Ombro, TAF, Idade, Status e Formação)
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

    // 5. Validação de Formação / Escolaridade (Inteligente)
    const userEsc = userProfile.escolaridade || 'superior_qualquer';
    const itemEsc = (item.escolaridade || '').toLowerCase();
    const itemReq = ((item.requisitos || '') + ' ' + (item.cargo || '') + ' ' + (item.subarea || '')).toLowerCase();

    // Se o usuário tem apenas nível Médio e o concurso exige exclusivamente Nível Superior
    if (userEsc === 'medio') {
      if (itemEsc.includes('superior') && !itemEsc.includes('médio') && !itemEsc.includes('medio')) {
        issues.push({ type: 'education', text: 'Exige Nível Superior (Seu perfil: Nível Médio)' });
      }
    } else {
      // Usuário possui Nível Superior!
      // Se o cargo exige EXCLUSIVAMENTE Direito (Juiz, Promotor, Procurador, Defensor, Delegado)
      const isExclusivelyDireito = 
        /juiz|magistratura|promotor|defensor\s+p[uú]blico|procurador|delegado/i.test(itemReq) ||
        /bacharelado\s+em\s+direito|diploma\s+em\s+direito/i.test(itemReq);

      if (isExclusivelyDireito && userEsc !== 'superior_direito') {
        issues.push({ type: 'education', text: 'Exige Bacharelado em Direito (Incompatível com sua graduação)' });
      }

      // Se o cargo exige EXCLUSIVAMENTE Saúde / Medicina / Enfermagem
      const isExclusivelySaude = 
        /m[eé]dico|crm|coren/i.test(itemReq) && !/t[eé]cnico/i.test(itemReq);

      if (isExclusivelySaude && userEsc !== 'superior_saude') {
        issues.push({ type: 'education', text: 'Exige Graduação na Área da Saúde (Medicina/Enfermagem)' });
      }

      // Se o cargo exige EXCLUSIVAMENTE Licenciatura Plena / Pedagogia
      const isExclusivelyEducacao = 
        /licenciatura\s+plena|pedagogo|pedagogia/i.test(itemReq);

      if (isExclusivelyEducacao && userEsc !== 'superior_educacao') {
        issues.push({ type: 'education', text: 'Exige Licenciatura Plena ou Pedagogia' });
      }

      // Se o cargo exige EXCLUSIVAMENTE TI
      const isExclusivelyTI = 
        item.area === 'TI' && /superior\s+espec[ií]fico\s+em\s+ti|gradua[cç][aã]o\s+em\s+computa[cç][aã]o/i.test(itemReq);

      if (isExclusivelyTI && userEsc !== 'superior_ti') {
        issues.push({ type: 'education', text: 'Exige Graduação Específica em TI' });
      }

      // NOTA: Concursos de Auditor Fiscal (Receita Federal, SEFAZ, ISS), Bancos, Tribunais Área Administrativa
      // aceitam QUALQUER graduação superior (inclusive Tecnólogo) e são 100% compatíveis!
    }

    return {
      isCompatible: issues.length === 0,
      isExpired: issues.some(i => i.type === 'expired'),
      issues
    };
  };

  // Áreas disponíveis para filtro
  const baseAreas = [
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

  // Filtra as áreas eliminando as que possuem 0 concursos compatíveis com o perfil do concurseiro
  const availableAreasWithCount = useMemo(() => {
    const baseList = concursos.filter(item => {
      const isInterested = interestedIds.includes(item.id);
      const isIgnored = ignoredIds.includes(item.id);

      if (activeTab === 'radar' && !isInterested) return false;
      if (activeTab === 'ignored' && !isIgnored) return false;
      if (activeTab === 'explore' && isIgnored) return false;

      const compat = checkCompatibility(item);
      if (hideExpired && compat.isExpired) return false;
      if (onlyCompatible && !compat.isCompatible) return false;

      return true;
    });

    const counts = {};
    baseList.forEach(item => {
      counts[item.area] = (counts[item.area] || 0) + 1;
    });

    return baseAreas.filter(a => {
      if (a.value === 'Todas') return true;
      const count = counts[a.value] || 0;
      // Se a pré-filtragem estiver ativa, ELIMINA da barra qualquer carreira com 0 concursos disponíveis
      if (onlyCompatible) {
        return count > 0;
      }
      return true;
    }).map(a => ({
      ...a,
      count: a.value === 'Todas' ? baseList.length : (counts[a.value] || 0)
    }));
  }, [concursos, activeTab, interestedIds, ignoredIds, onlyCompatible, hideExpired, userProfile]);

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

        {/* CONTADORES EM MINI CARDS (ATUAM DIRETAMENTE COMO ABAS) */}
        <div className="radar-stat-cards">
          <div 
            className={`radar-stat-box ${activeTab === 'radar' ? 'active' : ''}`} 
            onClick={() => setActiveTab('radar')}
            title="Ver meus concursos salvos"
            style={{ position: 'relative' }}
          >
            <span className="stat-label">⭐ No Meu Radar</span>
            <span className="stat-num text-cyan">{totalInterested}</span>
            {activeTab === 'radar' && (
              <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>● Ativo</span>
            )}
          </div>
          <div 
            className={`radar-stat-box ${activeTab === 'explore' ? 'active' : ''}`} 
            onClick={() => setActiveTab('explore')}
            title="Explorar todos os editais disponíveis"
            style={{ position: 'relative' }}
          >
            <span className="stat-label">🌐 Total Disponível</span>
            <span className="stat-num text-purple">{totalExplore}</span>
            {activeTab === 'explore' && (
              <span style={{ fontSize: '10px', color: '#b185ff', fontWeight: 'bold' }}>● Ativo</span>
            )}
          </div>
          <div 
            className={`radar-stat-box ${activeTab === 'ignored' ? 'active' : ''}`} 
            onClick={() => setActiveTab('ignored')}
            title="Concursos que você dispensou"
            style={{ position: 'relative' }}
          >
            <span className="stat-label">🚫 Dispensados</span>
            <span className="stat-num text-muted">{totalIgnored}</span>
            {activeTab === 'ignored' && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>● Ativo</span>
            )}
          </div>
        </div>
      </div>

      {/* FILTROS E CONTROLES */}
      <div className="radar-controls glass-card">
        {/* TOGGLES INTELIGENTES DE ELEGIBILIDADE E VISUALIZAÇÃO */}
        <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={onlyCompatible}
                onChange={(e) => setOnlyCompatible(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontWeight: '600', color: onlyCompatible ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                🎯 Apenas compatíveis com meu perfil ({filteredConcursos.length} disponíveis)
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

          {/* TOGGLE MODO TABELA / MODO CARDS */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'var(--accent-gradient)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📋 Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                background: viewMode === 'cards' ? 'var(--accent-gradient)' : 'transparent',
                color: viewMode === 'cards' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🗂️ Cards
            </button>
          </div>
        </div>

        {/* FILTROS DE CARREIRA (CHIPS FILTRADOS - APENAS COM VAGAS) */}
        <div className="filters-container">
          <div className="filter-group-areas">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="filter-title">Carreiras / Áreas com Oportunidades:</span>
              {onlyCompatible && (
                <span style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                  ✓ Áreas sem vagas para seu perfil foram ocultadas
                </span>
              )}
            </div>

            <div className="area-chips-list">
              {availableAreasWithCount.map(a => (
                <button
                  key={a.value}
                  className={`area-chip ${selectedArea === a.value ? 'active' : ''}`}
                  onClick={() => setSelectedArea(a.value)}
                >
                  <span className="chip-icon">{a.icon}</span>
                  <span className="chip-text">{a.label} ({a.count})</span>
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

      {/* FEEDBACK DE CARREGAMENTO */}
      {loading && (
        <div className="loading-state glass-card">
          <div className="spinner"></div>
          <p>Consultando catálogo oficial e atualizações em tempo real...</p>
        </div>
      )}

      {/* LISTA / TABELA DE CONCURSOS FILTRADOS */}
      {!loading && (
        <>
          {filteredConcursos.length === 0 ? (
            <div className="empty-radar glass-card">
              <div className="empty-icon">{activeTab === 'radar' ? '⭐' : '🔎'}</div>
              <h3>Nenhum concurso encontrado para os filtros ativos</h3>
              <p>
                {onlyCompatible 
                  ? 'Você ativou o filtro de elegibilidade. Nenhum concurso desta carreira bateu com suas restrições de ombro/idade/formação, ou as provas já encerraram.' 
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
          ) : viewMode === 'table' ? (
            /* VISUALIZAÇÃO EM TABELA COMPACTA DE ALTA DENSIDADE */
            <div className="table-responsive glass-card animate-fade-in" style={{ padding: '0', overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px', marginBottom: '32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>Órgão & UF</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>Cargo(s)</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>Remuneração & Vagas</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>Requisitos / Formação</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>TAF</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConcursos.map((item, idx) => {
                    const isInterested = interestedIds.includes(item.id);
                    const isIgnored = ignoredIds.includes(item.id);
                    const compat = checkCompatibility(item);

                    return (
                      <tr 
                        key={item.id} 
                        style={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: isInterested ? 'rgba(0, 240, 255, 0.03)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'),
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = isInterested ? 'rgba(0, 240, 255, 0.03)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)')}
                      >
                        {/* Órgão & UF */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', color: 'var(--accent-cyan)' }}>
                              {item.uf || 'BR'}
                            </span>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' }}>
                              {item.orgao}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.banca && item.banca !== 'Consulte no Edital' ? `Banca: ${item.banca}` : 'Banca em definição'} • {item.area}
                          </div>
                        </td>

                        {/* Cargo(s) */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', maxWidth: '240px' }}>
                          <div style={{ color: 'var(--text-main)', fontWeight: '500', lineHeight: '1.3' }}>
                            {item.cargo}
                          </div>
                        </td>

                        {/* Remuneração & Vagas */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
                            {item.remuneracao || 'A consultar'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.vagas || 'A definir'}
                          </div>
                        </td>

                        {/* Requisitos / Compatibilidade */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', maxWidth: '220px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                            {item.escolaridade || 'Médio/Superior'}
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            {compat.isCompatible ? (
                              <span style={{ fontSize: '10px', color: '#2ecc71', fontWeight: 'bold', background: 'rgba(46, 204, 113, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                ✓ Compatível
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#ff6b6b', fontWeight: 'bold', background: 'rgba(231, 76, 60, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                🚫 {compat.issues[0]?.text || 'Incompatível'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}>
                            {item.status}
                          </span>
                        </td>

                        {/* TAF */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: item.taf_tipo === 'nenhum' ? '#2ecc71' : (item.taf_tipo === 'com_barra' ? '#ff6b6b' : '#f39c12') }}>
                            {item.taf_tipo === 'nenhum' ? '🏃‍♂️ Sem TAF' : (item.taf_tipo === 'com_barra' ? '🚫 Com Barra' : '🏃‍♂️ TAF Leve')}
                          </span>
                        </td>

                        {/* Ações */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              onClick={() => toggleInterest(item.id)}
                              title={isInterested ? 'Remover dos favoritos' : 'Salvar no radar'}
                              style={{
                                background: isInterested ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid var(--border-glass)',
                                color: isInterested ? 'var(--accent-cyan)' : 'var(--text-muted)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              {isInterested ? '⭐' : '☆'}
                            </button>

                            <button
                              onClick={() => setSelectedConcursoForCargo(item)}
                              title="Selecionar cargo e gerar matérias de estudo"
                              style={{
                                background: 'var(--accent-gradient)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(142, 45, 226, 0.25)'
                              }}
                            >
                              🚀 Estudar
                            </button>

                            <button
                              onClick={() => toggleIgnore(item.id)}
                              title={isIgnored ? 'Reativar concurso' : 'Dispensar este concurso'}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.25)',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              onMouseEnter={(e) => e.target.style.color = '#ff6b6b'}
                              onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.25)'}
                            >
                              {isIgnored ? '↩️' : '✕'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* VISUALIZAÇÃO EM CARDS */
            <div className="radar-cards-grid">
              {filteredConcursos.map(item => {
                const isInterested = interestedIds.includes(item.id);
                const isIgnored = ignoredIds.includes(item.id);
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
                            <span key={i} style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', background: iss.type === 'shoulder' || iss.type === 'education' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(243, 156, 18, 0.15)', color: iss.type === 'shoulder' || iss.type === 'education' ? '#ff6b6b' : '#f39c12', border: `1px solid ${iss.type === 'shoulder' || iss.type === 'education' ? 'rgba(231, 76, 60, 0.3)' : 'rgba(243, 156, 18, 0.3)'}` }}>
                              {iss.type === 'shoulder' || iss.type === 'education' ? '🚫' : '⚠️'} {iss.text}
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
                        onClick={() => setSelectedConcursoForCargo(item)}
                        title="Escolher cargo e iniciar estudos"
                      >
                        🚀 Estudar Agora
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL PARA SELEÇÃO DE CARGO ESPECÍFICO */}
      {selectedConcursoForCargo && (
        <CargoSelectionModal 
          isOpen={!!selectedConcursoForCargo}
          onClose={() => setSelectedConcursoForCargo(null)}
          concursoItem={selectedConcursoForCargo}
          userProfile={userProfile}
          onConfirmCargo={(newPlan) => {
            onInitPlanWithMock(newPlan);
          }}
        />
      )}
    </div>
  );
}
