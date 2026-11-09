import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    // Auto-recuperação de dados corrompidos legados em cache
    if (error && error.message && (error.message.includes('inscricao_inicio') || error.message.includes('undefined'))) {
      try {
        localStorage.removeItem('concurso_study_plan');
        localStorage.removeItem('concurso_parsed_edital');
      } catch (e) {}
    }
  }

  handleReset = () => {
    try {
      // Remove dados locais corrompidos
      localStorage.removeItem('concurso_study_plan');
      localStorage.removeItem('concurso_parsed_edital');
      localStorage.removeItem('concurso_editais_history');
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (e) {}
    // Força recarregamento limpo desabilitando qualquer cache de navegador
    const cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
    window.location.replace(cleanUrl);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0a0e1a',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '500px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}>
            <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>⚠️</span>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '12px', color: '#863bff' }}>
              Algo deu errado ao carregar o aplicativo
            </h2>
            <p style={{ fontSize: '14px', color: '#a0aec0', lineHeight: '1.6', marginBottom: '24px' }}>
              Isso costuma acontecer se houver dados residuais ou modificados no armazenamento do navegador. 
              Clique abaixo para limpar os dados locais de forma segura e reiniciar.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                background: 'linear-gradient(135deg, #863bff 0%, #00f0ff 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
                transition: 'transform 0.2s'
              }}
            >
              🔄 Limpar Armazenamento e Recarregar
            </button>
            {this.state.error && (
              <details style={{ marginTop: '24px', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                <summary style={{ cursor: 'pointer', color: '#a0aec0', outline: 'none' }}>Ver detalhes do erro</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', color: '#ff5555', fontFamily: 'monospace' }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
