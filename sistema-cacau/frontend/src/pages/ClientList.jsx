// frontend/src/pages/ClientList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ClientForm from '../components/ClientForm';
import GeneralDashboard from '../components/GeneralDashboard'; // <--- AQUI: Trocamos o antigo pelo Novo Dashboard
import { formatCurrency } from '../utils/formatters'; 
import styles from './ClientList.module.css';
import { api, API_BASE_URL } from '../api'; 

const ClientList = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [clientToEdit, setClientToEdit] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [showBackupWarning, setShowBackupWarning] = useState(false); 
    const LAST_BACKUP_KEY = 'last_backup_timestamp';

    const fetchClients = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/clientes');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao buscar clientes.');
            }
            const data = await response.json();
            
            // FILTRAGEM DE SEGURANÇA: Garante que tem ID
            const clientesValidos = data.filter(c => c.id || c._id);
            setClients(clientesValidos);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
        const lastBackupTime = localStorage.getItem(LAST_BACKUP_KEY);
        if (lastBackupTime) {
            const lastBackupDate = new Date(parseInt(lastBackupTime, 10));
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); 
            if (lastBackupDate < sevenDaysAgo) setShowBackupWarning(true);
            else setShowBackupWarning(false);
        } else {
            setShowBackupWarning(true);
        }
    }, [fetchClients]);

    const handleSave = async (clientData) => {
        const idToEdit = clientData.id || clientData._id;
        const isEditing = !!idToEdit; 

        try {
            let response;
            if (isEditing) {
                response = await api.put(`/clientes/${idToEdit}`, clientData);
            } else {
                response = await api.post('/clientes', clientData);
            }
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao salvar.');
            }
            
            await fetchClients(); 
            setShowForm(false);
            setClientToEdit(null);
            alert(`Cliente ${isEditing ? 'editado' : 'criado'} com sucesso!`);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteClient = async (id, nome) => {
        if (!window.confirm(`Excluir ${nome} e todas as transações?`)) return;
        try {
            await api.delete(`/clientes/${id}`);
            alert('Cliente excluído'); 
            fetchClients();
        } catch (err) {
            alert("Erro ao excluir.");
        }
    };

    const handleBackupClick = () => {
        localStorage.setItem(LAST_BACKUP_KEY, new Date().getTime().toString());
        setShowBackupWarning(false);
        window.open(`${API_BASE_URL}/backup/clientes`, '_self');
    };

    const filteredClients = clients.filter(client => 
        client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.cpf && client.cpf.includes(searchTerm)) ||
        (client.telefone && client.telefone.includes(searchTerm))
    );

    return (
        <Layout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Gestão de Produtores</h2>
                <div>
                     <button onClick={handleBackupClick} style={{ padding: '8px 15px', marginRight: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Backup Dados
                    </button>
                    <button onClick={() => { setClientToEdit(null); setShowForm(true); }} style={{ padding: '8px 15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        + Novo Produtor
                    </button>
                </div>
            </div>

            {showBackupWarning && (
                <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', borderRadius: '4px' }}>
                    ⚠️ <strong>Atenção:</strong> Você não faz backup há mais de 7 dias. Clique no botão acima para salvar seus dados.
                </div>
            )}

            {/* --- NOVO DASHBOARD GERAL --- */}
            <div style={{ marginBottom: '30px' }}>
                <GeneralDashboard clientes={clients} loading={loading} />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
                <input 
                    type="text" 
                    placeholder="Buscar por nome, CPF ou telefone..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    style={{ padding: '10px', width: '100%', maxWidth: '400px', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
            </div>

            {!loading && !error && (
                <div className={styles.tableWrapper}> {/* Mantém seu estilo de tabela */}
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>CPF</th>
                                <th>Telefone</th>
                                {/* NOVA COLUNA */}
                                <th style={{textAlign: 'right'}}>Estoque (Kg)</th> 
                                <th style={{textAlign: 'right'}}>Saldo Financeiro</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map((client) => {
                                // SEGURANÇA CONTRA TELA BRANCA:
                                const safeId = client.id || client._id;
                                if (!safeId) return null; 

                                // Lógica de Cor do Saldo
                                const saldo = client.saldo_atual || 0;
                                const saldoColor = saldo < 0 ? 'red' : 'green';

                                return (
                                    <tr key={safeId}>
                                        <td>
                                            <Link to={`/conta-corrente/${safeId}`} style={{ fontWeight: 'bold', color: '#007bff', textDecoration: 'none' }}>
                                                {client.nome}
                                            </Link>
                                        </td>
                                        <td>{client.cpf}</td>
                                        <td>{client.telefone}</td>
                                        
                                        {/* COLUNA DE ESTOQUE */}
                                        <td style={{textAlign: 'right', fontWeight: '500'}}>
                                            {client.total_depositado ? client.total_depositado.toLocaleString('pt-BR') : '0'} Kg
                                        </td>

                                        {/* COLUNA DE SALDO COM COR */}
                                        <td style={{textAlign: 'right', fontWeight: 'bold', color: saldoColor}}>
                                            {formatCurrency(Math.abs(saldo))} {saldo < 0 ? '(D)' : '(C)'}
                                        </td>
                                        
                                        <td>
                                            <button onClick={() => { setClientToEdit(client); setShowForm(true); }} style={{marginRight: '8px', cursor: 'pointer'}}>
                                                Editar
                                            </button>
                                            <button onClick={() => handleDeleteClient(safeId, client.nome)} style={{ color: 'red', cursor: 'pointer', border: 'none', background: 'none' }}>
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Nenhum produtor encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {showForm && (
                <ClientForm 
                    onClose={() => setShowForm(false)} 
                    onSave={handleSave} 
                    clientToEdit={clientToEdit} 
                />
            )}
        </Layout>
    );
};

export default ClientList;