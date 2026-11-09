import React, { useState } from 'react';
import { getSuggestedCargos, getSubjectsForCargo, buildScheduleFromSubjects } from '../utils/cargoSubjectMapper';

export default function CargoSelectionModal({ isOpen, onClose, concursoItem, userProfile, onConfirmCargo }) {
  const [customCargo, setCustomCargo] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);

  if (!isOpen || !concursoItem) return null;

  const suggestedCargos = getSuggestedCargos(concursoItem, userProfile);

  const handleSelectPredefined = (cargoObj) => {
    setSelectedRole(cargoObj);
    setCustomCargo(cargoObj.nome);
  };

  const handleConfirm = () => {
    const finalCargoName = (customCargo || (selectedRole ? selectedRole.nome : '')).trim() || 'Assistente Administrativo';
    const area = concursoItem.area || 'Administrativa';
    const materias = getSubjectsForCargo(finalCargoName, area);
    const cronograma = buildScheduleFromSubjects(materias);

    const plan = {
      concurso: concursoItem.concurso || concursoItem.orgao || 'Concurso Selecionado',
      cargo: finalCargoName,
      banca: concursoItem.banca || 'A definir',
      datas: concursoItem.datas || { inscricao_inicio: '', inscricao_fim: '', prova: '' },
      cargoDetails: {
        nome: finalCargoName,
        vagas: selectedRole ? selectedRole.vagas : (concursoItem.vagas || 'Conforme edital'),
        salario: selectedRole ? selectedRole.salario : (concursoItem.remuneracao || 'A consultar'),
        requisitos: selectedRole ? selectedRole.escolaridade : (concursoItem.requisitos || 'Conforme edital'),
        locais_prova: concursoItem.uf ? `Locais no estado de ${concursoItem.uf}` : 'Conforme edital',
        taf: concursoItem.taf_descricao || (concursoItem.taf_tipo === 'nenhum' ? 'Não exigido' : 'Exigido')
      },
      materias,
      cronograma
    };

    onConfirmCargo(plan);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }}>
      <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '580px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* CABEÇALHO */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🎯 Personalização de Foco
            </span>
            <h3 className="modal-title" style={{ fontSize: '18px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 'bold' }}>
              Qual cargo você vai disputar?
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              {concursoItem.orgao || concursoItem.concurso} • {concursoItem.vagas || 'Diversas Vagas'}
            </p>
          </div>
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>

        {/* CORPO */}
        <div className="modal-body" style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ background: 'rgba(0, 240, 255, 0.04)', border: '1px solid rgba(0, 240, 255, 0.18)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
            💡 <strong>Plano Específico:</strong> As matérias e tópicos do seu cronograma serão gerados especificamente para as disciplinas cobradas pelo cargo escolhido.
          </div>

          {/* LISTA DE CARGOS SUGERIDOS */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
              Cargos frequentes e compatíveis com seu perfil:
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestedCargos.map((sug, idx) => {
                const isSelected = selectedRole?.nome === sug.nome || customCargo === sug.nome;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectPredefined(sug)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                        {sug.nome}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        💰 Salário: <strong style={{ color: 'var(--text-main)' }}>{sug.salario}</strong> • Nível: {sug.escolaridade}
                      </div>
                    </div>

                    <span style={{ fontSize: '18px', color: isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)' }}>
                      {isSelected ? '✓' : '→'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OU DIGITE OUTRO CARGO */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Ou digite outro cargo deste edital:
            </label>
            <input 
              type="text"
              placeholder="Ex: Fiscal de Posturas, Técnico em Contabilidade, etc..."
              value={customCargo}
              onChange={(e) => {
                setCustomCargo(e.target.value);
                setSelectedRole(null);
              }}
              className="text-input"
              style={{ width: '100%', fontSize: '13px', padding: '10px 12px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
            />
          </div>

        </div>

        {/* RODAPÉ */}
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
            onClick={handleConfirm}
            style={{ 
              padding: '8px 22px', 
              fontSize: '13px', 
              fontWeight: 'bold', 
              background: 'var(--accent-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            🚀 Iniciar Plano para este Cargo
          </button>
        </div>

      </div>
    </div>
  );
}
