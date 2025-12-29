const express = require('express');
const cors = require('cors');
const Datastore = require('nedb-promises');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO BANCO DE DADOS (NeDB) ---

// 1. Define onde salvar (Usa a pasta enviada pelo Electron ou a atual)
const userDataPath = process.env.USER_DATA_PATH || __dirname;
const dbFolder = path.join(userDataPath, 'database');

// 2. Garante que a pasta existe
if (!fs.existsSync(dbFolder)) {
    try {
        fs.mkdirSync(dbFolder, { recursive: true });
    } catch (err) {
        console.error("Erro crítico ao criar pasta do banco:", err);
    }
}

console.log("--> Banco de dados localizado em:", dbFolder);

// 3. Inicializa as tabelas
const db = {
    clientes: Datastore.create({ 
        filename: path.join(dbFolder, 'clientes.db'), 
        autoload: true,
        timestampData: true 
    }),
    transacoes: Datastore.create({ 
        filename: path.join(dbFolder, 'transacoes.db'), 
        autoload: true,
        timestampData: true 
    })
};

db.transacoes.ensureIndex({ fieldName: 'clienteId' });

// --- ROTAS DA API ---

app.get('/', (req, res) => {
    res.json({ status: 'online', path: dbFolder, type: 'NeDB' });
});

// LISTAR CLIENTES (VERSÃO OTIMIZADA + ESTOQUE)
app.get('/clientes', async (req, res) => {
    try {
        // 1. Busca todos os clientes
        const clientes = await db.clientes.find({}).sort({ nome: 1 });
        
        // 2. Busca TODAS as transações (apenas campos necessários para cálculo)
        const todasTransacoes = await db.transacoes.find({}, { clienteId: 1, valor_total: 1, tipo: 1, peso_kg: 1 });

        // 3. Faz o cálculo na memória
        const clientesFormatados = clientes.map(c => {
            const transacoesDoCliente = todasTransacoes.filter(t => t.clienteId === c._id);
            
            // Calcula Saldo Financeiro (R$)
            const saldo = transacoesDoCliente.reduce((acc, t) => acc + (t.valor_total || 0), 0);
            
            // Calcula Estoque de Depósito (Kg) - NOVA FUNÇÃO
            const estoque = transacoesDoCliente
                .filter(t => t.tipo === 'DEPOSITO')
                .reduce((acc, t) => acc + (t.peso_kg || 0), 0);

            return { 
                ...c, 
                id: c._id, 
                saldo_atual: saldo,
                total_depositado: estoque // Novo campo para o frontend
            };
        });

        res.json(clientesFormatados);
    } catch (err) {
        console.error("Erro ao listar clientes:", err);
        res.status(500).json({ error: err.message });
    }
});

