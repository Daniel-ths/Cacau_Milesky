// backend/index.js

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

// Configuração do PostgreSQL
const pool = new Pool({
    user: 'postgres', 
    host: 'localhost',
    database: 'gestao_cacau', 
    password: 'root', // Mantenha sua senha real
    port: 5432,
});

// Middlewares
app.use(cors()); // Permite requisições do frontend
app.use(express.json()); // Permite que o Express leia JSON do body das requisições

// Verifica a conexão com o banco de dados
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao PostgreSQL:', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Erro ao executar consulta de teste:', err.stack);
        }
        console.log('PostgreSQL conectado com sucesso.');
    });
});


// ----------------------------------------------------------------------
// ROTA 1: Listar Clientes (GET /clientes)
// ----------------------------------------------------------------------

app.get('/clientes', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome, cpf, telefone, saldo_atual FROM clientes ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao listar clientes:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ----------------------------------------------------------------------
// ROTA 2: Cadastrar Cliente (POST /clientes)
// ----------------------------------------------------------------------

app.post('/clientes', async (req, res) => {
    const { nome, cpf, telefone } = req.body;
    
    if (!nome || !cpf) {
        return res.status(400).json({ message: "Nome e CPF são obrigatórios." });
    }

    try {
        const result = await pool.query(
            'INSERT INTO clientes (nome, cpf, telefone, saldo_atual) VALUES ($1, $2, $3, 0.00) RETURNING *',
            [nome, cpf, telefone]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao cadastrar cliente:", error);
        if (error.code === '23505') {
            return res.status(409).json({ message: "CPF já cadastrado." });
        }
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});


// ----------------------------------------------------------------------
// ROTA 3: Conta Corrente e Extrato (GET /conta-corrente/:clienteId)
// ----------------------------------------------------------------------

app.get('/conta-corrente/:clienteId', async (req, res) => {
    const { clienteId } = req.params;

console.log(`[REQ. CONTA CORRENTE] Tentativa de acesso ao Cliente ID: ${clienteId}`);

    const { startDate, endDate } = req.query;

    const client = await pool.connect(); 

    try {
        // 1. BUSCAR DADOS DO CLIENTE
const clienteResult = await client.query(
            // Use CAST para garantir que $1 (clienteId) é um INTEIRO
            'SELECT id, nome, cpf, telefone, saldo_atual AS saldo FROM clientes WHERE id = CAST($1 AS INTEGER)', 
            [clienteId]
        );

        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ message: "Cliente não encontrado." });
        }

        const cliente = clienteResult.rows[0];

        // 2. CONSTRUIR A CONSULTA DO EXTRATO (com filtros)
        let queryExtrato = `
            SELECT id, tipo, peso_kg, preco_por_kg, valor_total, data_transacao, observacao
            FROM transacoes
            WHERE cliente_id = $1
        `;
        const queryParams = [clienteId];
        let paramIndex = 2;

        if (startDate) {
            queryParams.push(startDate);
            queryExtrato += ` AND data_transacao >= $${paramIndex++}`;
        }

        if (endDate) {
            const adjustedEndDate = new Date(endDate);
            adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
            
            queryParams.push(adjustedEndDate.toISOString().split('T')[0]);
            queryExtrato += ` AND data_transacao < $${paramIndex++}`;
        }
        
        queryExtrato += ` ORDER BY data_transacao DESC`;

        const extratoResult = await client.query(queryExtrato, queryParams);

        res.json({
            cliente: cliente,
            extrato: extratoResult.rows
        });

    } catch (error) {
        console.error("Erro ao buscar conta corrente:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    } finally {
        client.release();
    }
});


// ----------------------------------------------------------------------
// ROTA 4: Lançar Transação (POST /transacoes)
// ----------------------------------------------------------------------

app.post('/transacoes', async (req, res) => {
    const { clienteId, tipo, peso_kg, preco_por_kg, valor_total, observacao } = req.body;

    if (!clienteId || !tipo || valor_total === undefined || valor_total === null) {
        return res.status(400).json({ message: "Dados básicos da transação (cliente, tipo, valor) são obrigatórios." });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Inicia transação atômica

        const novaTransacaoResult = await client.query(
            `INSERT INTO transacoes (cliente_id, tipo, peso_kg, preco_por_kg, valor_total, observacao)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, data_transacao, valor_total`,
            [clienteId, tipo, peso_kg, preco_por_kg, valor_total, observacao]
        );
        
        await client.query(
            'UPDATE clientes SET saldo_atual = saldo_atual + $1 WHERE id = $2',
            [valor_total, clienteId]
        );
        
        await client.query('COMMIT'); // Confirma

        res.status(201).json({
            message: "Transação registrada e saldo atualizado com sucesso.",
            transacao: novaTransacaoResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Desfaz
        console.error("Erro ao registrar transação (ROLLBACK):", error);
        res.status(500).json({ message: "Erro interno do servidor ao processar transação." });
    } finally {
        client.release();
    }
});


// ----------------------------------------------------------------------
// ROTA 5: Saldo Global para Dashboard (GET /dashboard/saldo)
// ----------------------------------------------------------------------
app.get('/dashboard/saldo', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                SUM(CASE WHEN saldo_atual < 0 THEN saldo_atual ELSE 0 END) AS total_devedor,
                SUM(CASE WHEN saldo_atual > 0 THEN saldo_atual ELSE 0 END) AS total_credor
            FROM clientes
        `);

        const totalDevedor = Math.abs(parseFloat(result.rows[0].total_devedor || 0));
        const totalCredor = parseFloat(result.rows[0].total_credor || 0);

        res.json({
            total_devedor: totalDevedor,
            total_credor: totalCredor
        });

    } catch (error) {
        console.error("Erro ao buscar saldo global:", error);
        res.status(500).json({ message: "Erro interno ao buscar dashboard." });
    }
});


// ----------------------------------------------------------------------
// ROTA 6: Edição de Cliente (PUT /clientes/:id)
// ----------------------------------------------------------------------
// *Adicione a rota PUT aqui se estiver usando para Edição.*


// ----------------------------------------------------------------------
// ROTA 7: Excluir Cliente (DELETE /clientes/:id)
// ----------------------------------------------------------------------

app.delete('/clientes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM clientes WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Cliente não encontrado para exclusão." });
        }

        res.status(200).json({ message: "Cliente excluído com sucesso." });

    } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        
        if (error.code === '23503') { // Foreign Key Violation
             return res.status(409).json({ 
                 message: "Não foi possível excluir o cliente. Ele possui transações registradas no extrato." 
             });
        }
        
        res.status(500).json({ message: "Erro interno do servidor ao tentar excluir cliente." });
    }
});


// ----------------------------------------------------------------------
// ROTA 8: Excluir Transação (DELETE /transacoes/:id) - Reverte o Saldo
// ----------------------------------------------------------------------

app.delete('/transacoes/:id', async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Inicia transação atômica

        // 1. Buscar a transação
        const transacaoResult = await client.query(
            'SELECT cliente_id, valor_total FROM transacoes WHERE id = $1',
            [id]
        );

        if (transacaoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Transação não encontrada." });
        }

        const { cliente_id, valor_total } = transacaoResult.rows[0];
        
        // 2. Reverter o saldo
        const valorReversao = -valor_total; 

        await client.query(
            'UPDATE clientes SET saldo_atual = saldo_atual + $1 WHERE id = $2 RETURNING saldo_atual',
            [valorReversao, cliente_id]
        );

        // 3. Excluir a transação
        await client.query(
            'DELETE FROM transacoes WHERE id = $1',
            [id]
        );

        await client.query('COMMIT'); 

        res.status(200).json({ message: "Transação excluída e saldo revertido com sucesso." });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro ao excluir transação:", error);
        res.status(500).json({ message: "Erro interno do servidor ao tentar excluir transação." });
    } finally {
        client.release();
    }
});


// ----------------------------------------------------------------------
// Inicializa o servidor Express (DEVE SER SEMPRE A ÚLTIMA COISA)
// ----------------------------------------------------------------------
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});