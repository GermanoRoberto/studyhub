import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import Dashboard from './components/Dashboard';
import RadarMonitor from './components/RadarMonitor';
import { generateDashboard } from './services/api';
import './App.css';

function App() {
  const [provider, setProvider] = useState('offline');
  const [apiKey, setApiKey] = useState('');
  const [parsedEdital, setParsedEdital] = useState(null);
  const [selectedCargo, setSelectedCargo] = useState('');
  const [studyPlan, setStudyPlan] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [uploadedEditais, setUploadedEditais] = useState([]);
  const [view, setView] = useState('upload'); // 'upload' | 'dashboard'

  // Carrega configurações e estado salvo do localStorage
  useEffect(() => {
    const savedProvider = localStorage.getItem('concurso_provider');
    if (savedProvider) {
      setProvider(savedProvider);
    }
    // API keys are intentionally session-only and never restored from storage.
    localStorage.removeItem('concurso_api_key');

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
  }, []);

  // Helpers para atualizar e persistir o estado
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
        return updated;
      });
    } else {
      localStorage.removeItem('concurso_parsed_edital');
    }
  };

  const updateStudyPlan = (plan) => {
    setStudyPlan(plan);
    if (plan) {
      localStorage.setItem('concurso_study_plan', JSON.stringify(plan));
      setView('dashboard'); // Vai para o dashboard quando o plano é gerado
    } else {
      localStorage.removeItem('concurso_study_plan');
      setView('upload');
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
        concurso: parsedEdital.concurso,
        banca: parsedEdital.banca,
        datas: parsedEdital.datas,
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

  // Handler ao clicar no logo (apenas navega para a home, sem deletar nada!)
  const handleLogoClick = () => {
    setView('upload');
  };

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
        <p>Concurso Study Hub &copy; 2026. Desenvolvido com inteligência artificial para otimização de aprovações.</p>
      </footer>
    </div>
  );
}

export default App;
