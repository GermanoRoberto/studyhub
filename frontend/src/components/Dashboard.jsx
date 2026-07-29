import React, { useState } from 'react';
import DateTracker from './DateTracker';
import SubjectList from './SubjectList';
import ExamSimulator from './ExamSimulator';
import PerformanceTracker from './PerformanceTracker';

export default function Dashboard({ studyPlan, apiKey, provider, onDatesUpdated, concursoKey }) {
  const [activeTab, setActiveTab] = useState('cronograma'); // 'cronograma' | 'materias' | 'simulado' | 'performance'

  const getTodayPt = () => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[new Date().getDay()];
  };

  const today = getTodayPt();

  return (
    <div className="dashboard-grid animate-fade-in">
      {/* Sidebar - Date Tracker */}
      <div className="sidebar-panel">
        <DateTracker 
          dates={studyPlan.datas} 
          concursoName={studyPlan.concurso} 
          banca={studyPlan.banca} 
          apiKey={apiKey}
          onDatesUpdated={onDatesUpdated}
          cargoDetails={studyPlan.cargoDetails}
          cargoName={studyPlan.cargo}
        />
      </div>

      {/* Main Content Area */}
      <div className="main-panel">
        {/* Navigation Tabs */}
        <nav className="dashboard-nav">
          <button 
            className={`nav-tab ${activeTab === 'cronograma' ? 'active' : ''}`}
            onClick={() => setActiveTab('cronograma')}
          >
            📅 Cronograma Semanal
          </button>
          <button 
            className={`nav-tab ${activeTab === 'materias' ? 'active' : ''}`}
            onClick={() => setActiveTab('materias')}
          >
            📚 Matérias do Edital
          </button>
          <button 
            className={`nav-tab ${activeTab === 'simulado' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulado')}
          >
            ⚡ Exercícios & Simulados
          </button>
          <button 
            className={`nav-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            📊 Diagnóstico & Auditoria
          </button>
        </nav>

        {/* Tab Contents */}
        {activeTab === 'cronograma' && (
          <div className="calendar-card glass-card animate-fade-in">
            <div className="section-header">
              <h3 style={{ fontSize: '20px' }}>Planejamento de Estudos Semanal</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Hoje é: <strong style={{ color: 'var(--accent-cyan)' }}>{today}</strong>
              </span>
            </div>
            
            <div className="calendar-grid">
              {studyPlan.cronograma && studyPlan.cronograma.map((item, idx) => {
                const isToday = item.dia.toLowerCase() === today.toLowerCase();
                const isWeekend = item.dia === 'Sábado' || item.dia === 'Domingo';

                return (
                  <div key={idx} className={`calendar-day-box ${isToday ? 'today' : ''}`}>
                    <div className="day-name">
                      {item.dia} {isToday && ' (Hoje)'}
                    </div>
                    
                    {item.materias && item.materias.map((m, mIdx) => (
                      <div key={mIdx} className={`day-subject-item ${m === 'Descanso' ? 'descanso' : ''}`}>
                        {m}
                      </div>
                    ))}
                    
                    {!isWeekend && item.materias && item.materias[0] !== 'Descanso' && (
                      <div className="day-subject-item revision">
                        Revisão de Conteúdo
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'materias' && (
          <SubjectList 
            materias={studyPlan.materias} 
            cargo={studyPlan.cargo}
            concursoKey={concursoKey}
            provider={provider}
            apiKey={apiKey}
            banca={studyPlan.banca || (studyPlan.cargoDetails && studyPlan.cargoDetails.banca) || 'FGV'}
          />
        )}

        {activeTab === 'simulado' && (
          <ExamSimulator 
            materias={studyPlan.materias} 
            cargo={studyPlan.cargo}
            apiKey={apiKey}
            concursoKey={concursoKey}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceTracker 
            materias={studyPlan.materias} 
            cargo={studyPlan.cargo}
            concursoKey={concursoKey}
          />
        )}
      </div>
    </div>
  );
}
