sap.ui.define([], function () {
  "use strict";

  // Regras simples de exemplo. Você pode trocar por dados reais (contratos, acordos, validade de preço etc.)
  function _days(n) { return Math.max(0, Math.floor(n)); }

  /**
   * Calcula alertas com base no modelo "order".
   * @param {object} orderData  Ex.: { items:[...], expectedDelivery, ... }
   * @returns {{count:number, items:Array}}
   */
  function recalc(orderData) {
    const out = [];
    const items = (orderData && orderData.items) || [];

    // Regra 1: contrato perto do vencimento (mock: 12 dias)
    //const contractDays = _days((orderData.contractDaysLeft != null) ? orderData.contractDaysLeft : 12);
    const contractDays = 0; 
    if (contractDays == 0) {
      out.push({
        key: "Negotiation",
        title: "Condições de pagamento propostas: 30 dias por 3% de desconto",
        subtitle: "Recomendação: Alterar as condições de pagamento para melhorar o fluxo de caixa.",
        //days: contractDays,
        //state: contractDays <= 5 ? "Error" : "Warning",
        icon: "sap-icon://appointment-2"
      });
    }



        // Regra 2: preços/acordos a expirar (mock: 3 dias se existir qualquer item)
    if (items.length) {
      const priceDays = _days((orderData.priceConditionsDaysLeft != null) ? orderData.priceConditionsDaysLeft : 3);
      if (priceDays <= 10) {
        out.push({
          key: "Riscos Potenciais",
          title: "O fornecedor pode dificultar o pagamento.",
          subtitle: 'Pode ser necessário um pagamento adicional pela extensão da garantia.',
          //days: priceDays,
          //state: priceDays <= 3 ? "Error" : "Warning",
          icon: "sap-icon://payment-approval"
        });
      }
    }
    // Regra 3 (opcional): capacidade excedida
    const cap = Number(orderData.truckCapacity) || 0;
    const used = Number((orderData.totals || {}).totalWeight) || 0;
    if (1 == 1) {
      out.push({
        key: "capacity",
        title: "Negociar desconto no total do Pedido de  5%",
        subtitle: "itens desta categoria apresentam excesso de oferta no mercado, conforme análises e fontes externas",
       // days: 0,
       // state: "Error",
        icon: "sap-icon://shipping-status"
      });
    }

       if (used > 1) {
      out.push({
        key: "capacity",
        title: "A nova solicitação de compras pode ocasionar um excesso de estoque por mais de 10 Dias ",
        subtitle: "revisar a necessidade do pedido, pois o item apresenta baixa demanda no período analisado.",
       // state: "Error",
        icon: "sap-icon://shipping-status"
      });
    }
    return { count: out.length, items: out };
  }

  return { recalc };
});
