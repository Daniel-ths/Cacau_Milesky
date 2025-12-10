// frontend/src/pages/ClientAccount.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import TransactionForm from '../components/TransactionForm'; 
import { formatCurrency } from '../utils/formatters';
import styles from './ClientList.module.css';

const ClientAccount = () => {
    // Pega o ID do cliente da URL
    const { clientId } = useParams(); 
    const navigate = useNavigate();

    const [clientData, setClientData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTransactionForm, setShowTransactionForm] = useState(false); 
    
    // Estado para armazenar as datas do filtro
    const [filterDates, setFilterDates] = useState({ startDate: '', endDate: '' });

    // Função para formatar o saldo e definir a classe CSS
    const formatBalance = (balance) => {
        const value = parseFloat(balance);
        const sign = value < 0 ? 'D' : 'C'; // D=Devedor, C=Credor
        // Usa formatCurrency para o valor absoluto formatado
        const absoluteValueDisplay = formatCurrency(Math.abs(value)); 
        const className = value < 0 ? styles.saldoDevedor : styles.saldoCredor;
        
        return {
            display: absoluteValueDisplay, 
            className: className, 
            nature: sign
        };
    };

    // Função assíncrona para buscar os dados da conta corrente (Aceita objeto de filtro)
    const fetchClientAccount = async (filter = filterDates) => {
        setLoading(true);
        setError(null);
        
        try {
            // 1. Constrói a URL com os parâmetros de data, se existirem
            let url = `http://localhost:3000/conta-corrente/${clientId}`;
            const params = [];
            
            if (filter.startDate) params.push(`startDate=${filter.startDate}`);
            if (filter.endDate) params.push(`endDate=${filter.endDate}`);
            
            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }
            
            // 2. Faz a requisição
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json(); 
                throw new Error(errorData.message || 'Cliente não encontrado ou erro no servidor.');
            }
            
            const data = await response.json();
            setClientData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Dispara a busca inicial (sem filtro)
    useEffect(() => {
        if (clientId) {
            fetchClientAccount();
        }
    }, [clientId]); 
    
    // Handler para capturar as mudanças no formulário de filtro
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterDates(prev => ({ ...prev, [name]: value }));
    };

    // Handler para submeter o filtro e refazer a busca
    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchClientAccount(filterDates); 
    };

    // Telas de Carregamento e Erro
    if (loading) return <Layout><div style={{padding: '20px', fontSize: '18px'}}>Carregando dados da conta corrente...</div></Layout>;
    if (error) return <Layout><div style={{padding: '20px', color: '#dc2626', backgroundColor: '#fecaca', border: '1px solid #f87171', borderRadius: '4px'}}>Erro: {error}</div></Layout>;
    if (!clientData || !clientData.cliente) return <Layout><div style={{padding: '20px', color: '#3b82f6'}}>Cliente não encontrado. Verifique o ID.</div></Layout>;

    const { cliente, extrato } = clientData;
    const saldo = formatBalance(cliente.saldo);

    return (
        <Layout>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
                Conta Corrente: {cliente.nome}
            </h2>
            
            {/* Seção de Saldo e Lançamento */}
            <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>Saldo Atual:</p>
                    <span className={saldo.className} style={{ fontSize: '24px' }}>
                        {saldo.display} ({saldo.nature})
                    </span>
                </div>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>CPF: {cliente.cpf} | Tel: {cliente.telefone}</p>
                <button 
                    onClick={() => setShowTransactionForm(true)} 
                    style={{ padding: '8px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '15px' }}
                >
                    + Lançar Transação
                </button>
            </div>
            
            {/* Título e Formulário de Filtro de Data */}
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px', color: '#333' }}>
                Histórico de Transações
            </h3>
            
            <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '20px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Data Início:</label>
                    <input 
                        type="date"
                        name="startDate"
                        value={filterDates.startDate}
                        onChange={handleFilterChange}
                        style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Data Fim:</label>
                    <input 
                        type="date"
                        name="endDate"
                        value={filterDates.endDate}
                        onChange={handleFilterChange}
                        style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                </div>
                <button 
                    type="submit"
                    style={{ padding: '8px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Filtrar
                </button>
                <button 
                    type="button"
                    onClick={() => {
                        setFilterDates({ startDate: '', endDate: '' });
                        fetchClientAccount({ startDate: '', endDate: '' }); // Limpa filtro e recarrega
                    }}
                    style={{ padding: '8px 15px', backgroundColor: '#9ca3af', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Limpar
                </button>
            </form>
            
            {/* Histórico de Transações (Extrato) */}
            <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Peso (Kg)</th>
                            <th>Preço (R$/Kg)</th>
                            <th>Valor Total (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {extrato.map((t) => (
                            <tr key={t.id}>
                                <td>{new Date(t.data_transacao).toLocaleDateString('pt-BR')}</td>
                                <td>{t.tipo.replace('_', ' ')}</td>
                                <td>{t.peso_kg ? parseFloat(t.peso_kg).toFixed(2) : '-'}</td>
                                <td>{t.preco_por_kg ? parseFloat(t.preco_por_kg).toFixed(2) : '-'}</td>
                                <td style={{ color: t.valor_total > 0 ? '#006400' : '#8b0000', fontWeight: 'bold' }}>
                                    {formatCurrency(t.valor_total)}
                                </td>
                            </tr>
                        ))}
                        {extrato.length === 0 && (
                            <tr><td colSpan="5" style={{textAlign: 'center', color: '#999'}}>Nenhuma transação encontrada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Renderiza a Modal de Lançamento */}
            {showTransactionForm && (
                <TransactionForm
                    clientId={clientId}
                    onClose={() => setShowTransactionForm(false)}
                    onSave={() => {
                        setShowTransactionForm(false);
                        fetchClientAccount(); // Recarrega os dados (usando filtro ativo, se houver)
                    }}
                />
            )}

        </Layout>
    );
};

export default ClientAccount;