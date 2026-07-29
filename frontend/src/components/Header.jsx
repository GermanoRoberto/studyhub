import React, { useState } from 'react';

export default function Header({ provider, setProvider, apiKey, setApiKey, activeConcurso, onReset, onLogoClick, currentView, setView }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempProvider, setTempProvider] = useState(provider || 'offline');
  const [tempKey, setTempKey] = useState(apiKey || '');

  const handleSaveSettings = () => {
    setProvider(tempProvider);
    setApiKey(tempKey);
    localStorage.setItem('concurso_provider', tempProvider);
    // Keep keys in memory only; browser storage is not a safe secret store.
    localStorage.removeItem('concurso_api_key');
    setIsModalOpen(false);
  };

  const getStatusText = () => {
    if (provider === 'offline') return 'Off-line (Banco de Dados Local)';
    if (provider === 'ollama') return 'Ollama (IA Local)';
    if (provider === 'openai') return 'OpenAI (GPT-4o-mini)';
    if (provider === 'groq') return 'Groq (Llama 3.3)';
    if (apiKey) return 'Conectado (Gemini 1.5)';
    return 'Modo Demonstrativo (Sem Chave)';
  };

  const getStatusClass = () => {
    if (provider === 'offline') return 'online';
    if (provider === 'ollama') return 'online';
    if (apiKey || provider === 'openai' || provider === 'groq') return 'online';
    return 'demo';
  };

  return (
    <header className="app-header">
      <div 
        className="logo-section" 
        onClick={onLogoClick}
        style={{ cursor: 'pointer' }}
        title="Voltar para a página inicial"
      >
        <div className="logo-icon">S</div>
        <div className="logo-text">
          <h1>Study Hub</h1>
          <span>Geração Automática de Estudos e Simulados</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="status-indicator">
          <span className={`status-dot ${getStatusClass()}`}></span>
          <span>{getStatusText()}</span>
        </div>

        {activeConcurso && currentView !== 'dashboard' && (
          <button 
            className="api-key-btn animate-fade-in"
            onClick={() => setView('dashboard')}
            style={{ background: 'rgba(0, 240, 255, 0.15)', color: 'var(--accent-cyan)', borderColor: 'rgba(0, 240, 255, 0.3)' }}
          >
            📅 Área de Estudos
          </button>
        )}

        <button 
          className={`api-key-btn ${currentView === 'radar' ? 'active' : ''}`}
          onClick={() => setView('radar')}
          style={{ 
            background: currentView === 'radar' ? 'rgba(155, 89, 182, 0.15)' : 'var(--bg-glass)',
            borderColor: currentView === 'radar' ? 'var(--accent-purple)' : 'var(--border-glass)',
            color: currentView === 'radar' ? 'var(--accent-purple)' : 'var(--text-main)',
            boxShadow: currentView === 'radar' ? '0 0 10px rgba(155, 89, 182, 0.2)' : 'none'
          }}
        >
          📡 Radar de Editais
        </button>

        <button 
          className="api-key-btn"
          onClick={() => {
            setTempProvider(provider || 'offline');
            setTempKey(apiKey || '');
            setIsModalOpen(true);
          }}
        >
          ⚙️ Configurações IA
        </button>

        {activeConcurso && (
          <button className="reset-btn" onClick={onReset}>
            📂 Novo Edital
          </button>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Configurações de Processamento</h3>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="provider-select">Motor de Processamento (IA):</label>
                <select 
                  id="provider-select"
                  className="text-input"
                  value={tempProvider}
                  onChange={(e) => setTempProvider(e.target.value)}
                >
                  <option value="offline">Off-line / Local (Sem chaves - Super Estável)</option>
                  <option value="groq">Groq Cloud API (Llama 3 - Recomendado / Grátis)</option>
                  <option value="gemini">Google Gemini API (Nuvem)</option>
                  <option value="openai">OpenAI ChatGPT API (Nuvem)</option>
                  <option value="ollama">Ollama (Inteligência Artificial Local no PC)</option>
                </select>
              </div>

              {tempProvider === 'offline' && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '4px 0 12px' }}>
                  💡 <strong>Modo Recomendado:</strong> Usa o processador heurístico local e o banco de dados interno de questões do app. 
                  Funciona 100% off-line com qualquer edital de forma super estável e sem erros de conexão.
                </p>
              )}

              {tempProvider === 'groq' && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '4px 0 12px' }}>
                  ⚡ <strong>Groq API:</strong> Desempenho extremamente rápido usando o modelo Llama 3.3. Requer uma chave gratuita da Groq Cloud.
                </p>
              )}

              {tempProvider === 'ollama' && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '4px 0 12px' }}>
                  🖥️ Requer que o <strong>Ollama</strong> esteja rodando em sua máquina na porta padrão <code style={{ color: 'var(--accent-cyan)' }}>11434</code> com o modelo <code style={{ color: 'var(--accent-cyan)' }}>qwen2.5:7b</code> ou similar instalado. Totalmente gratuito e local.
                </p>
              )}

              {(tempProvider === 'gemini' || tempProvider === 'openai' || tempProvider === 'groq') && (
                <div className="input-group">
                  <label htmlFor="api-key-input">
                    {tempProvider === 'gemini' ? 'Chave de API do Gemini (Google AI Studio)' : 
                     tempProvider === 'openai' ? 'Chave de API da OpenAI (ChatGPT)' : 
                     'Chave de API da Groq (gsk_...)'}
                  </label>
                  <input 
                    id="api-key-input"
                    type="password" 
                    className="text-input" 
                    placeholder={tempProvider === 'gemini' ? "AIzaSy..." : tempProvider === 'openai' ? "sk-..." : "gsk_..."} 
                    value={tempKey} 
                    onChange={(e) => setTempKey(e.target.value)}
                  />
                </div>
              )}

              <button className="save-modal-btn" onClick={handleSaveSettings}>
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
