import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import Dashboard from './components/Dashboard';
import RadarMonitor from './components/RadarMonitor';
import Login from './components/Login';
import { generateDashboard, verifyAuthToken, fetchCloudUserData, saveCloudUserData } from './services/api';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('studyhub_auth_user'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('studyhub_auth_token'));
  const [authChecking, setAuthChecking] = useState(true);

  const [provider, setProvider] = useState(() => localStorage.getItem('concurso_provider') || 'gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('concurso_api_key') || '');
  const [parsedEdital, setParsedEdital] = useState(null);
  const [selectedCargo, setSelectedCargo] = useState('');
  const [studyPlan, setStudyPlan] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [uploadedEditais, setUploadedEditais] = useState([]);
  const [view, setView] = useState('radar'); // Inicia no radar de concursos ou upload

  // Carrega configurações e estado salvo do localStorage
  useEffect(() => {
    // Validação silenciosa do token de autenticação
    const token = localStorage.getItem('studyhub_auth_token');
    if (token) {
      verifyAuthToken(token).then(valid => {
        if (!valid) {
          localStorage.removeItem('studyhub_auth_token');
          localStorage.removeItem('studyhub_auth_user');
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else {
          setIsAuthenticated(true);
        }
        setAuthChecking(false);
      }).catch(() => setAuthChecking(false));
    } else {
      setAuthChecking(false);
    }

    const savedProvider = localStorage.getItem('concurso_provider');
    if (savedProvider) {
      setProvider(savedProvider);
    }
    const savedApiKey = localStorage.getItem('concurso_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    const savedEdital = localStorage.getItem('concurso_parsed_edital');
    const savedPlan = localStorage.getItem('concurso_study_plan');
    if (savedEdital) {
      try {
        setParsedEdital(JSON.parse(savedEdital));
      } catch (e) {
        console.error("Erro ao carregar edital do localStorage", e);
      }
    }
    if (savedPlan) {
      try {
        const parsedPlan = JSON.parse(savedPlan);
        if (parsedPlan && typeof parsedPlan === 'object') {
          // Se o plano salvo não tem cargoDetails mas temos o edital salvo, faz o upgrade dinâmico em tempo de carregamento
          if (!parsedPlan.cargoDetails && savedEdital) {
            try {
              const parsedEditalObj = JSON.parse(savedEdital);
              if (parsedEditalObj && Array.isArray(parsedEditalObj.cargos)) {
                const cargoDetail = parsedEditalObj.cargos.find(c => c.nome === parsedPlan.cargo) || {};
                parsedPlan.cargoDetails = {
                  nome: parsedPlan.cargo || 'Cargo',
                  vagas: cargoDetail.vagas || 'Ver no Edital',
                  salario: cargoDetail.salario || 'Ver no Edital',
                  requisitos: cargoDetail.requisitos || 'Não informados no resumo',
                  locais_prova: cargoDetail.locais_prova || 'Consultar locais no edital',
                  taf: cargoDetail.taf || 'Não exigido'
                };
                localStorage.setItem('concurso_study_plan', JSON.stringify(parsedPlan));
              }
            } catch (err) {}
          }
          setStudyPlan(parsedPlan);
          setView('dashboard'); // Se tem plano salvo, vai direto pro dashboard
        }
      } catch (e) {
        console.error("Erro ao carregar plano de estudo do localStorage", e);
      }
    }

    const savedHistory = localStorage.getItem('concurso_editais_history');
    if (savedHistory) {
      try {
        setUploadedEditais(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Erro ao carregar histórico de editais", e);
      }
    }

    // Sincronização em Nuvem (Supabase): restaura estado se acessado de outro dispositivo
    if (token) {
      fetchCloudUserData().then(cloudData => {
        if (cloudData && cloudData.study_state) {
          const { parsed_edital, study_plan, editais_history, provider: p, apiKey: k } = cloudData.study_state;
          if (parsed_edital && !savedEdital) {
            setParsedEdital(parsed_edital);
            localStorage.setItem('concurso_parsed_edital', JSON.stringify(parsed_edital));
          }
          if (study_plan && !savedPlan) {
            setStudyPlan(study_plan);
            localStorage.setItem('concurso_study_plan', JSON.stringify(study_plan));
            setView('dashboard');
          }
          if (editais_history && Array.isArray(editais_history) && !savedHistory) {
            setUploadedEditais(editais_history);
            localStorage.setItem('concurso_editais_history', JSON.stringify(editais_history));
          }
          if (p && !savedProvider) {
            setProvider(p);
            localStorage.setItem('concurso_provider', p);
          }
          if (k && !savedApiKey) {
            setApiKey(k);
            localStorage.setItem('concurso_api_key', k);
          }
        }
      }).catch(err => console.warn('Supabase sync notice:', err));
    }
  }, []);

  // Helpers para atualizar e persistir o estado (Local + Nuvem Supabase)
  const updateParsedEdital = (data) => {
    setParsedEdital(data);
    if (data) {
      localStorage.setItem('concurso_parsed_edital', JSON.stringify(data));
      // Adiciona ao histórico sem duplicar de forma segura
      setUploadedEditais(prev => {
        const dataConcurso = data.concurso || 'Concurso Sem Nome';
        const filtered = prev.filter(item => {
          const itemConcurso = item.concurso || 'Concurso Sem Nome';
          return itemConcurso.toLowerCase() !== dataConcurso.toLowerCase();
        });
        const updated = [data, ...filtered];
        localStorage.setItem('concurso_editais_history', JSON.stringify(updated));
        // Salva na nuvem Supabase em segundo plano
        saveCloudUserData('study_state', {
          parsed_edital: data,
          study_plan: studyPlan,
          editais_history: updated,
          provider,
          apiKey
        });
        return updated;
      });
    } else {
      localStorage.removeItem('concurso_parsed_edital');
      saveCloudUserData('study_state', {
        parsed_edital: null,
        study_plan: null,
        editais_history: uploadedEditais,
        provider,
        apiKey
      });
    }
  };

  const updateStudyPlan = (plan) => {
    setStudyPlan(plan);
    if (plan) {
      localStorage.setItem('concurso_study_plan', JSON.stringify(plan));
      setView('dashboard'); // Vai para o dashboard quando o plano é gerado
      // Sincroniza plano na nuvem Supabase
      saveCloudUserData('study_state', {
        parsed_edital: parsedEdital,
        study_plan: plan,
        editais_history: uploadedEditais,
        provider,
        apiKey
      });
    } else {
      localStorage.removeItem('concurso_study_plan');
      setView('upload');
      saveCloudUserData('study_state', {
        parsed_edital: parsedEdital,
        study_plan: null,
        editais_history: uploadedEditais,
        provider,
        apiKey
      });
    }
  };

  const handleDeleteEdital = (concursoName) => {
    const safeTarget = (concursoName || '').toLowerCase();

    setUploadedEditais(prev => {
      const updated = prev.filter(item => {
        const itemConcurso = (item.concurso || '').toLowerCase();
        return itemConcurso !== safeTarget;
      });
      localStorage.setItem('concurso_editais_history', JSON.stringify(updated));
      return updated;
    });

    // Se o edital deletado for o ativo, limpa o plano atual de forma segura
    const activeConcurso = (studyPlan && studyPlan.concurso || '').toLowerCase();
    const currentParsedConcurso = (parsedEdital && parsedEdital.concurso || '').toLowerCase();

    if (studyPlan && activeConcurso === safeTarget) {
      handleReset();
    } else if (parsedEdital && currentParsedConcurso === safeTarget) {
      setParsedEdital(null);
    }
  };

  // Handler de reset para limpar o concurso ativo
  const handleReset = () => {
    setParsedEdital(null);
    setSelectedCargo('');
    updateStudyPlan(null);
    localStorage.removeItem('concurso_parsed_edital');
    setView('upload');
  };

  // Handler de seleção de cargo
  const handleCargoSelect = async (cargoName) => {
    setSelectedCargo(cargoName);
    setLoadingDashboard(true);
    try {
      const result = await generateDashboard(
        cargoName, 
        parsedEdital.editalText || '', 
        provider,
        apiKey
      );
      
      // Encontra a ficha técnica do cargo selecionado
      const cargoDetail = parsedEdital.cargos?.find(c => c.nome === cargoName) || {};

      // Mescla datas e dados originais do edital
      const finalResult = {
        ...result,
        concurso: parsedEdital.concurso || 'Concurso Público',
        banca: parsedEdital.banca || 'A Definir',
        datas: parsedEdital.datas || { inscricao_inicio: '', inscricao_fim: '', prova: '' },
        cargoDetails: {
          nome: cargoName,
          vagas: cargoDetail.vagas || 'Ver no Edital',
          salario: cargoDetail.salario || 'Ver no Edital',
          requisitos: cargoDetail.requisitos || 'Não informados no resumo',
          locais_prova: cargoDetail.locais_prova || 'Consultar locais no edital',
          taf: cargoDetail.taf || 'Não exigido'
        }
      };

      updateStudyPlan(finalResult);
    } catch (err) {
      console.error(err);
      alert('Erro ao mapear matérias do edital para o cargo. Tente novamente.');
      setSelectedCargo('');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleDatesUpdated = (newDates) => {
    const updatedPlan = {
      ...studyPlan,
      datas: {
        ...studyPlan.datas,
        ...newDates
      }
    };
    updateStudyPlan(updatedPlan);
  };

  const getUniqueConcursoKey = () => {
    if (!studyPlan) return '';
    return studyPlan.concurso.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  const handleLogout = () => {
    localStorage.removeItem('studyhub_auth_token');
    localStorage.removeItem('studyhub_auth_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleInitPlanFromRadar = (item) => {
    const isTI = item.area === 'TI';
    const materias = isTI ? [
      { nome: 'Língua Portuguesa', topicos: ['Interpretação de textos', 'Sintaxe', 'Crase', 'Pontuação'] },
      { nome: 'Raciocínio Lógico e Matemática', topicos: ['Lógica proposicional', 'Análise combinatória', 'Probabilidade'] },
      { nome: 'Engenharia de Software e Banco de Dados', topicos: ['SQL e Modelagem Relacional', 'Arquitetura de Microsserviços', 'Git e CI/CD', 'APIs REST'] },
      { nome: 'Segurança da Informação e Redes', topicos: ['Protocolos TCP/IP', 'Criptografia e Certificados', 'LGPD', 'Prevenção de Ataques'] }
    ] : [
      { nome: 'Língua Portuguesa', topicos: ['Compreensão e interpretação de textos', 'Ortografia e acentuação', 'Crase', 'Concordância verbal e nominal', 'Pontuação'] },
      { nome: 'Raciocínio Lógico e Matemática', topicos: ['Estruturas lógicas', 'Lógica de argumentação', 'Porcentagem e frações', 'Probabilidade e análise combinatória'] },
      { nome: 'Direito Administrativo', topicos: ['Princípios da Administração Pública', 'Atos administrativos', 'Poderes administrativos', 'Licitações e contratos'] },
      { nome: 'Direito Constitucional', topicos: ['Direitos e deveres individuais (Art. 5º)', 'Direitos sociais', 'Organização dos poderes', 'Administração Pública (Arts. 37 a 41)'] }
    ];

    const cronograma = [
      { dia: 'Segunda-feira', materias: [materias[0].nome] },
      { dia: 'Terça-feira', materias: [materias[1].nome] },
      { dia: 'Quarta-feira', materias: [materias[2].nome] },
      { dia: 'Quinta-feira', materias: [materias[3].nome] },
      { dia: 'Sexta-feira', materias: [materias[0].nome, 'Revisão Geral'] },
      { dia: 'Sábado', materias: ['Simulados & Exercícios'] },
      { dia: 'Domingo', materias: ['Descanso'] }
    ];

    const newPlan = {
      concurso: item.concurso || item.orgao || 'Concurso Selecionado',
      cargo: item.cargo || 'Cargo',
      banca: item.banca || 'A definir',
      datas: item.datas || { inscricao_inicio: '', inscricao_fim: '', prova: '' },
      cargoDetails: {
        nome: item.cargo || 'Cargo',
        vagas: item.vagas || 'A consultar',
        salario: item.salario || 'A consultar',
        requisitos: item.requisitos || 'Conforme edital',
        locais_prova: item.uf ? `Locais no estado de ${item.uf}` : 'Nacional',
        taf: item.taf_descricao || (item.taf_tipo === 'nenhum' ? 'Não exigido' : 'Exigido')
      },
      materias,
      cronograma
    };
    updateStudyPlan(newPlan);
    setView('dashboard');
  };

  // Handler ao clicar no logo (apenas navega para a home, sem deletar nada!)
  const handleLogoClick = () => {
    setView('radar');
  };

  // Se estiver checando autenticação inicial
  if (authChecking) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de login segura
  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Login
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header 
        provider={provider}
        setProvider={setProvider}
        apiKey={apiKey} 
        setApiKey={setApiKey} 
        activeConcurso={studyPlan}
        onReset={handleReset}
        onLogoClick={handleLogoClick}
        currentView={view}
        setView={setView}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1 }}>
        {loadingDashboard ? (
          <div className="loading-overlay" style={{ marginTop: '60px' }}>
            <div className="spinner"></div>
            <p>Mapeando matérias, ementas e organizando cronograma de estudos para {selectedCargo}...</p>
          </div>
        ) : view === 'dashboard' && studyPlan ? (
          <Dashboard 
            studyPlan={studyPlan} 
            apiKey={apiKey}
            provider={provider}
            onDatesUpdated={handleDatesUpdated}
            concursoKey={getUniqueConcursoKey()}
          />
        ) : view === 'radar' ? (
          <RadarMonitor 
            provider={provider}
            apiKey={apiKey}
            setView={setView}
            onInitPlanWithMock={handleInitPlanFromRadar}
          />
        ) : (
          <UploadPanel 
            provider={provider}
            apiKey={apiKey} 
            uploadedEditais={uploadedEditais}
            studyPlan={studyPlan}
            setView={setView}
            onDeleteEdital={handleDeleteEdital}
            onCargoSelect={handleCargoSelect}
            onEditalParsed={updateParsedEdital}
          />
        )}
      </main>

      <footer style={{ marginTop: '48px', padding: '24px 0', borderTop: '1px solid var(--border-glass)', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        <p>Concurso Study Hub &copy; 2026 • Painel Pessoal de Alta Performance para Concursos Públicos</p>
      </footer>
    </div>
  );
}

export default App;