// CRIAR CLIENTE
app.post('/clientes', async (req, res) => {
    try {
        // Adicionamos valores padrão para Juros e Risco
        const { nome, cpf, telefone, endereco, taxa_juros, perfil_risco } = req.body;
        
        const newDoc = await db.clientes.insert({ 
            nome, 
            cpf, 
            telefone, 
            endereco,
            taxa_juros: taxa_juros || 0,        // Novo
            perfil_risco: perfil_risco || 'Normal' // Novo
        });
        
        console.log("Cliente criado com ID:", newDoc._id);

        res.json({ 
            id: newDoc._id, 
            message: "Cliente cadastrado com sucesso!" 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EDITAR CLIENTE
app.put('/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, cpf, telefone, endereco, taxa_juros, perfil_risco } = req.body;
        
        // Permite atualizar os dados novos também
        await db.clientes.update({ _id: id }, { 
            $set: { nome, cpf, telefone, endereco, taxa_juros, perfil_risco } 
        });
        res.json({ message: "Cliente atualizado!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EXCLUIR CLIENTE
app.delete('/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.transacoes.remove({ clienteId: id }, { multi: true });
        const numRemoved = await db.clientes.remove({ _id: id }, {});
        
        if (numRemoved === 0) {
            return res.status(404).json({ message: "Cliente não encontrado." });
        }

        res.json({ message: "Cliente e transações excluídos." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CONTA CORRENTE (LÓGICA FINANCEIRA E ESTOQUE) ---

app.get('/conta-corrente/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        console.log(`[DEBUG] Buscando dados para ID: "${id}"`);

        const cliente = await db.clientes.findOne({ _id: id });
        if (!cliente) return res.status(404).json({ message: "Cliente não encontrado" });

        // Busca transações e ordena
        const todasTransacoes = await db.transacoes.find({ clienteId: id }).sort({ data_transacao: -1 });
        
        // Filtro de Data
        let extrato = todasTransacoes;
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            extrato = extrato.filter(t => {
                const dataT = new Date(t.data_transacao || t.createdAt);
                if (start && dataT < start) return false;
                if (end && dataT > end) return false;
                return true;
            });
        }

        // --- CÁLCULOS SEPARADOS ---
        
        // 1. Saldo Financeiro (R$) - Soma tudo que está em 'valor_total'
        // (Nota: No POST nós já garantimos que Depósito e Compra à Vista salvam valor_total como 0)
        const saldoTotal = todasTransacoes.reduce((acc, t) => acc + (t.valor_total || 0), 0);

        // 2. Estoque de Depósito (Kg) - Soma apenas o tipo DEPOSITO
        const totalDepositado = todasTransacoes
            .filter(t => t.tipo === 'DEPOSITO')
            .reduce((acc, t) => acc + (t.peso_kg || 0), 0);

        res.json({
            cliente: { 
                ...cliente, 
                id: cliente._id, 
                saldo: saldoTotal,
                total_depositado: totalDepositado, // Envia para o frontend mostrar no Card
                taxa_juros: cliente.taxa_juros || 0
            },
            extrato: extrato.map(t => ({ 
                ...t, 
                id: t._id,
                // Adicionamos uma flag para o frontend saber se é depósito
                is_deposito: t.tipo === 'DEPOSITO' 
            }))
        });

    } catch (err) {
        console.error("[ERRO API]", err);
        res.status(500).json({ error: err.message });
    }
});

// NOVA TRANSAÇÃO (LÓGICA DO CLIENTE CHATO)
app.post('/transacoes', async (req, res) => {
    try {
        const { clienteId, tipo, peso_kg, preco_por_kg, valor_total, observacao } = req.body;
        
        // Tratamento de Números
        const pesoNum = parseFloat(peso_kg) || 0;
        const precoNum = parseFloat(preco_por_kg) || 0;
        const valorRaw = parseFloat(valor_total) || 0;

        // LÓGICA DE SINAIS FINANCEIROS
        // Definimos o que vai somar ou subtrair do saldo do cliente
        let valorFinalFinanceiro = 0;

        if (tipo === 'COMPRA_PRAZO') {
            // Cliente compra fiado: Dívida aumenta (vamos usar negativo para dívida, ou conforme sua lógica)
            // Se sua lógica é: Positivo = Crédito, Negativo = Dívida.
            // Compra a prazo = Dívida = Negativo.
            valorFinalFinanceiro = -Math.abs(valorRaw);
        } 
        else if (tipo === 'PAGAMENTO') {
            // Cliente paga: Saldo aumenta (fica positivo/menos devedor)
            valorFinalFinanceiro = Math.abs(valorRaw);
        }
        else if (tipo === 'COMPRA_AVISTA') {
            // Dinheiro na mão: Não altera saldo devedor.
            // Salvamos 0 no valor_total para não afetar a soma do saldo.
            valorFinalFinanceiro = 0;
        }
        else if (tipo === 'DEPOSITO') {
            // Apenas estoque: Não altera saldo financeiro.
            valorFinalFinanceiro = 0;
        }

        const novaTransacao = {
            clienteId: String(clienteId),
            tipo,
            peso_kg: pesoNum,
            preco_por_kg: precoNum,
            
            // Este campo é usado para calcular o SALDO
            valor_total: valorFinalFinanceiro, 
            
            // Vamos salvar o valor original aqui para histórico visual, caso seja 'A_VISTA'
            valor_visual: valorRaw, 

            observacao,
            data_transacao: new Date()
        };

        const doc = await db.transacoes.insert(novaTransacao);
        res.json({ id: doc._id, message: "Transação registrada!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EXCLUIR TRANSAÇÃO
app.delete('/transacoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.transacoes.remove({ _id: id }, {});
        res.json({ message: "Transação excluída." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ATUALIZAÇÃO NO index.js
// MÉTRICAS GERAIS (Financeiro + Estoque)
app.get('/metrics/saldo-total', async (req, res) => {
    try {
        const todasTransacoes = await db.transacoes.find({});
        
        let total_credor = 0;   // O que a empresa deve pagar (Saldos positivos dos clientes)
        let total_devedor = 0;  // O que a empresa tem a receber (Saldos negativos dos clientes)
        let total_estoque = 0;  // Total de Kg depositado

        // Precisamos calcular cliente por cliente para ter precisão no financeiro
        const clientes = await db.clientes.find({});

        for (const cli of clientes) {
            const transacoesCli = todasTransacoes.filter(t => t.clienteId === cli._id);
            
            // 1. Calcula Saldo Financeiro do Cliente
            const saldoCli = transacoesCli.reduce((acc, t) => acc + (t.valor_total || 0), 0);
            
            if (saldoCli > 0) total_credor += saldoCli;
            else total_devedor += Math.abs(saldoCli);

            // 2. Calcula Estoque deste Cliente
            const estoqueCli = transacoesCli
                .filter(t => t.tipo === 'DEPOSITO')
                .reduce((acc, t) => acc + (t.peso_kg || 0), 0);
            
            total_estoque += estoqueCli;
        }

        res.json({ 
            total_credor, 
            total_devedor, 
            total_estoque // <--- Novo campo
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BACKUP
app.get('/backup/clientes', (req, res) => {
    const file = path.join(dbFolder, 'clientes.db');
    if (fs.existsSync(file)) res.download(file);
    else res.status(404).send("Sem dados.");
});

// No final do arquivo index.js
const PORT = 3001; // <--- Mude de 3000 para 3001
app.listen(PORT, () => {
    console.log(`Servidor NeDB rodando na porta ${PORT}`);
});