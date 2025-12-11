// frontend/src/pages/ClientList.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
    const [searchTerm, setSearchTerm] = useState(''); 
    
    // 🚨 NOVO ESTADO: Aviso de Backup
    const [showBackupWarning, setShowBackupWarning] = useState(false); 
    const LAST_BACKUP_KEY = 'last_backup_timestamp';

    // Usando useCallback para otimizar o fetchClients (Boa prática)
    const fetchClients = useCallback(async () => {
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
    }, []);

    // 🚨 NOVO useEffect: Checa o status do backup ao carregar a página
    useEffect(() => {
        fetchClients();
        
        const lastBackupTime = localStorage.getItem(LAST_BACKUP_KEY);
        
        if (lastBackupTime) {
            // Converte o timestamp salvo em milissegundos para objeto Date
            const lastBackupDate = new Date(parseInt(lastBackupTime, 10));
            
            // Calcula 7 dias atrás
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); 

            // Compara: Se o último backup for anterior a 7 dias atrás, mostra o aviso
            if (lastBackupDate < sevenDaysAgo) {
                setShowBackupWarning(true);
            } else {
                setShowBackupWarning(false);
            }
        } else {
            // Se nunca houve backup registrado, mostra o aviso
            setShowBackupWarning(true);
        }

    }, [fetchClients]);


    const handleAddClient = () => {
        setClientToEdit(null);
        setShowForm(true);
    };

    const handleEditClient = (client) => {
        setClientToEdit(client);
        setShowForm(true);
    };

    const handleSave = async (clientData) => {
        // ... (lógica de salvar cliente PUT/POST) ...
        const isEditing = !!clientData.id; 
        
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing 
            ? `http://localhost:3000/clientes/${clientData.id}` 
            : 'http://localhost:3000/clientes';
            
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Erro ao ${isEditing ? 'editar' : 'criar'} cliente.`);
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
        // ... (lógica de exclusão) ...
        const confirmDelete = window.confirm(`Tem certeza que deseja excluir o cliente ${nome}? Esta ação é irreversível se o cliente não tiver transações.`);
        
        if (!confirmDelete) return;

        try {
            const response = await fetch(`http://localhost:3000/clientes/${id}`, {
                method: 'DELETE',
            });
            
            const data = await response.json();

            if (!response.ok) {
                alert(`Erro ao excluir cliente: ${data.message}`); 
                return;
            }

            alert(data.message); 
            fetchClients();
            
        } catch (err) {
            console.error("Erro na requisição de exclusão:", err);
            alert("Falha de conexão com o servidor ao excluir.");
        }
    };

    // 🚨 NOVA FUNÇÃO: Trata o clique no botão de backup
    const handleBackupClick = () => {
        // 1. Salva o timestamp atual no Local Storage
        localStorage.setItem(LAST_BACKUP_KEY, new Date().getTime().toString());

        // 2. Esconde o aviso (o usuário acabou de fazer o backup)
        setShowBackupWarning(false);

        // 3. Dispara o download (simula a navegação da tag <a>)
        window.open('http://localhost:3000/backup/clientes', '_self');
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

    // LÓGICA DE FILTRAGEM DE CLIENTES
    const filteredClients = clients.filter(client => {
        const term = searchTerm.toLowerCase();
        
        return (
            client.nome.toLowerCase().includes(term) ||
            client.cpf.includes(term) ||
            client.telefone.includes(term)
        );
    });

    // 🚨 PASSO 1: Cálculo das contagens
    const totalClients = clients.length;
    const displayedClients = filteredClients.length;

    return (
        <Layout>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
                Cadastro de Clientes (Produtores)
            </h2>
            
            {/* 🚨 AVISO AUTOMÁTICO DE BACKUP (JSX) */}
            {showBackupWarning && (
                <div style={{
                    padding: '12px',
                    marginBottom: '20px',
                    backgroundColor: '#fef3c7', // Amarelo Claro
                    color: '#92400e',          // Marrom Escuro
                    border: '1px solid #fcd34d',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                }}>
                    ⚠️ ATENÇÃO: Nenhum backup foi registrado nos últimos 7 dias. Clique em "Gerar Backup" para proteger seus dados.
                </div>
            )}
            
            <DashboardMetrics />
            
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px' 
            }}>
                {/* CAMPO DE BUSCA */}
                <input
                    type="text"
                    placeholder="Buscar por nome, CPF ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '10px',
                        width: '60%', 
                        maxWidth: '400px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                    }}
                />
                
                {/* CONTÊINER PARA BOTÕES DE AÇÃO */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    
                    {/* 🚨 BOTÃO DE BACKUP */}
                    <button 
                        onClick={handleBackupClick}
                        style={{ 
                            padding: '10px 20px', 
                            backgroundColor: '#10b981', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                        }}
                    >
                        💾 Gerar Backup
                    </button>
                    
                    {/* BOTÃO NOVO CLIENTE */}
                    <button 
                        onClick={handleAddClient}
                        style={{ 
                            padding: '10px 20px', 
                            backgroundColor: '#3b82f6', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer' 
                        }}
                    >
                        + Novo Cliente
                    </button>
                </div>
            </div>
            
            {/* 🚨 PASSO 2 & 3: Contagem de Clientes Adicionada Aqui */}
            {!loading && !error && (
                <div style={{ marginBottom: '15px', color: '#555', fontWeight: 'bold' }}>
                    {searchTerm
                        ? `Resultados encontrados: ${displayedClients} de ${totalClients} clientes.`
                        : `Total de Clientes Cadastrados: ${totalClients}`
                    }
                </div>
            )}
            {/* FIM DA CONTAGEM */}

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
                            {/* USANDO filteredClients */}
                            {filteredClients.map((client) => {
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
                            {/* MENSAGEM DE CLIENTE NÃO ENCONTRADO */}
                            {filteredClients.length === 0 && (
                                <tr><td colSpan="5" style={{textAlign: 'center', color: '#999'}}>Nenhum cliente encontrado.</td></tr>
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
                    clientToEdit={clientToEdit}
                />
            )}
        </Layout>
    );
};

export default ClientList;