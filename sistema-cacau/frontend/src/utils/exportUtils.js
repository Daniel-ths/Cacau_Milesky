// frontend/src/utils/exportUtils.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Função auxiliar para formatar moeda
const formatMoney = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Função auxiliar para formatar data
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

// ==========================================
// GERADOR DE PDF
// ==========================================
export const generatePDF = (cliente, transacoes) => {
  const doc = new jsPDF();

  // --- CÁLCULOS DO CONTRATO ---
  const transacoesCacau = transacoes.filter(t => parseFloat(t.peso_kg) > 0);
  
  const totalKg = transacoesCacau.reduce((acc, curr) => acc + Number(curr.peso_kg || 0), 0);
  const totalValorCacau = transacoesCacau.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
  
  // Evita divisão por zero
  const precoMedio = totalKg > 0 ? (totalValorCacau / totalKg) : 0;
  const saldoFinal = cliente.saldo_atual || 0;

  // --- CABEÇALHO ---
  doc.setFontSize(18);
  doc.text("EXTRATO DE CONTA CORRENTE - CACAU", 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

  // --- DADOS DO CLIENTE (Caixa Cinza) ---
  doc.setFillColor(240, 240, 240);
  doc.rect(14, 35, 182, 25, 'F');

  doc.setFontSize(12);
  doc.text(`Cliente: ${cliente.nome}`, 20, 42);
  doc.setFontSize(10);
  doc.text(`CPF: ${cliente.cpf}`, 20, 48);

  // --- RESUMO GERENCIAL ---
  doc.text(`Total Fornecido: ${totalKg.toLocaleString('pt-BR')} Kg`, 100, 42);
  doc.text(`Preço Médio: ${formatMoney(precoMedio)} / Kg`, 100, 48);
  
  if (saldoFinal < 0) doc.setTextColor(200, 0, 0); // Vermelho
  else doc.setTextColor(0, 100, 0); // Verde
  
  doc.text(`Saldo Atual: ${formatMoney(saldoFinal)}`, 100, 54);
  doc.setTextColor(0); // Reseta cor

  // --- TABELA ---
  const tableColumn = ["Data", "Tipo", "Peso (Kg)", "R$/Kg", "Valor (R$)"];
  const tableRows = [];

  transacoes.forEach(t => {
    const transactionData = [
      formatDate(t.data_transacao),
      t.tipo,
      t.peso_kg || '-',
      t.preco_por_kg ? formatMoney(t.preco_por_kg) : '-',
      formatMoney(t.valor_total)
    ];
    tableRows.push(transactionData);
  });

  doc.autoTable({
    startY: 65,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [44, 62, 80] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // Salvar arquivo
  doc.save(`Extrato_${cliente.nome}.pdf`);
};

// ==========================================
// GERADOR DE CSV (EXCEL)
// ==========================================
export const generateCSV = (cliente, transacoes) => {
  const headers = ["Data", "Tipo", "Observacao", "Peso (Kg)", "Preco por Kg", "Valor Total"];
  
  const rows = transacoes.map(t => [
    formatDate(t.data_transacao),
    t.tipo,
    t.observacao || '',
    t.peso_kg || 0,
    t.preco_por_kg || 0,
    t.valor_total
  ]);

  const csvContent = [
    headers.join(";"), 
    ...rows.map(e => e.join(";"))
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `Extrato_${cliente.nome}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};