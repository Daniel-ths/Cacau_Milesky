// frontend/src/components/SidebarMetrics.jsx
import React, { useState, useEffect } from 'react';
import { Package, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { formatCurrency } from '../utils/formatters';

const SidebarMetrics = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const response = await api.get('/metrics/saldo-total');
            if (response.ok) {
                const data = await response.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error("Erro metrics sidebar:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        
        // Atualiza a cada 30 segundos automaticamente para o chefe ver mudanças
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div style={{padding:'20px', color: '#aaa', fontSize: '12px'}}>Carregando...</div>;
    if (!metrics) return null;

    // Estilos Inline para facilitar (fundo escuro transparente)
    const cardStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '10px',
        marginTop: '20px'
    };

    const itemStyle = {
        marginBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '8px'
    };

    const labelStyle = { display: 'block', fontSize: '11px', color: '#ccc', marginBottom: '2px' };
    const valueStyle = { display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fff' };

    return (
        <div style={{ padding: '0 15px' }}>
            <div style={cardStyle}>
                <h4 style={{ color: '#fff', fontSize: '12px', margin: '0 0 10px 0', opacity: 0.7, textTransform: 'uppercase' }}>
                    Resumo do Negócio
                </h4>

                {/* ESTOQUE */}
                <div style={itemStyle}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px'}}>
                        <Package size={14} color="#f0ad4e" />
                        <span style={labelStyle}>Cacau em Depósito</span>
                    </div>
                    <span style={{...valueStyle, color: '#f0ad4e'}}>
                        {metrics.total_estoque?.toLocaleString('pt-BR')} Kg
                    </span>
                </div>

                {/* A PAGAR (Sua Dívida) */}
                <div style={itemStyle}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px'}}>
                        <TrendingDown size={14} color="#d9534f" />
                        <span style={labelStyle}>A Pagar (Sua Dívida)</span>
                    </div>
                    <span style={{...valueStyle, color: '#d9534f'}}>
                        {formatCurrency(metrics.total_credor)}
                    </span>
                </div>

                {/* A RECEBER */}
                <div style={{ marginBottom: '5px' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px'}}>
                        <TrendingUp size={14} color="#5cb85c" />
                        <span style={labelStyle}>A Receber (Dívidas)</span>
                    </div>
                    <span style={{...valueStyle, color: '#5cb85c'}}>
                        {formatCurrency(metrics.total_devedor)}
                    </span>
                </div>
            </div>

            <button 
                onClick={fetchMetrics} 
                style={{
                    background: 'none', border:'none', color:'#666', 
                    fontSize:'10px', cursor:'pointer', width: '100%', textAlign:'center'
                }}
            >
                <RefreshCw size={10} style={{marginRight:'4px'}}/> Atualizar
            </button>
        </div>
    );
};

export default SidebarMetrics;