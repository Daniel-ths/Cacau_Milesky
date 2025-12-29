import React, { useMemo } from 'react';
import { Package, TrendingUp, TrendingDown, Users } from 'lucide-react'; // Certifica-te que tens lucide-react instalado
import { formatCurrency } from '../utils/formatters';
import styles from './GeneralDashboard.module.css';

const GeneralDashboard = ({ clientes, loading }) => {

    const resumo = useMemo(() => {
        if (!clientes || clientes.length === 0) return null;

        return clientes.reduce((acc, cliente) => {
            // 1. Soma Estoque (Depósitos)
            acc.totalEstoque += (cliente.total_depositado || 0);

            // 2. Separa quem deve e quem tem crédito
            const saldo = cliente.saldo_atual || 0;
            
            if (saldo > 0) {
                // Positivo: A empresa deve ao cliente (Crédito do Produtor)
                acc.totalPagar += saldo;
            } else {
                // Negativo: O cliente deve à empresa (Dívida/Adiantamento)
                acc.totalReceber += Math.abs(saldo);
            }
            
            // 3. Contagem de risco (Exemplo: clientes com juros ativos)
            if (cliente.taxa_juros > 0) acc.clientesComJuros++;

            return acc;
        }, {
            totalEstoque: 0,
            totalPagar: 0,
            totalReceber: 0,
            clientesComJuros: 0
        });
    }, [clientes]);

    if (loading) return <div className={styles.loading}>Atualizando dados...</div>;
    if (!resumo) return null;

    return (
        <div className={styles.container}>
            <div className={styles.grid}>
                
                {/* CARD 1: ESTOQUE FÍSICO */}
                <div className={`${styles.card} ${styles.cardEstoque}`}>
                    <div className={styles.iconArea}>
                        <Package size={24} color="#fff" />
                    </div>
                    <div className={styles.infoArea}>
                        <span>Cacau em Depósito</span>
                        <h3>{resumo.totalEstoque.toLocaleString('pt-BR')} Kg</h3>
                        <small>Armazenado</small>
                    </div>
                </div>

                {/* CARD 2: CONTAS A PAGAR (Crédito dos Produtores) */}
                <div className={`${styles.card} ${styles.cardPagar}`}>
                    <div className={styles.iconArea}>
                        <TrendingDown size={24} color="#fff" />
                    </div>
                    <div className={styles.infoArea}>
                        <span>Sua Dívida (A Pagar)</span>
                        <h3>{formatCurrency(resumo.totalPagar)}</h3>
                        <small>Crédito dos produtores</small>
                    </div>
                </div>

                {/* CARD 3: CONTAS A RECEBER (Dívidas dos Produtores) */}
                <div className={`${styles.card} ${styles.cardReceber}`}>
                    <div className={styles.iconArea}>
                        <TrendingUp size={24} color="#fff" />
                    </div>
                    <div className={styles.infoArea}>
                        <span>A Receber (Dívidas)</span>
                        <h3>{formatCurrency(resumo.totalReceber)}</h3>
                        <small>{resumo.clientesComJuros} clientes c/ juros</small>
                    </div>
                </div>

                {/* CARD 4: TOTAL DE CLIENTES */}
                <div className={`${styles.card} ${styles.cardTotal}`}>
                    <div className={styles.iconArea}>
                        <Users size={24} color="#555" />
                    </div>
                    <div className={styles.infoArea}>
                        <span>Total Produtores</span>
                        <h3>{clientes.length}</h3>
                        <small>Ativos</small>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GeneralDashboard;