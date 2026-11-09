import React, { useState } from 'react';
import { login } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('germanorcarmo');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Por favor, informe seu usuário e senha.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      localStorage.setItem('studyhub_auth_token', data.token);
      localStorage.setItem('studyhub_auth_user', data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Erro ao entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-badge-icon">🔒</div>
          <h2 className="login-title">Acesso Restrito</h2>
          <p className="login-subtitle">
            Study Hub • Área Pessoal de Preparação para Concursos
          </p>
        </div>

        {error && (
          <div className="login-error-alert animate-fade-in">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              Usuário / E-mail
            </label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="login-username"
                type="text"
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: germanorcarmo"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Senha de Acesso
            </label>
            <div className="input-wrapper">
              <span className="input-icon">🔑</span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha segura"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner"></span> Validando Credenciais...
              </span>
            ) : (
              <span>Entrar no Study Hub →</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <span className="security-tag">🛡️ Autenticação Criptográfica com Proteção contra Força Bruta</span>
        </div>
      </div>
    </div>
  );
}
