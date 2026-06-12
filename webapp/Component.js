sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "agentretail/model/models",
  "sap/ui/model/json/JSONModel",
  "sap/ui/dom/includeStylesheet"
], function (UIComponent, Device, models, JSONModel, includeStylesheet) {
  "use strict";

  return UIComponent.extend("agentretail.Component", {
    metadata: { manifest: "json" },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      includeStylesheet(sap.ui.require.toUrl("agentretail/css/style.css"));

      // Device
      this.setModel(models.createDeviceModel(), "device");

     

      // Itens selecionados (View1 -> View2)
      this.setModel(new JSONModel([]), "selectedMaterials");

      // Modelo do pedido (View2)
      this.setModel(new JSONModel({
        items: [],
        expectedDelivery: "",
        currency: "EUR",
         truckCapacity: 110, 
        totals: { totalWeight: 0, totalVolume: 0, totalValue: 0 }
      }), "order");

      // Modelo de alertas (exemplo com textos em Português)
      this.setModel(new JSONModel({
  count: 4,
        items: [
          { icon: 'sap-icon://alert', title: 'Lojas em risco', subtitle: 'Risco alto de ruptura', metricValue: '14', state: 'Error' },
          { icon: 'sap-icon://trend-up', title: 'Aumento demanda', subtitle: 'Versus fim de semana comum', metricValue: '18%-27%', state: 'Information' },
          { icon: 'sap-icon://temperature', title: 'Temperatura', subtitle: 'Regioes acima da media', metricValue: '30C+', state: 'Warning' },
          { icon: 'sap-icon://money-bills', title: 'Perda evitavel', subtitle: 'Reducao estimada com reposicao', metricValue: 'R$ 144 mil', state: 'Success' }
        ]
      }), "alerts");

      // UI-only model to control visibility of UI features (not persisted)
      this.setModel(new JSONModel({ showAlerts: false }), "ui");

  
      this.getRouter().initialize();
    }
  });
});


