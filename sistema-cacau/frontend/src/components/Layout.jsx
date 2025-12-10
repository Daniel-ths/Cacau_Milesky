// frontend/src/components/Layout.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // <-- ESSENCIAL PARA O ROTEAMENTO

const Layout = ({ children }) => {
  return (
    // Container Principal
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f4f4f5' }}>
      
      {/* 1. Sidebar (Menu Fixo) */}
      <aside style={{ width: '250px', backgroundColor: '#1f2937', color: 'white', padding: '16px 20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
           Controle
        </h1>
        <nav>
          {/* Link para a Lista de Clientes */}
          <Link 
            to="/" 
            style={{ 
              display: 'block', 
              padding: '10px', 
              borderRadius: '4px', 
              backgroundColor: '#374151', 
              transition: 'background-color 0.15s', 
              marginBottom: '8px', 
              color: 'white', // Adicionado para garantir a cor do texto
              textDecoration: 'none' // Remove sublinhado padrão
            }}>
            Cadastro de Clientes
          </Link>
          
          {/* Link temporário para Conta Corrente (Teste com ID 1) */}
          <Link 
            to="/conta-corrente/1" 
            style={{ 
              display: 'block', 
              padding: '10px', 
              borderRadius: '4px', 
              backgroundColor: 'transparent', 
              transition: 'background-color 0.15s', 
              marginBottom: '8px',
              color: 'white', // Adicionado para garantir a cor do texto
              textDecoration: 'none' // Remove sublinhado padrão
            }}>
            Conta Corrente
          </Link>
        </nav>
      </aside>

      {/* 2. Conteúdo Principal */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;