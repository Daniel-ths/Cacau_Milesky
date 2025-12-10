// frontend/src/pages/ClientList.jsx (ATUALIZADO COM EXCLUSÃO)
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ClientForm from '../components/ClientForm';
import DashboardMetrics from '../components/DashboardMetrics';
import { formatCurrency } from '../utils/formatters'; 
import styles from './ClientList.module.css';

const ClientList = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [clientToEdit, setClientToEdit] = useState(null);

    const fetchClients = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3000/clientes');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao buscar clientes.');
            }
            const data = await response.json();
            setClients(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleAddClient = () => {
        setClientToEdit(null);
        setShowForm(true);
    };

    const handleEditClient = (client) => {
        setClientToEdit(client);
        setShowForm(true);
    };

    // FUNÇÃO PARA EXCLUSÃO
    const handleDeleteClient = async (id, nome) => {
        const confirmDelete = window.confirm(`Tem certeza que deseja excluir o cliente ${nome}? Esta ação é irreversível se o cliente não tiver transações.`);
        
        if (!confirmDelete) return;

        try {
            const response = await fetch(`http://localhost:3000/clientes/${id}`, {
                method: 'DELETE',
            });
            
            const data = await response.json();

            if (!response.ok) {
                // Exibe a mensagem de erro do backend (ex: foreign key violation)
                alert(`Erro ao excluir cliente: ${data.message}`); 
                return;
            }

            alert(data.message); // Ex: Cliente excluído com sucesso.
            fetchClients(); // Recarrega a lista
            
        } catch (err) {
            console.error("Erro na requisição de exclusão:", err);
            alert("Falha de conexão com o servidor ao excluir.");
        }
    };

    const handleSave = () => {
        setShowForm(false);
        setClientToEdit(null);
        fetchClients(); 
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

    return (
        <Layout>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
                Cadastro de Clientes (Produtores)
            </h2>
            
            <DashboardMetrics />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button 
                    onClick={handleAddClient}
                    style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    + Novo Cliente
                </button>
            </div>

            {loading && <p>Carregando clientes...</p>}
            {error && <p style={{ color: 'red' }}>Erro: {error}</p>}
            
            {!loading && !error && (
                <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>CPF</th>
                                <th>Telefone</th>
                                <th style={{ textAlign: 'right' }}>Saldo Atual</th>
                                <th style={{ textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((client) => {
                                const saldo = formatBalance(client.saldo_atual);
                                return (
                                    <tr key={client.id}>
                                        <td>
                                            <Link to={`/conta-corrente/${client.id}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 'bold' }}>
                                                {client.nome}
                                            </Link>
                                        </td>
                                        <td>{client.cpf}</td>
                                        <td>{client.telefone}</td>
                                        <td style={{ textAlign: 'right' }} className={saldo.className}>
                                            {saldo.display} ({saldo.nature})
                                        </td>
                                        <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            {/* BOTÃO DE EDIÇÃO */}
                                            <button 
                                                onClick={() => handleEditClient(client)}
                                                style={{ padding: '5px 10px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                            >
                                                Editar
                                            </button>
                                            {/* BOTÃO DE EXCLUSÃO */}
                                            <button 
                                                onClick={() => handleDeleteClient(client.id, client.nome)}
                                                style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                            >
                                                Excluir
                                            </button>
                                            <Link to={`/conta-corrente/${client.id}`} style={{ color: '#059669', textDecoration: 'none', fontSize: '12px', padding: '5px 10px' }}>
                                                Extrato
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            {clients.length === 0 && (
                                <tr><td colSpan="5" style={{textAlign: 'center', color: '#999'}}>Nenhum cliente cadastrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Modal de Cadastro/Edição */}
            {showForm && (
                <ClientForm 
                    onClose={() => setShowForm(false)} 
                    onSave={handleSave} 
                    clientData={clientToEdit}
                />
            )}
        </Layout>
    );
};

export default ClientList;