// frontend/src/components/Layout.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, LayoutDashboard, LogOut } from 'lucide-react'; // Ícones para visual profissional
import SidebarMetrics from './SidebarMetrics'; // <--- O SEU WIDGET DE MÉTRICAS

const Layout = ({ children }) => {
    const location = useLocation();

    // --- ESTILOS (CSS-in-JS para manter tudo num arquivo só) ---
    
    const styles = {
        container: {
            display: 'flex',
            height: '100vh',
            backgroundColor: '#f3f4f6', // Fundo cinza bem claro e moderno
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        sidebar: {
            width: '260px',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', // Degradê sutil "Night Blue"
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '4px 0 15px rgba(0,0,0,0.05)', // Sombra suave para profundidade
            zIndex: 10,
        },
        sidebarHeader: {
            padding: '24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        title: {
            fontSize: '18px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            color: '#f8fafc',
            margin: 0
        },
        nav: {
            flex: 1,
            padding: '20px 12px',
            overflowY: 'auto'
        },
        metricsContainer: {
            padding: '0 12px 20px 12px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.1)' // Fundo levemente mais escuro para destacar
        },
        main: {
            flex: 1,
            overflowY: 'auto',
            padding: '30px',
            position: 'relative'
        },
        contentWrapper: {
            maxWidth: '1200px',
            margin: '0 auto'
        }
    };

    // Função para gerar o estilo do link (Ativo vs Inativo)
    const getLinkStyle = (path) => {
        const isActive = location.pathname === path;
        return {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: isActive ? '600' : '400',
            color: isActive ? '#ffffff' : '#94a3b8', // Branco se ativo, cinza azulado se inativo
            backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent', // Azul translúcido se ativo
            borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent', // Barrinha azul lateral
            transition: 'all 0.2s ease',
        };
    };

    return (
        <div style={styles.container}>
            
            {/* 1. SIDEBAR (Lateral Esquerda) */}
            <aside style={styles.sidebar}>
                
                {/* Cabeçalho da Sidebar */}
                <div style={styles.sidebarHeader}>
                    <div style={{ background: '#3b82f6', padding: '6px', borderRadius: '6px' }}>
                        <LayoutDashboard size={20} color="white" />
                    </div>
                    <h1 style={styles.title}>CONTROLE CACAU</h1>
                </div>

                {/* Navegação */}
                <nav style={styles.nav}>
                    <small style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', paddingLeft: '10px', textTransform: 'uppercase' }}>
                        Principal
                    </small>

                    <Link to="/" style={getLinkStyle('/')}>
                        <Users size={18} />
                        Cadastro de Produtores
                    </Link>

                    {/* Exemplo visual de como ficaria um botão sair ou config (Opcional) */}
                    {/* <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                        <span style={getLinkStyle('/logout')}>
                            <LogOut size={18} /> Sair do Sistema
                        </span>
                    </div> */}
                </nav>

                {/* --- AQUI ESTÁ O WIDGET QUE O CHEFE PEDIU --- */}
                {/* Fica na parte inferior do menu, fixo e visível */}
                <div style={styles.metricsContainer}>
                    <SidebarMetrics />
                </div>

            </aside>

            {/* 2. CONTEÚDO PRINCIPAL (Direita) */}
            <main style={styles.main}>
                <div style={styles.contentWrapper}>
                    {children}
                </div>
            </main>

        </div>
    );
};

export default Layout;