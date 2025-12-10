import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importe seus componentes de página
import ClientList from './pages/ClientList'; 
import ContaCorrente from './pages/ContaCorrente';
// Importe seu componente de cadastro (ClientForm, que você usou como modal, mas o chamo aqui para o caso de ter uma rota)
import ClientForm from './components/ClientForm'; 

// Componente simples para lidar com rotas não encontradas (Opcional, mas recomendado)
const NotFound = () => (
    <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>404 - Página Não Encontrada</h2>
        <p>A rota que você tentou acessar não existe.</p>
    </div>
);


function App() {
    return (
        // BrowserRouter envolve toda a aplicação para habilitar o roteamento
        <BrowserRouter>
            <Routes>
                
                {/* Rota 1: Página Inicial (Lista de Clientes) */}
                <Route path="/" element={<ClientList />} />
                
                {/* Rota 2: Cadastro / Edição de Cliente */}
                {/* O ':id?' torna o ID opcional. Se você usa modal, pode não precisar desta rota. */}
                <Route path="/cadastro/:id?" element={<ClientForm />} />
                
                {/* 🚨 ROTA CRÍTICA RESOLVIDA: Conta Corrente com parâmetro dinâmico 🚨 */}
                {/* O :clienteId é o que permite o link /conta-corrente/1, /conta-corrente/2, etc. */}
                <Route path="/conta-corrente/:clienteId" element={<ContaCorrente />} />
                
                {/* Rota 404: Captura qualquer URL que não corresponda às acima */}
                <Route path="*" element={<NotFound />} />

            </Routes>
        </BrowserRouter>
    );
}

// 🚨 ESTA É A LINHA MAIS IMPORTANTE PARA RESOLVER O SEU SYNTAXERROR 🚨
export default App;