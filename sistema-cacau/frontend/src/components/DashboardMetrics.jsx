import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import styles from './DashboardMetrics.module.css';
import { api } from '../api'; // <--- IMPORTAMOS A API AQUI

const DashboardMetrics = () => {
    const [metrics, setMetrics] = useState({ 
        total_credor: 0, 
        total_devedor: 0, 
        total_clientes: 0 
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);
        try {
            // USANDO API.GET (Substitui os fetch manuais)
            
            // 1. Busca de Saldo Total
            const metricsResponse = await api.get('/metrics/saldo-total');
            if (!metricsResponse.ok) throw new Error('Falha ao buscar métricas de saldo.');
            const saldoData = await metricsResponse.json();

            // 2. Busca de Total de Clientes
            const clientsResponse = await api.get('/clientes');
            if (!clientsResponse.ok) throw new Error('Falha ao buscar total de clientes.');
            const clientsData = await clientsResponse.json();

            setMetrics({
                total_credor: saldoData.total_credor,
                total_devedor: saldoData.total_devedor,
                total_clientes: clientsData.length,
            });

        } catch (err) {
            console.error("Erro ao carregar métricas:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    if (loading) return <p>Carregando métricas...</p>;
    if (error) return <p style={{ color: 'red' }}>Erro ao carregar métricas: {error}</p>;

    return (
        <div className={styles.dashboardGrid}>
            
            <div className={styles.metricCard}>
                <p>Total de Produtores</p>
                <h3>{metrics.total_clientes}</h3>
            </div>
            
            <div className={styles.metricCard}>
                <p>Total a Pagar</p>
                <h3 className={styles.totalCredor}>
                    {formatCurrency(metrics.total_credor)}
                </h3>
            </div>
            
            <div className={styles.metricCard}>
                <p>Total a Receber (Clientes Devem)</p>
                <h3 className={styles.totalDevedor}>
                    {formatCurrency(metrics.total_devedor)}
                </h3>
            </div>
        </div>
    );
};

export default DashboardMetrics;