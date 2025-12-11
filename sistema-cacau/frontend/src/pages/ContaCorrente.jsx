// frontend/src/pages/ContaCorrente.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Hook para navegação
import { FileText, FileSpreadsheet } from 'lucide-react'; // Ícones
import Layout from '../components/Layout';
import TransactionModal from '../components/TransactionModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generatePDF, generateCSV } from '../utils/exportUtils'; // Importando a lógica de exportação
import styles from './ContaCorrente.module.css';

const ContaCorrente = () => {
    // ---------------------------------------------------------
    // 🚨 SOLUÇÃO DO ERRO EM CASCATA: LEITURA DIRETA DA URL 🚨
    // ---------------------------------------------------------
    const navigate = useNavigate(); 

    // Pega a URL inteira e extrai o ID
    const path = window.location.pathname;
    const urlId = path.split('/').pop();
    const clienteId = parseInt(urlId);

    // Validação do ID
    const isIdInvalid = isNaN(clienteId) || clienteId === 1;
    // ---------------------------------------------------------

    const [accountData, setAccountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchAccountData = async () => {
        if (isIdInvalid) return;

        setLoading(true);
        setError(null);
        try {
            console.log("Buscando dados para o ID Real:", clienteId);
            
            const url = `http://localhost:3000/conta-corrente/${clienteId}?startDate=${startDate}&endDate=${endDate}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
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
        if (!isIdInvalid) {
            fetchAccountData();
        } else {
            setLoading(false);
        }
    }, [clienteId, startDate, endDate]);

    // Lógica de Exclusão
    const handleDeleteTransaction = async (transacaoId, valorTotal) => {
        const confirmDelete = window.confirm(
            `Tem certeza que deseja EXCLUIR esta transação de ${formatCurrency(valorTotal)}?`
        );
        if (!confirmDelete) return;

        try {
            const response = await fetch(`http://localhost:3000/transacoes/${transacaoId}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (!response.ok) {
                alert(`Erro: ${data.message}`); 
                return;
            }
            alert(data.message); 
            fetchAccountData();
        } catch (err) {
            alert("Falha de conexão.");
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

    // --- RENDERIZAÇÃO ---

    if (isIdInvalid) {
        return (
            <Layout>
                <div style={{ padding: '30px', textAlign: 'center', color: '#721c24', backgroundColor: '#f8d7da', borderRadius: '8px' }}>
                    <h2>⚠️ Erro de Identificação</h2>
                    <p>O sistema tentou acessar o ID <strong>{urlId}</strong>, que é inválido.</p>
                    <button onClick={() => navigate('/')} style={{ marginTop: '10px', padding: '10px', cursor: 'pointer' }}>
                        Voltar para a Lista
                    </button>
                </div>
            </Layout>
        );
    }

    if (loading) return <Layout><p>Carregando dados...</p></Layout>;
    if (error) return <Layout><p style={{ color: 'red' }}>Erro do Servidor: {error}</p></Layout>;
    if (!accountData || !accountData.cliente) return <Layout><p>Cliente não encontrado.</p></Layout>;

    const { cliente, extrato } = accountData;
    const saldo = formatBalance(cliente.saldo);

    return (
        <Layout>
            {/* CABEÇALHO SUPERIOR COM NAVEGAÇÃO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button 
                    onClick={() => navigate(-1)} 
                    style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    &larr; Voltar
                </button>
                
                <h2 className={styles.title} style={{margin: 0}}>Conta: {cliente.nome}</h2>
                
                <button onClick={() => setShowModal(true)} className={styles.transactionButton}>
                    + Novo Lançamento
                </button>
            </div>
            
            {/* DADOS DO CLIENTE */}
            <div className={styles.header}>
                 <div className={styles.info}>
                    <p><strong>CPF:</strong> {cliente.cpf}</p>
                    <p><strong>Telefone:</strong> {cliente.telefone}</p>
                    <p><strong>Endereço:</strong> {cliente.endereco || 'Não informado'}</p>
                 </div>
            </div>

            {/* CARTÃO DE SALDO */}
            <div className={styles.summary}>
                <div className={styles.balanceCard}>
                    <p>Saldo Atual</p>
                    <h3 className={saldo.className}>
                        {saldo.display} ({saldo.nature})
                    </h3>
                </div>
            </div>
            
            {/* FILTROS */}
            <div className={styles.filterContainer}>
                <h3>Filtro de Extrato</h3>
                <label>Início: <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
                <label>Fim: <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className={styles.clearFilterButton}>Limpar</button>
            </div>

            {/* --- ÁREA DE EXPORTAÇÃO E TÍTULO DA TABELA --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Extrato ({extrato.length})</h3>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Botão CSV */}
                    <button
                        onClick={() => generateCSV(cliente, extrato)}
                        title="Baixar Planilha Excel/CSV"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#107c41', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
                    >
                        <FileSpreadsheet size={18} /> CSV
                    </button>

                    {/* Botão PDF */}
                    <button
                        onClick={() => generatePDF(cliente, extrato)}
                        title="Baixar Relatório Oficial em PDF"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#b30b00', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
                    >
                        <FileText size={18} /> PDF
                    </button>
                </div>
            </div>

            {/* TABELA */}
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
                            const isCredito = parseFloat(transacao.valor_total) > 0;
                            const rowClass = isCredito ? styles.credito : styles.debito;
                            return (
                                <tr key={transacao.id} className={rowClass}>
                                    <td>{formatDate(transacao.data_transacao)}</td>
                                    <td>{transacao.tipo}</td>
                                    <td style={{textAlign: 'right'}}>{transacao.peso_kg || '-'}</td>
                                    <td style={{textAlign: 'right'}}>{transacao.preco_por_kg ? formatCurrency(transacao.preco_por_kg) : '-'}</td>
                                    <td style={{textAlign: 'right', fontWeight: 'bold'}}>{isCredito ? '+' : '-'} {formatCurrency(Math.abs(transacao.valor_total))}</td>
                                    <td>{transacao.observacao || '-'}</td>
                                    <td>
                                        <button onClick={() => handleDeleteTransaction(transacao.id, transacao.valor_total)} style={{color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'}}>
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
                    onSuccess={handleTransactionSuccess}
                    clienteId={cliente.id}
                    clienteNome={cliente.nome}
                />
            )}
        </Layout>
    );
};

export default ContaCorrente;