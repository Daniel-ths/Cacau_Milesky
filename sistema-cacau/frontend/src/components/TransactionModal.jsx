// frontend/src/components/TransactionModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Package, CreditCard, Banknote, ArrowRightLeft } from 'lucide-react';
import styles from './TransactionModal.module.css';
import { api } from '../api';

const TransactionModal = ({ onClose, onSuccess, clienteId, clienteNome }) => {
    
    // Configuração Visual dos Tipos
    const TYPES = {
        COMPRA_PRAZO: { 
            label: 'Compra a Prazo', 
            desc: 'Gera saldo devedor',
            color: '#ef4444', // Vermelho (Dívida)
            icon: <CreditCard size={24} />
        },
        COMPRA_AVISTA: { 
            label: 'Compra à Vista', 
            desc: 'Dinheiro na mão',
            color: '#10b981', // Verde
            icon: <Banknote size={24} />
        },
        DEPOSITO: { 
            label: 'Depósito (Estoque)', 
            desc: 'Apenas guarda cacau',
            color: '#d97706', // Laranja/Marrom
            icon: <Package size={24} />
        },
        PAGAMENTO: { 
            label: 'Pagar Cliente', 
            desc: 'Baixa na dívida',
            color: '#3b82f6', // Azul
            icon: <ArrowRightLeft size={24} />
        }
    };

    const [formData, setFormData] = useState({
        tipo: 'COMPRA_PRAZO',
        data: new Date().toISOString().split('T')[0],
        peso: '',
        preco: '',
        valor_total: '',
        observacao: ''
    });

    const [loading, setLoading] = useState(false);
    
    // Refs para focar inputs
    const pesoInputRef = useRef(null);
    const valorInputRef = useRef(null);

    // Foca no campo certo quando muda o tipo
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.tipo === 'PAGAMENTO') {
                valorInputRef.current?.focus();
            } else {
                pesoInputRef.current?.focus();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [formData.tipo]);

    // Cálculo automático: Peso * Preço
    useEffect(() => {
        const { peso, preco, tipo } = formData;
        if (tipo !== 'PAGAMENTO' && peso && preco) {
            const pesoNum = parseFloat(peso.replace(',', '.'));
            const precoNum = parseFloat(preco.replace(',', '.'));
            
            if (!isNaN(pesoNum) && !isNaN(precoNum)) {
                const total = (pesoNum * precoNum).toFixed(2);
                setFormData(prev => ({ ...prev, valor_total: total }));
            }
        }
    }, [formData.peso, formData.preco, formData.tipo]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeSelect = (newType) => {
        setFormData(prev => ({ 
            ...prev, 
            tipo: newType, 
            peso: newType === 'PAGAMENTO' ? '' : prev.peso,
            preco: newType === 'PAGAMENTO' || newType === 'DEPOSITO' ? '' : prev.preco,
            valor_total: newType === 'DEPOSITO' ? '' : prev.valor_total
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                // CORREÇÃO AQUI: Mudamos de 'cliente_id' para 'clienteId'
                // O Backend espera 'clienteId' para vincular corretamente.
                clienteId: clienteId, 
                tipo: formData.tipo,
                data_transacao: formData.data,
                peso_kg: formData.peso ? parseFloat(formData.peso.replace(',', '.')) : 0,
                preco_por_kg: formData.preco ? parseFloat(formData.preco.replace(',', '.')) : 0,
                valor_total: formData.valor_total ? parseFloat(formData.valor_total.replace(',', '.')) : 0,
                observacao: formData.observacao
            };

            const response = await api.post('/transacoes', payload);
            
            // Verifica sucesso (compatível com fetch nativo ou axios)
            if (response.ok || response.status === 200 || response.status === 201) {
                if (onSuccess) onSuccess(); // Avisa o pai para atualizar a tabela
                onClose(); // Fecha o modal
            } else {
                throw new Error('Erro ao salvar no servidor.');
            }

        } catch (err) {
            console.error(err);
            alert("Erro ao salvar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Controle de Exibição
    const currentTypeConfig = TYPES[formData.tipo];
    const showPeso = formData.tipo !== 'PAGAMENTO';
    const showPreco = formData.tipo !== 'PAGAMENTO' && formData.tipo !== 'DEPOSITO';
    const showTotal = formData.tipo !== 'DEPOSITO';

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                
                <div className={styles.header}>
                    <div>
                        <h3>Nova Movimentação</h3>
                        <small style={{color:'#64748b'}}>Cliente: {clienteNome}</small>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}><X size={20}/></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    
                    <div className={styles.typeGrid}>
                        {Object.entries(TYPES).map(([key, config]) => (
                            <div 
                                key={key}
                                className={`${styles.typeCard} ${formData.tipo === key ? styles.active : ''}`}
                                onClick={() => handleTypeSelect(key)}
                                style={{ color: formData.tipo === key ? config.color : '' }}
                            >
                                <div className={styles.typeIcon}>{config.icon}</div>
                                <span className={styles.typeLabel}>{config.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.formBody}>
                        <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                            <label>Data da Operação</label>
                            <input 
                                type="date" 
                                name="data" 
                                value={formData.data} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <div className={styles.row}>
                            {showPeso && (
                                <div className={styles.formGroup}>
                                    <label>Peso do Cacau</label>
                                    <div className={styles.inputWrapper}>
                                        <input 
                                            ref={pesoInputRef}
                                            type="number" step="0.01" 
                                            name="peso" 
                                            value={formData.peso} 
                                            onChange={handleChange}
                                            placeholder="0.00"
                                        />
                                        <span className={styles.suffix}>Kg</span>
                                    </div>
                                </div>
                            )}

                            {showPreco && (
                                <div className={styles.formGroup}>
                                    <label>Preço por Kg</label>
                                    <div className={styles.inputWrapper}>
                                        <input 
                                            type="number" step="0.01" 
                                            name="preco" 
                                            value={formData.preco} 
                                            onChange={handleChange}
                                            placeholder="0.00"
                                        />
                                        <span className={styles.suffix}>R$</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {showTotal && (
                            <div className={styles.formGroup}>
                                <label>{formData.tipo === 'PAGAMENTO' ? 'Valor a Pagar' : 'Valor Total Calculado'}</label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        ref={valorInputRef}
                                        type="number" step="0.01" 
                                        name="valor_total" 
                                        value={formData.valor_total} 
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        style={{ fontWeight: 'bold', color: currentTypeConfig.color }}
                                    />
                                    <span className={styles.suffix}>R$</span>
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                            <label>Observação (Opcional)</label>
                            <input 
                                type="text" 
                                name="observacao" 
                                value={formData.observacao} 
                                onChange={handleChange}
                                placeholder="Detalhes..."
                            />
                        </div>

                        {showPeso && showPreco && formData.peso && formData.preco && (
                            <div className={styles.totalHighlight}>
                                <small>Resumo da Transação</small>
                                <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', color: '#64748b'}}>
                                    <span>{formData.peso} Kg</span>
                                    <X size={12}/>
                                    <span>R$ {formData.preco}</span>
                                    <span>=</span>
                                    <span className={styles.totalValue} style={{ color: currentTypeConfig.color }}>
                                        R$ {formData.valor_total}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {formData.tipo === 'DEPOSITO' && (
                            <div className={styles.totalHighlight} style={{ background: '#fff7ed', borderColor: '#fdba74' }}>
                                <Package size={24} color="#d97706" style={{ marginBottom: '5px' }}/>
                                <div className={styles.totalValue} style={{ color: '#d97706' }}>
                                    + {formData.peso || 0} Kg
                                </div>
                                <small style={{ color: '#9a3412' }}>Será adicionado ao estoque do cliente.</small>
                            </div>
                        )}

                    </div>

                    <div className={styles.footer}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancelar</button>
                        <button type="submit" className={styles.saveBtn} disabled={loading} style={{ backgroundColor: currentTypeConfig.color }}>
                            <Save size={18} /> {loading ? 'Salvando...' : 'Confirmar Lançamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionModal;