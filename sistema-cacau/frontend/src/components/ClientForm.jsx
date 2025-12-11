// frontend/src/components/ClientForm.jsx

import React, { useState, useEffect } from 'react';
import styles from './ClientForm.module.css';

// Função utilitária para formatar CPF (###.###.###-##)
const formatCPF = (value) => {
    // Remove tudo que não for dígito
    value = value.replace(/\D/g, "");
    // Limita a 11 dígitos
    value = value.substring(0, 11); 
    // Aplica a máscara
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return value;
};

// Função utilitária para formatar Telefone ((##) #####-####)
const formatPhone = (value) => {
    // Remove tudo que não for dígito
    value = value.replace(/\D/g, "");
    // Limita a 11 dígitos (incluindo o 9 extra de celular)
    value = value.substring(0, 11);
    // Aplica a máscara
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
        endereco: '' // Campo Endereço
    });

    useEffect(() => {
        if (clientToEdit) {
            setClientData({
                id: clientToEdit.id,
                nome: clientToEdit.nome,
                cpf: clientToEdit.cpf,
                telefone: clientToEdit.telefone,
                endereco: clientToEdit.endereco || ''
            });
        }
    }, [clientToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'cpf') {
            newValue = formatCPF(value); // 🚨 Aplica a formatação de CPF
        }
        
        if (name === 'telefone') {
             newValue = formatPhone(value); // 🚨 Aplica a formatação de Telefone
        }

        setClientData(prev => ({ ...prev, [name]: newValue }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validação obrigatória
        if (!clientData.nome || !clientData.cpf) {
            alert('Nome e CPF são campos obrigatórios.');
            return;
        }
        
        // Chama a função onSave no ClientList
        onSave(clientData);
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <h3>{clientData.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <form onSubmit={handleSubmit}>
                    
                    {/* CAMPO NOME (OBRIGATÓRIO) */}
                    <label>Nome:</label>
                    <input 
                        type="text" 
                        name="nome" 
                        value={clientData.nome} 
                        onChange={handleChange} 
                        required 
                    />
                    
                    {/* CAMPO CPF (OBRIGATÓRIO) */}
                    <label>CPF:</label>
                    <input 
                        type="text" 
                        name="cpf" 
                        value={clientData.cpf} 
                        onChange={handleChange} 
                        maxLength="14" // Permite a máscara
                        required 
                    />

                    {/* CAMPO TELEFONE */}
                    <label>Telefone:</label>
                    <input 
                        type="text" 
                        name="telefone" 
                        value={clientData.telefone} 
                        onChange={handleChange} 
                        maxLength="15" // Permite a máscara
                    />

                    {/* CAMPO ENDEREÇO (OPCIONAL) */}
                    <label>Endereço (opcional):</label>
                    <input 
                        type="text" 
                        name="endereco" 
                        value={clientData.endereco} 
                        onChange={handleChange} 
                    />

                    <div className={styles.actions}>
                        <button type="submit" className={styles.saveButton}>
                            Salvar
                        </button>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientForm;