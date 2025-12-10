// frontend/src/components/ClientForm.jsx (UNIFICADO: Cadastro e Edição)

import React, { useState, useEffect } from 'react';

// Função auxiliar para aplicar a máscara de CPF (000.000.000-00)
const formatCpf = (value) => {
    value = value.replace(/\D/g, ""); 
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return value.substring(0, 14); 
};

// Função auxiliar para aplicar a máscara de Telefone ((00) 00000-0000 ou (00) 0000-0000)
const formatPhone = (value) => {
    value = value.replace(/\D/g, "");
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2"); // Coloca parênteses em volta dos dois primeiros dígitos
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");    // Coloca hífen antes dos 4 últimos dígitos
    return value.substring(0, 15);
};


// props: onClose, onSave, clientData (opcional para edição)
const ClientForm = ({ onClose, onSave, clientData = null }) => {
    
    const isEditing = clientData !== null; // Determina se é edição ou cadastro
    
    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        telefone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Efeito para carregar os dados do cliente no formulário se for edição
    useEffect(() => {
        if (isEditing && clientData) {
            setFormData({
                nome: clientData.nome || '',
                // Aplica a máscara no CPF vindo do banco
                cpf: formatCpf(clientData.cpf || ''), 
                // Aplica a máscara no Telefone vindo do banco
                telefone: formatPhone(clientData.telefone || '') 
            });
        }
    }, [isEditing, clientData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        let formattedValue = value;

        if (name === 'cpf') {
            formattedValue = formatCpf(value);
        } else if (name === 'telefone') {
            formattedValue = formatPhone(value);
        }
        
        setFormData(prev => ({ ...prev, [name]: formattedValue }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Limpa o CPF para enviar apenas dígitos ao backend
        const cpfSemMascara = formData.cpf.replace(/\D/g, ''); 
        
        if (cpfSemMascara.length !== 11) {
             setError("O CPF deve ter 11 dígitos.");
             setLoading(false);
             return;
        }
        
        // Limpa o Telefone para enviar apenas dígitos ao backend (ou null)
        const telefoneLimpo = formData.telefone.replace(/\D/g, '');
        const telefoneFinal = telefoneLimpo.length >= 10 ? telefoneLimpo : null;

        const url = isEditing 
            ? `http://localhost:3000/clientes/${clientData.id}` 
            : 'http://localhost:3000/clientes';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...formData, 
                    cpf: cpfSemMascara, 
                    telefone: telefoneFinal // Envia o telefone limpo
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro desconhecido ao salvar cliente.');
            }

            onSave();
            onClose();
        } catch (err) {
            console.error("Erro ao salvar cliente:", err);
            setError(err.message || "Falha na comunicação com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const title = isEditing ? 'Editar Cliente' : 'Cadastrar Novo Cliente';
    const buttonText = isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente';

    return (
        // Overlay (Modal) - Estilo básico
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)', padding: '24px', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>{title}</h2>
                
                {error && (
                    <div style={{ backgroundColor: '#fecaca', border: '1px solid #f87171', color: '#b91c1c', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    
                    {/* NOME */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="nome">Nome</label>
                        <input
                            type="text"
                            name="nome"
                            id="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937' }}
                            required
                        />
                    </div>

                    {/* CPF */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="cpf">CPF</label>
                        <input
                            type="text"
                            name="cpf"
                            id="cpf"
                            value={formData.cpf}
                            onChange={handleChange}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937' }}
                            placeholder="000.000.000-00"
                            required
                            maxLength="14"
                        />
                    </div>
                    
                    {/* TELEFONE */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="telefone">Telefone</label>
                        <input
                            type="text"
                            name="telefone"
                            id="telefone"
                            value={formData.telefone}
                            onChange={handleChange}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937' }}
                            placeholder="(00) 00000-0000"
                            maxLength="15"
                        />
                    </div>
                    
                    {/* Botões */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            style={{ backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : buttonText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientForm;