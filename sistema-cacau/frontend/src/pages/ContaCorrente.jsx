// frontend/src/pages/ContaCorrente.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, FileSpreadsheet } from 'lucide-react'; // Mantive apenas os que você já usava
import Layout from '../components/Layout';
import TransactionModal from '../components/TransactionModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generatePDF, generateCSV } from '../utils/exportUtils'; 
import styles from './ContaCorrente.module.css';
import { api } from '../api'; 

const ContaCorrente = () => {
    const navigate = useNavigate(); 
    const { id } = useParams(); 
    const clienteId = id; 

    // Validação de segurança
    const isIdInvalid = !clienteId || clienteId === 'undefined' || clienteId === 'null';

    const [accountData, setAccountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    // Filtros de data
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchAccountData = async () => {
        if (isIdInvalid) return;

        setLoading(true);
        try {
            // Anti-cache para garantir dados frescos
            const timestamp = new Date().getTime();
            const query = `?startDate=${startDate}&endDate=${endDate}&time=${timestamp}`;
            
            const response = await api.get(`/conta-corrente/${clienteId}${query}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao buscar conta corrente.');
            }
            const data = await response.json();
            setAccountData(data);
        } catch (err) {
            console.error("Erro no fetch:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isIdInvalid) {
            fetchAccountData();
        } else {
            setLoading(false);
        }
    }, [clienteId, startDate, endDate]);

    const handleDeleteTransaction = async (transacaoId) => {
        if (!window.confirm("Tem certeza que deseja excluir?")) return;
        try {
            const response = await api.delete(`/transacoes/${transacaoId}`);
            if (response.ok) fetchAccountData();
            else alert("Erro ao excluir");
        } catch (err) {
            alert("Erro de conexão");
        }
    };

    // Lógica visual do saldo (mantendo a sua original)
    const formatBalance = (balance) => {
        const value = parseFloat(balance || 0);
        return {
            display: formatCurrency(Math.abs(value)),
            className: value < 0 ? styles.saldoDevedor : styles.saldoCredor,
            nature: value < 0 ? 'D (Deve)' : 'C (Crédito)'
        };
    };

    // Renderização segura (evita tela branca se loading falhar)
    if (isIdInvalid) return <Layout><p>Erro: ID inválido.</p></Layout>;
    if (loading) return <Layout><p>Carregando dados...</p></Layout>;
    if (error) return <Layout><p style={{ color: 'red' }}>Erro: {error}</p></Layout>;
    if (!accountData || !accountData.cliente) return <Layout><p>Cliente não encontrado.</p></Layout>;

    const { cliente, extrato } = accountData;
    const saldo = formatBalance(cliente.saldo);

    // Cálculos de visualização segura (caso o backend ainda não mande, usa 0)
    const totalDepositado = cliente.total_depositado || 0;
    const taxaJuros = cliente.taxa_juros || 0;
    const riscoCredito = cliente.risco || 'Padrão';

    return (
        <Layout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button 
                    onClick={() => navigate(-1)} 
                    style={{ padding: '8px 12px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: '#ccc' }}
                >
                    &larr; Voltar
                </button>
                
                <h2 className={styles.title} style={{margin: 0}}>Conta: {cliente.nome}</h2>
                
                <button onClick={() => setShowModal(true)} className={styles.transactionButton}>
                    + Lançamento / Depósito
                </button>
            </div>
            
            <div className={styles.header}>
                 <div className={styles.info}>
                    <p><strong>CPF:</strong> {cliente.cpf}</p>
                    <p><strong>Telefone:</strong> {cliente.telefone}</p>
                    {/* ADIÇÃO: Informações de Risco e Juros aqui */}
                    <p><strong>Risco:</strong> {riscoCredito} | <strong>Juros:</strong> {taxaJuros}% a.m.</p>
                 </div>
            </div>

            {/* ÁREA DE RESUMO FINANCEIRO E ESTOQUE */}
            <div className={styles.summary} style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                
                {/* Card 1: Saldo Financeiro (Original) */}
                <div className={styles.balanceCard}>
                    <p>Saldo Financeiro</p>
                    <h3 className={saldo.className}>
                        {saldo.display} ({saldo.nature})
                    </h3>
                </div>

                {/* Card 2: Cacau em Depósito (NOVO - PEDIDO DO CLIENTE) */}
                <div className={styles.balanceCard} style={{ backgroundColor: '#e9ecef', color: '#333' }}>
                    <p>Cacau em Depósito (Estoque)</p>
                    <h3>{totalDepositado} Kg</h3>
                    <small style={{ fontSize: '0.8em' }}>Aguardando venda</small>
                </div>

            </div>
            
            {/* Filtros */}
            <div className={styles.filterContainer}>
                <label>Início: <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
                <label>Fim: <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className={styles.clearFilterButton}>Limpar</button>
            </div>

            {/* Tabela */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th style={{textAlign: 'right'}}>Peso (kg)</th>
                            <th style={{textAlign: 'right'}}>R$/kg</th>
                            <th style={{textAlign: 'right'}}>Total</th>
                            <th>Obs</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {extrato.map((transacao) => {
                            // Lógica: Se for depósito ou compra à vista paga, ajustamos a cor
                            const isCredito = parseFloat(transacao.valor_total) > 0;
                            const isDeposito = transacao.tipo === 'DEPOSITO'; 
                            const isAvista = transacao.tipo.includes('A_VISTA'); // Exemplo de lógica para "dinheiro na mão"
                            
                            // Define estilo da linha
                            let rowClass = isCredito ? styles.credito : styles.debito;
                            if (isDeposito) rowClass = ''; // Neutro para depósito

                            return (
                                <tr key={transacao.id} className={rowClass} style={isDeposito ? {backgroundColor: '#f9f9f9'} : {}}>
                                    <td>{formatDate(transacao.data_transacao)}</td>
                                    <td>
                                        {transacao.tipo}
                                        {isDeposito && <span style={{fontSize:'10px', background:'#eee', padding:'2px', marginLeft:'5px', borderRadius:'3px'}}>ESTOQUE</span>}
                                    </td>
                                    <td style={{textAlign: 'right'}}>{transacao.peso_kg || '-'}</td>
                                    <td style={{textAlign: 'right'}}>
                                        {transacao.preco_por_kg ? formatCurrency(transacao.preco_por_kg) : '-'}
                                    </td>
                                    <td style={{textAlign: 'right', fontWeight: 'bold'}}>
                                        {/* Se for apenas depósito, não mostra valor financeiro ou mostra R$ 0,00 */}
                                        {isDeposito 
                                            ? '---' 
                                            : (isCredito ? '+' : '-') + ' ' + formatCurrency(Math.abs(transacao.valor_total))
                                        }
                                    </td>
                                    <td>{transacao.observacao || '-'}</td>
                                    <td>
                                        <button onClick={() => handleDeleteTransaction(transacao.id)} style={{color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer'}}>
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <TransactionModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); fetchAccountData(); }}
                    clienteId={cliente.id}
                    clienteNome={cliente.nome}
                />
            )}
        </Layout>
    );
};

export default ContaCorrente;