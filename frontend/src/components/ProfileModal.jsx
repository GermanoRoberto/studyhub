import React, { useState, useEffect } from 'react';
import { saveCloudUserData } from '../services/api';

export default function ProfileModal({ isOpen, onClose, currentProfile, onSaveProfile }) {
  const [idade, setIdade] = useState(currentProfile?.idade || 28);
  const [escolaridade, setEscolaridade] = useState(currentProfile?.escolaridade || 'medio');
  const [semBarra, setSemBarra] = useState(currentProfile?.sem_barra !== undefined ? currentProfile.sem_barra : true); // Padrão com limitação de ombro
  const [semTaf, setSemTaf] = useState(currentProfile?.sem_taf || false);

  useEffect(() => {
    if (currentProfile) {
      if (currentProfile.idade) setIdade(currentProfile.idade);
      if (currentProfile.escolaridade) setEscolaridade(currentProfile.escolaridade);
      if (currentProfile.sem_barra !== undefined) setSemBarra(currentProfile.sem_barra);
      if (currentProfile.sem_taf !== undefined) setSemTaf(currentProfile.sem_taf);
    }
  }, [currentProfile]);

  if (!isOpen) return null;

  const handleSave = () => {
    const profile = {
      idade: Number(idade) || 28,
      escolaridade,
      sem_barra: Boolean(semBarra),
      sem_taf: Boolean(semTaf),
      updated_at: new Date().toISOString()
    };

    localStorage.setItem('studyhub_user_profile', JSON.stringify(profile));
    // Sincroniza com a nuvem Supabase
    saveCloudUserData('user_profile', profile);

    onSaveProfile(profile);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '520px', width: '90%' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🎯</span>
            <div>
              <h3 className="modal-title" style={{ fontSize: '18px', margin: 0, color: 'var(--accent-cyan)' }}>
                Meu Perfil de Elegibilidade
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Filtre apenas os concursos que você realmente pode prestar
              </p>
            </div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '16px 0' }}>
          
          {/* CAMPO IDADE */}
          <div className="input-group">
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              🎂 Sua Idade Atual:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="number"
                min="16"
                max="75"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="text-input"
                style={{ width: '100px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {idade > 30 ? '💡 Concursos militares com limite de 30 anos serão sinalizados.' : '💡 Apto para a maioria dos limites de idade.'}
              </span>
            </div>
          </div>

          {/* CAMPO ESCOLARIDADE E FORMAÇÃO */}
          <div className="input-group">
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              🎓 Sua Formação / Graduação:
            </label>
            <select 
              value={escolaridade}
              onChange={(e) => setEscolaridade(e.target.value)}
              className="text-input"
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="medio">Ensino Médio / Técnico Completo</option>
              <option value="superior_qualquer">Nível Superior em Qualquer Área (Tecnólogo / Licenciatura / Bacharel)</option>
              <option value="superior_ti">Superior em TI / Computação / Análise de Sistemas</option>
              <option value="superior_adm">Superior em Administração / Contábeis / Economia</option>
              <option value="superior_direito">Superior em Direito (Bacharelado)</option>
              <option value="superior_saude">Superior em Saúde (Medicina / Enfermagem / Odontologia)</option>
              <option value="superior_educacao">Superior em Educação / Licenciatura Plena / Pedagogia</option>
            </select>
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              💡 <strong>Regra Inteligente:</strong> Concursos como <em>Auditor Fiscal (Receita/SEFAZ)</em>, <em>Bancos</em> e <em>Analista Administrativo</em> aceitam <strong>qualquer graduação</strong>. Concursos como <em>Juiz, Promotor e Delegado</em> exigem estritamente <strong>Direito</strong>.
            </p>
          </div>

          {/* CONDIÇÃO FÍSICA E TAF */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span>🏃‍♂️</span> Condição Física & Teste de Aptidão (TAF):
            </label>

            {/* TOGGLE BARRA FIXA */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: '8px 0', padding: '8px', background: semBarra ? 'rgba(231, 76, 60, 0.1)' : 'transparent', borderRadius: '6px', border: semBarra ? '1px solid rgba(231, 76, 60, 0.3)' : '1px solid transparent' }}>
              <input 
                type="checkbox"
                checked={semBarra}
                onChange={(e) => setSemBarra(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: semBarra ? '#ff6b6b' : 'var(--text-main)' }}>
                  🚫 Limitação no Ombro: NÃO consigo fazer Barra Fixa
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  Desclassifica ou alerta com aviso vermelho concursos que exigem barra fixa no edital (ex: Soldado PM, Polícia Federal, Bombeiros).
                </p>
              </div>
            </label>

            {/* TOGGLE SEM NENHUM TAF */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: '8px 0', padding: '8px', background: semTaf ? 'rgba(52, 152, 219, 0.1)' : 'transparent', borderRadius: '6px', border: semTaf ? '1px solid rgba(52, 152, 219, 0.3)' : '1px solid transparent' }}>
              <input 
                type="checkbox"
                checked={semTaf}
                onChange={(e) => setSemTaf(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: semTaf ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                  📚 Apenas Concursos SEM NENHUM Teste Físico
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  Filtra apenas órgãos que exigem exclusivamente provas teóricas (Bancos, TI, Fiscais, Tribunais, Administrativo).
                </p>
              </div>
            </label>
          </div>

        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            type="button" 
            className="secondary-btn" 
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="primary-btn" 
            onClick={handleSave}
            style={{ 
              padding: '8px 20px', 
              fontSize: '13px', 
              fontWeight: 'bold', 
              background: 'var(--accent-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            💾 Salvar e Filtrar Radar
          </button>
        </div>
      </div>
    </div>
  );
}
