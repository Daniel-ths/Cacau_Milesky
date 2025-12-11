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


// backend/index.js (ROTA 3 - MODO DIAGNÓSTICO)

app.get('/conta-corrente/:clienteId', async (req, res) => {
    // 1. Limpeza do ID (Remove espaços em branco que podem quebrar a busca)
    const rawId = req.params.clienteId;
    const clienteId = parseInt(rawId.trim());

    console.log("========================================");
    console.log(`[DIAGNÓSTICO] ID Recebido na URL: "${rawId}"`);
    console.log(`[DIAGNÓSTICO] ID Convertido para busca: ${clienteId} (Tipo: ${typeof clienteId})`);

    const client = await pool.connect(); 

    try {
        // 2. DIAGNÓSTICO DO BANCO: Listar TODOS os IDs que existem
        // Isso vai nos provar se o ID 1 realmente está lá para o Backend ver
        const checkIds = await client.query('SELECT id FROM clientes');
        const listaIds = checkIds.rows.map(r => r.id);
        console.log(`[DIAGNÓSTICO] IDs existentes na tabela agora: [${listaIds.join(', ')}]`);

        const idExiste = listaIds.includes(clienteId);
        console.log(`[DIAGNÓSTICO] O ID ${clienteId} está na lista? ${idExiste ? 'SIM' : 'NÃO'}`);

        // 3. A BUSCA REAL
        console.log("[DIAGNÓSTICO] Executando Query de busca do cliente...");
const clienteResult = await client.query(
    // Force a conversão do parâmetro $1 para texto, e depois para INTEGER
    'SELECT id, nome, cpf, telefone, saldo_atual AS saldo FROM clientes WHERE id = CAST($1 AS TEXT)::INTEGER',
    [clienteId.toString()] // Garantimos que enviamos como string
);

        console.log(`[DIAGNÓSTICO] Linhas encontradas: ${clienteResult.rows.length}`);

        if (clienteResult.rows.length === 0) {
            console.log("❌ ERRO: Query retornou 0 linhas. Retornando 404.");
            return res.status(404).json({ 
                message: `Cliente não encontrado. O banco tem os IDs: [${listaIds.join(', ')}]` 
            });
        }

        const cliente = clienteResult.rows[0];
        console.log(`✅ SUCESSO: Cliente encontrado: ${cliente.nome}`);

        // 4. BUSCA DO EXTRATO
        const extratoResult = await client.query(
            'SELECT * FROM transacoes WHERE cliente_id = $1 ORDER BY data_transacao DESC',
            [clienteId]
        );

        res.json({
            cliente: cliente,
            extrato: extratoResult.rows
        });

    } catch (error) {
        console.error("❌ [ERRO CRÍTICO NO SQL]:", error);
        res.status(500).json({ message: "Erro interno: " + error.message });
    } finally {
        client.release();
        console.log("========================================");
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
app.put('/clientes/:id', async (req, res) => {
    // 1. Lê o ID da URL
    const clienteId = parseInt(req.params.id);
    
    // 2. Lê os dados do corpo
    const { nome, cpf, telefone } = req.body; // Campos que você permite editar

    // Validação básica (nome e CPF não podem ser vazios)
    if (!nome || !cpf || !clienteId) {
        return res.status(400).json({ message: "Nome, CPF e ID do cliente são obrigatórios." });
    }

    const client = await pool.connect();
    try {
        // 3. Executa a atualização
        const result = await client.query(
            'UPDATE clientes SET nome = $1, cpf = $2, telefone = $3 WHERE id = $4 RETURNING *',
            [nome, cpf, telefone, clienteId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Cliente não encontrado para edição." });
        }

        res.json({ message: "Cliente atualizado com sucesso!", cliente: result.rows[0] });
    } catch (error) {
        console.error("Erro ao atualizar cliente:", error);
        res.status(500).json({ message: "Erro interno no servidor ao atualizar o cliente." });
    } finally {
        client.release();
    }
});
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

// ROTA 9: Obter o saldo total devedor (o quanto a fazenda deve aos clientes)
app.get('/metrics/saldo-total', async (req, res) => {
    const client = await pool.connect();
    try {
        // Query para somar todos os saldos. Um saldo POSITIVO significa que a fazenda DEVE ao cliente (Crédito do cliente).
        // Um saldo NEGATIVO significa que o cliente DEVE à fazenda (Débito do cliente).
        const result = await client.query(`
            SELECT 
                SUM(CASE WHEN saldo_atual > 0 THEN saldo_atual ELSE 0 END) AS total_credor_fazenda,
                SUM(CASE WHEN saldo_atual < 0 THEN saldo_atual ELSE 0 END) AS total_devedor_fazenda
            FROM clientes;
        `);

        // O total_devedor_fazenda virá NEGATIVO, então pegamos o valor absoluto.
        const metrics = {
            total_credor: parseFloat(result.rows[0].total_credor_fazenda || 0), // O que a Fazenda Deve
            total_devedor: Math.abs(parseFloat(result.rows[0].total_devedor_fazenda || 0)) // O que os Clientes Devem
        };

        res.json(metrics);

    } catch (error) {
        console.error("Erro ao calcular métricas financeiras:", error);
        res.status(500).json({ message: "Erro interno ao calcular saldos totais." });
    } finally {
        client.release();
    }
});


// ----------------------------------------------------------------------
// ROTA X: Exportar Backup de Clientes (GET /backup/clientes) - CORRIGIDA FINAL
// ----------------------------------------------------------------------

app.get('/backup/clientes', async (req, res) => {
    try {
        console.log("Iniciando processo de backup..."); // Log para debug

        // 1. Buscar dados de Clientes
        const clientesResult = await pool.query('SELECT * FROM clientes ORDER BY id ASC');
        const clientes = clientesResult.rows;

        // 2. Buscar dados de Transações
        // CORREÇÃO AQUI: Mudamos de 'data' para 'data_transacao'
        const transacoesResult = await pool.query('SELECT * FROM transacoes ORDER BY data_transacao DESC');
        const transacoes = transacoesResult.rows;

        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                exportado_por: "Sistema de Gestão de Cacau",
                versoes: {
                    clientes: clientes.length,
                    transacoes: transacoes.length
                }
            },
            clientes: clientes,
            transacoes: transacoes
        };
        
        // 3. Configurar a resposta para download
        const filename = `backup_cacau_${new Date().toISOString().substring(0, 10)}.json`;
        
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/json');
        
        // 4. Enviar o arquivo JSON
        res.send(JSON.stringify(backupData, null, 2));
        
        console.log("Backup gerado e enviado com sucesso.");

    } catch (error) {
        // Logar o erro completo no console do servidor para você ver o que aconteceu
        console.error("Erro CRÍTICO ao gerar backup:", error);
        
        // Retornar a mensagem de erro padrão
        res.status(500).json({ 
            message: "Erro interno do servidor ao gerar o arquivo de backup.",
            error_details: error.message // Útil para desenvolvimento
        });
    }
});


// ----------------------------------------------------------------------
// Inicializa o servidor Express (DEVE SER SEMPRE A ÚLTIMA COISA)
// ----------------------------------------------------------------------
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});