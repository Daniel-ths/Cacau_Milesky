// frontend/src/components/ClientForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './ClientForm.module.css';

// --- Funções Utilitárias de Formatação (Mantidas) ---

const formatCPF = (value) => {
    value = value.replace(/\D/g, ""); // Remove não dígitos
    value = value.substring(0, 11);   // Limita tamanho
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return value;
};

const formatPhone = (value) => {
    value = value.replace(/\D/g, "");
    value = value.substring(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value;
};

const ClientForm = ({ onClose, onSave, clientToEdit }) => {
    
    const [clientData, setClientData] = useState({
        id: null,
        nome: '',
        cpf: '',
        telefone: '',
        endereco: '',
        // NOVOS CAMPOS:
        taxa_juros: '0',
        perfil_risco: 'Normal'
    });

    // Carrega os dados se for Edição
    useEffect(() => {
        if (clientToEdit) {
            setClientData({
                id: clientToEdit.id || clientToEdit._id, // Garante pegar o ID corretamente
                nome: clientToEdit.nome || '',
                cpf: clientToEdit.cpf || '',
                telefone: clientToEdit.telefone || '',
                endereco: clientToEdit.endereco || '',
                // Mapeia os novos campos (ou usa padrão se não existir)
                taxa_juros: clientToEdit.taxa_juros || '0',
                perfil_risco: clientToEdit.perfil_risco || 'Normal'
            });
        }
    }, [clientToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        // Aplica máscaras automaticamente
        if (name === 'cpf') newValue = formatCPF(value);
        if (name === 'telefone') newValue = formatPhone(value);

        setClientData(prev => ({ ...prev, [name]: newValue }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validação simples
        if (!clientData.nome) {
            alert('O Nome é obrigatório.');
            return;
        }
        
        // Envia para o componente Pai
        // Importante: Convertemos a taxa para número para garantir cálculos corretos no futuro
        onSave({
            ...clientData,
            taxa_juros: parseFloat(clientData.taxa_juros || 0)
        });
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <h3>{clientData.id ? 'Editar Produtor' : 'Novo Produtor'}</h3>
                
                <form onSubmit={handleSubmit}>
                    
                    {/* Nome */}
                    <label>Nome Completo:</label>
                    <input 
                        type="text" 
                        name="nome" 
                        value={clientData.nome} 
                        onChange={handleChange} 
                        required 
                        autoFocus
                        style={{ marginBottom: '10px', width: '100%', padding: '8px' }}
                    />
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label>CPF:</label>
                            <input 
                                type="text" 
                                name="cpf" 
                                value={clientData.cpf} 
                                onChange={handleChange} 
                                maxLength="14"
                                placeholder="000.000.000-00"
                                style={{ width: '100%', padding: '8px' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Telefone:</label>
                            <input 
                                type="text" 
                                name="telefone" 
                                value={clientData.telefone} 
                                onChange={handleChange} 
                                maxLength="15"
                                placeholder="(00) 00000-0000"
                                style={{ width: '100%', padding: '8px' }}
                            />
                        </div>
                    </div>

                    {/* Endereço */}
                    <label>Endereço:</label>
                    <input 
                        type="text" 
                        name="endereco" 
                        value={clientData.endereco} 
                        onChange={handleChange} 
                        style={{ marginBottom: '15px', width: '100%', padding: '8px' }}
                    />

                    {/* --- ÁREA FINANCEIRA (NOVA) --- */}
                    <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>Dados Financeiros</h4>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label>Taxa de Juros (% a.m.):</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    name="taxa_juros" 
                                    value={clientData.taxa_juros} 
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    style={{ width: '100%', padding: '8px' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Perfil de Risco:</label>
                                <select 
                                    name="perfil_risco" 
                                    value={clientData.perfil_risco} 
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '8px' }}
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="Baixo">Bom Pagador (Baixo)</option>
                                    <option value="Alto">Arriscado (Alto)</option>
                                    <option value="VIP">VIP</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* ----------------------------- */}

                    <div className={styles.actions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                         <button type="button" onClick={onClose} className={styles.cancelButton}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.saveButton}>
                            Salvar Dados
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientForm;