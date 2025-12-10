


export const formatCurrency = (value) => {

    const numberValue = parseFloat(value);
    if (isNaN(numberValue)) {
        return 'R$ 0,00';
    }

    return numberValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};


export const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);

        return date.toLocaleDateString('pt-BR'); 
    } catch (e) {
        console.error("Erro ao formatar data:", e);
        return dateString;
    }
};