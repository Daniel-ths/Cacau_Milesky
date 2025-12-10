import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import TransactionModal from '../components/TransactionModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import styles from './ContaCorrente.module.css';

const ContaCorrente = () => {
    // 1. OBTÉM O ID DA URL via React Router (padrão)
    const { clienteId } = useParams();

    // 🚨 VERIFICAÇÃO DE SEGURANÇA CONTRA ID INVÁLIDO OU FIXO (ID 1) 🚨
    // Se o clienteId for '1' ou não existir (o que acontece se for excluído), 
    // ele exibe uma mensagem de erro e não tenta fazer a requisição.
    // Você pode remover esta verificação após o problema ser resolvido.
    if (!clienteId || clienteId === '1') {
        return (
            <Layout>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Erro de Roteamento ou ID Excluído</h2>
                    <p>O ID do cliente não foi encontrado na URL ou está fixo como ID 1. Por favor, volte à lista e clique em um cliente que você sabe que existe (ex: ID 13, 14, 15...).</p>
                </div>
            </Layout>
        );
    }
    
    // --- ESTADOS ---
    const [accountData, setAccountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');


    // --- FUNÇÕES DE DADOS ---
    const fetchAccountData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Incluindo os filtros de data na requisição e usando o clienteId
            const url = `http://localhost:3000/conta-corrente/${clienteId}?startDate=${startDate}&endDate=${endDate}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                // AQUI o erro de 'Cliente não encontrado' é retornado se o status for 404
                throw new Error(errorData.message || 'Falha ao buscar conta corrente.');
            }
            const data = await response.json();
            setAccountData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Usa o clienteId capturado da URL
        fetchAccountData();
    }, [clienteId, startDate, endDate]); // Re-executa ao mudar ID ou datas

    // FUNÇÃO PARA EXCLUSÃO DE TRANSAÇÃO (ROTA 8)
    const handleDeleteTransaction = async (transacaoId, valorTotal, clienteNome) => {
        const confirmDelete = window.confirm(
            `Tem certeza que deseja EXCLUIR esta transação de ${formatCurrency(valorTotal)} do cliente ${clienteNome}? \nEsta ação irá reverter o saldo.`
        );
        
        if (!confirmDelete) return;

        try {
            const response = await fetch(`http://localhost:3000/transacoes/${transacaoId}`, {
                method: 'DELETE',
            });
            
            const data = await response.json();

            if (!response.ok) {
                alert(`Erro ao excluir transação: ${data.message}`); 
                return;
            }

            alert(data.message); 
            fetchAccountData(); // Recarrega os dados da conta e o extrato
            
        } catch (err) {
            console.error("Erro na requisição de exclusão:", err);
            alert("Falha de conexão com o servidor ao excluir a transação.");
        }
    };

    const handleTransactionSuccess = () => {
        setShowModal(false);
        fetchAccountData();
    };

    const formatBalance = (balance) => {
        const value = parseFloat(balance);
        const className = value < 0 ? styles.saldoDevedor : styles.saldoCredor;
        return {
            display: formatCurrency(Math.abs(value)),
            className: className,
            nature: value < 0 ? 'D' : 'C'
        };
    };

    // --- RENDERIZAÇÃO DE ESTADOS ---
    if (loading) return <Layout><p>Carregando conta corrente...</p></Layout>;
    // Se o erro for 'Cliente não encontrado', ele será tratado aqui
    if (error) return <Layout><p style={{ color: 'red' }}>Erro: {error}</p></Layout>; 
    if (!accountData || !accountData.cliente) return <Layout><p>Cliente não encontrado.</p></Layout>;

    const { cliente, extrato } = accountData;
    const saldo = formatBalance(cliente.saldo);

    // --- RENDERIZAÇÃO PRINCIPAL ---
    return (
        <Layout>
            <div className={styles.header}>
                <h2 className={styles.title}>Conta Corrente: {cliente.nome}</h2>
                <div className={styles.info}>
                    <p>CPF: {cliente.cpf}</p>
                    <p>Telefone: {cliente.telefone}</p>
                </div>
            </div>

            <div className={styles.summary}>
                <div className={styles.balanceCard}>
                    <p>Saldo Atual</p>
                    <h3 className={saldo.className}>
                        {saldo.display} ({saldo.nature})
                    </h3>
                </div>
                <button 
                    onClick={() => setShowModal(true)} 
                    className={styles.transactionButton}
                >
                    + Novo Lançamento
                </button>
            </div>
            
            {/* Filtro de Extrato */}
            <div className={styles.filterContainer}>
                <h3>Filtro de Extrato</h3>
                <label>
                    Início: 
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </label>
                <label>
                    Fim: 
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </label>
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className={styles.clearFilterButton}>
                    Limpar Filtros
                </button>
            </div>

            <h3>Extrato de Transações ({extrato.length} lançamentos)</h3>
            
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th style={{ textAlign: 'right' }}>Peso (kg)</th>
                            <th style={{ textAlign: 'right' }}>Preço/kg</th>
                            <th style={{ textAlign: 'right' }}>Valor Total</th>
                            <th>Observação</th>
                            <th>Ações</th> {/* Botão Excluir */}
                        </tr>
                    </thead>
                    <tbody>
                        {extrato.map((transacao) => {
                            const isCredito = parseFloat(transacao.valor_total) > 0;
                            const valorDisplay = formatCurrency(Math.abs(parseFloat(transacao.valor_total)));
                            const rowClass = isCredito ? styles.credito : styles.debito;
                            
                            return (
                                <tr key={transacao.id} className={rowClass}>
                                    <td>{formatDate(transacao.data_transacao)}</td>
                                    <td>{transacao.tipo}</td>
                                    <td style={{ textAlign: 'right' }}>{transacao.peso_kg ? transacao.peso_kg.toFixed(2) : '-'}</td>
                                    <td style={{ textAlign: 'right' }}>{transacao.preco_por_kg ? formatCurrency(transacao.preco_por_kg) : '-'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {isCredito ? '+' : '-'} {valorDisplay}
                                    </td>
                                    <td>{transacao.observacao || '-'}</td>
                                    <td>
                                        {/* BOTÃO DE EXCLUSÃO DE TRANSAÇÃO */}
                                        <button 
                                            onClick={() => handleDeleteTransaction(transacao.id, transacao.valor_total, cliente.nome)}
                                            style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {extrato.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', color: '#999' }}>
                                    Nenhuma transação encontrada para este período.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Transação */}
            {showModal && (
                <TransactionModal
                    onClose={() => setShowModal(false)}
                    onSuccess={handleTransactionSuccess}
                    clienteId={cliente.id}
                    clienteNome={cliente.nome}
                />
            )}
        </Layout>
    );
};

export default ContaCorrente;