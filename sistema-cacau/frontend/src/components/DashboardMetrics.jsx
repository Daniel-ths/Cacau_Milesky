// frontend/src/components/DashboardMetrics.jsx

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters'; // Importa a função do formatters.js

const DashboardMetrics = () => {
    const [metrics, setMetrics] = useState({ total_devedor: 0, total_credor: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);
        try {
            // ROTA 5 do backend
            const response = await fetch('http://localhost:3000/dashboard/saldo');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao buscar métricas do dashboard.');
            }
            const data = await response.json();
            setMetrics(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        // Opcional: Recarregar a cada 30 segundos, se quiser dados em tempo real
        // const intervalId = setInterval(fetchMetrics, 30000);
        // return () => clearInterval(intervalId);
    }, []);

    if (loading) {
        return (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                Carregando métricas...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#fee2e2' }}>
                Erro ao carregar métricas: {error}
            </div>
        );
    }

    // Estilos para os cartões
    const containerStyle = {
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
        justifyContent: 'center',
    };

    const cardStyle = {
        flex: 1,
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center',
    };

    // Estilos específicos de cor
    const devedorStyle = { 
        ...cardStyle, 
        backgroundColor: '#fef2f2', // Vermelho claro
        borderLeft: '5px solid #ef4444' // Vermelho
    };

    const credorStyle = { 
        ...cardStyle, 
        backgroundColor: '#ecfdf5', // Verde claro
        borderLeft: '5px solid #10b981' // Verde
    };

    const valueStyle = {
        fontSize: '28px',
        fontWeight: 'bold',
        marginTop: '10px',
    };

    return (
        <div style={containerStyle}>
            {/* Cartão Saldo Devedor Total */}
            <div style={devedorStyle}>
                <h3 style={{ fontSize: '16px', color: '#dc2626' }}>Saldo Devedor Total (Seus Clientes lhe devem)</h3>
                <p style={{ ...valueStyle, color: '#dc2626' }}>
                    {formatCurrency(metrics.total_devedor)}
                </p>
            </div>

            {/* Cartão Saldo Credor Total */}
            <div style={credorStyle}>
                <h3 style={{ fontSize: '16px', color: '#059669' }}>Saldo Credor Total (Você deve aos seus clientes)</h3>
                <p style={{ ...valueStyle, color: '#059669' }}>
                    {formatCurrency(metrics.total_credor)}
                </p>
            </div>
        </div>
    );
};

export default DashboardMetrics;