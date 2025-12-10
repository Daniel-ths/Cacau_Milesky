// frontend/src/components/TransactionForm.jsx
import React, { useState } from 'react';

const TransactionForm = ({ clientId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        tipo: 'ENTRADA_CACAU', // Padrão: Entrada de Cacau
        peso_kg: '',
        preco_por_kg: '',
        valor_total: '',
        observacao: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isCacauTransaction = formData.tipo === 'ENTRADA_CACAU';

    // Calcula o valor total automaticamente se peso e preço forem preenchidos
    const calculateTotal = (peso, preco) => {
        const p = parseFloat(peso);
        const pr = parseFloat(preco);
        if (!isNaN(p) && !isNaN(pr) && p > 0 && pr > 0) {
            setFormData(prev => ({ ...prev, valor_total: (p * pr).toFixed(2) }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Recalcula o total se o peso ou preço mudar
        if (name === 'peso_kg' || name === 'preco_por_kg') {
            const peso = name === 'peso_kg' ? value : formData.peso_kg;
            const preco = name === 'preco_por_kg' ? value : formData.preco_por_kg;
            calculateTotal(peso, preco);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // O peso e o preço só são obrigatórios para a transação de Cacau
        if (isCacauTransaction && (!formData.peso_kg || !formData.preco_por_kg)) {
            setError("Para Entrada de Cacau, Peso e Preço são obrigatórios.");
            setLoading(false);
            return;
        }

        // Dados a serem enviados para a API
        const transactionPayload = {
            clienteId: clientId,
            tipo: formData.tipo,
            observacao: formData.observacao,
            // Valores condicionais:
            peso_kg: isCacauTransaction ? parseFloat(formData.peso_kg) : null,
            preco_por_kg: isCacauTransaction ? parseFloat(formData.preco_por_kg) : null,
            // Para PAGAMENTO/ADIANTAMENTO, usamos valor_total
            valor_total: isCacauTransaction ? parseFloat(formData.valor_total) : parseFloat(formData.valor_total) * -1 // Pagamento/Adiantamento são débitos (-)
        };

        try {
            const response = await fetch('http://localhost:3000/transacoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionPayload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro desconhecido ao registrar transação.');
            }

            onSave(); // Atualiza a tela de extrato
            onClose();
        } catch (err) {
            console.error("Erro ao registrar transação:", err);
            setError(err.message || "Falha na comunicação com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        // Overlay (Modal) - Estilo básico
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)', padding: '24px', width: '100%', maxWidth: '550px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>Lançar Transação para Cliente ID: {clientId}</h2>
                
                {error && (
                    <div style={{ backgroundColor: '#fecaca', border: '1px solid #f87171', color: '#b91c1c', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    
                    {/* TIPO DE TRANSAÇÃO */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="tipo">Tipo</label>
                        <select
                            name="tipo"
                            id="tipo"
                            value={formData.tipo}
                            onChange={handleChange}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937' }}
                        >
                            <option value="ENTRADA_CACAU">1. Entrada de Cacau (Crédito)</option>
                            <option value="PAGAMENTO">2. Pagamento (Débito)</option>
                            <option value="ADIANTAMENTO">3. Adiantamento (Débito)</option>
                        </select>
                    </div>

                    {/* CAMPOS CONDICIONAIS PARA ENTRADA DE CACAU */}
                    {isCacauTransaction ? (
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="peso_kg">Peso (Kg)</label>
                                <input
                                    type="number"
                                    name="peso_kg"
                                    id="peso_kg"
                                    value={formData.peso_kg}
                                    onChange={handleChange}
                                    style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937' }}
                                    step="0.01"
                                    required={isCacauTransaction}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="preco_por_kg">Preço (R$/Kg)</label>
                                <input
                                    type="number"
                                    name="preco_por_kg"
                                    id="preco_por_kg"
                                    value={formData.preco_por_kg}
                                    onChange={handleChange}
                                    style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937' }}
                                    step="0.01"
                                    required={isCacauTransaction}
                                />
                            </div>
                        </div>
                    ) : (
                        // CAMPO ÚNICO PARA PAGAMENTO/ADIANTAMENTO (Valor total é inserido diretamente)
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="valor_total">Valor (R$)</label>
                            <input
                                type="number"
                                name="valor_total"
                                id="valor_total"
                                value={formData.valor_total}
                                onChange={handleChange}
                                style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937' }}
                                step="0.01"
                                required
                            />
                        </div>
                    )}
                    
                    {/* VALOR TOTAL (APENAS LEITURA PARA ENTRADA DE CACAU) */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="valor_total_display">
                            {isCacauTransaction ? 'Valor Total Calculado (R$)' : 'Valor Total (R$)'}
                        </label>
                        <input
                            type="text"
                            name="valor_total_display"
                            id="valor_total_display"
                            value={formData.valor_total}
                            readOnly={isCacauTransaction} // Apenas leitura para Cacau
                            onChange={!isCacauTransaction ? handleChange : () => {}} // Permite edição se não for Cacau
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937', backgroundColor: isCacauTransaction ? '#f9fafb' : 'white' }}
                            required
                        />
                    </div>

                    {/* OBSERVAÇÃO */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }} htmlFor="observacao">Observação</label>
                        <textarea
                            name="observacao"
                            id="observacao"
                            value={formData.observacao}
                            onChange={handleChange}
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', padding: '8px 12px', color: '#1f2937' }}
                            rows="2"
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
                            style={{ backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
                            disabled={loading}
                        >
                            {loading ? 'Lançando...' : 'Confirmar Lançamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionForm;