import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters';
import styles from './TransactionModal.module.css';
import { api } from '../api'; 

const TransactionModal = ({ onClose, onSuccess, clienteId, clienteNome }) => {
    const [tipo, setTipo] = useState('Credito');
    const [pesoKg, setPesoKg] = useState('');
    const [precoPorKg, setPrecoPorKg] = useState('');
    const [valorTotal, setValorTotal] = useState('');
    const [observacao, setObservacao] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    React.useEffect(() => {
        const pKg = parseFloat(pesoKg);
        const pPq = parseFloat(precoPorKg);

        if (!isNaN(pKg) && !isNaN(pPq) && pKg > 0 && pPq > 0) {
            const calculatedTotal = pKg * pPq;
            setValorTotal(calculatedTotal.toFixed(2));
        }
    }, [pesoKg, precoPorKg]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        let finalValorTotal = parseFloat(valorTotal);
        if (tipo === 'Debito') {
            finalValorTotal = -finalValorTotal;
        }

        const payload = {
            // --- CORREÇÃO IMPORTANTE AQUI ---
            // Removemos o parseInt(). Enviamos o ID exatamente como ele é (string/texto)
            clienteId: clienteId, 
            // --------------------------------
            tipo: tipo,
            peso_kg: pesoKg ? parseFloat(pesoKg) : null,
            preco_por_kg: precoPorKg ? parseFloat(precoPorKg) : null,
            valor_total: finalValorTotal,
            observacao: observacao,
        };

        if (isNaN(finalValorTotal) || finalValorTotal === 0) {
            setError("O valor total não pode ser zero ou inválido.");
            setLoading(false);
            return;
        }

        try {
            const response = await api.post('/transacoes', payload);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Falha ao registrar a transação.");
            }

            alert(data.message);
            onSuccess(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <h2>Novo Lançamento para: {clienteNome}</h2>
                    <button className={styles.closeButton} onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label>Tipo de Transação:</label>
                    <select 
                        value={tipo} 
                        onChange={(e) => setTipo(e.target.value)} 
                        required
                        className={styles.select}
                    >
                        <option value="Credito">Crédito (Ex: Compra de Cacau)</option>
                        <option value="Debito">Débito (Ex: Adiantamento, Pagamento)</option>
                    </select>

                    {tipo === 'Credito' && (
                        <>
                            <label>Peso (Kg):</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={pesoKg} 
                                onChange={(e) => setPesoKg(e.target.value)} 
                                placeholder="0.00"
                                required 
                                className={styles.input}
                            />

                            <label>Preço por Kg:</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={precoPorKg} 
                                onChange={(e) => setPrecoPorKg(e.target.value)} 
                                placeholder="0.00"
                                required
                                className={styles.input}
                            />
                        </>
                    )}

                    <label>Valor Total (R$):</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={valorTotal} 
                        onChange={(e) => setValorTotal(e.target.value)}
                        disabled={tipo === 'Credito'} 
                        placeholder="0.00"
                        required
                        className={styles.input}
                    />
                    <p className={styles.info}>
                        {tipo === 'Credito' 
                            ? `O saldo será creditado pelo valor total.` 
                            : `O saldo será debitado pelo valor total.`}
                    </p>

                    <label>Observação (Opcional):</label>
                    <textarea 
                        value={observacao} 
                        onChange={(e) => setObservacao(e.target.value)} 
                        rows="3"
                        className={styles.textarea}
                    ></textarea>

                    {error && <p className={styles.error}>{error}</p>}
                    
                    <button type="submit" disabled={loading} className={styles.submitButton}>
                        {loading ? 'Registrando...' : 'Registrar Transação'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TransactionModal;