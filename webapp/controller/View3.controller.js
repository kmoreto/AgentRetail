sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/routing/History",
  "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator, History, Fragment) {
  "use strict";

  return Controller.extend("agentretail.controller.View3", {

    onInit: function () {
      this.getOwnerComponent().getRouter()
        .getRoute("RouteView3")
        .attachPatternMatched(this._onMatched, this);
    },

    _onRouteMatched: function () {
      this._distributeSuggestedQty();
    },

    _onMatched: function (oEvent) {
      var oDetailModel = this.getOwnerComponent().getModel("detail");
      var oData = oDetailModel && oDetailModel.getData ? oDetailModel.getData() : null;

      if (!oData || !oData.id) {
        var sId = decodeURIComponent(oEvent.getParameter("arguments").materialId || "");
        var aItems = (this.getOwnerComponent().getModel("materials") &&
                      this.getOwnerComponent().getModel("materials").getProperty("/items")) || [];
        var oFound = aItems.find(function (x) { return x.id === sId; });
        oData = oFound || {};
      }

      if (!oData.stores || !Array.isArray(oData.stores)) {
        oData.stores = this._buildMockStores(oData.unit || "EA");
      }

      // moeda padrão usada na coluna de preço
      oData.currency = oData.currency || "EUR";

      // total a adicionar para o status do cabeçalho
      oData.totalAdd = oData.stores.reduce(function (s, r) { return s + (Number(r.qtyAdd) || 0); }, 0);

      var oModel = oDetailModel instanceof JSONModel ? oDetailModel : new JSONModel();
      oModel.setData(oData);
      this.getOwnerComponent().setModel(oModel, "detail");
      this.getView().setModel(oModel, "detail");
      

        // 1) Descobrir a quantidade sugerida que veio da View2
        //    (procuramos no model "order" o item com o mesmo id)
        var iSuggested = 0;
        // pega o item da View2 no model 'order'
        var oOrder = this.getOwnerComponent().getModel("order");
        var aOrderItems = (oOrder && oOrder.getProperty("/items")) || [];
        var oIt = aOrderItems.find(function (x) { return x.id === oData.id; });
        if (oOrder) {
          var aOrderItems = oOrder.getProperty("/items") || [];
          var oIt = aOrderItems.find(function (x) { return x.id === oData.id; });
          if (oIt) { iSuggested = Number(oIt.qtyBase || oIt.qty) || 0; }
        }
        // se você também setou um model "material" com suggestedQty, use como fallback
        if (!iSuggested) {
          var oMatM = this.getOwnerComponent().getModel("material");
          if (oMatM && oMatM.getData) {
            iSuggested = Number(oMatM.getData().suggestedQty) || 0;
          }
        }
        oData.suggestedQty = iSuggested;
        
        // 2) Gravar e ligar na view
        var oModel = (this.getOwnerComponent().getModel("detail") instanceof JSONModel)
          ? this.getOwnerComponent().getModel("detail")
          : new JSONModel();
        oModel.setData(oData);
        this.getOwnerComponent().setModel(oModel, "detail");
        this.getView().setModel(oModel, "detail");

        // 3) Distribuir a sugerida entre as lojas
        this._distributeSuggestedQty();
    },

     _distributeSuggestedQty: function () {
            var oDetailM = this.getView().getModel("detail");
            if (!oDetailM) { return; }

            var d = oDetailM.getData() || {};
            var iTotal = Number(d.suggestedQty) || 0;
            var aRows  = d.stores || [];
            if (!iTotal || !aRows.length) { return; }

            var base = Math.floor(iTotal / aRows.length);
            var rest = iTotal % aRows.length;

            aRows.forEach(function (r, i) {
              var v = base + (i < rest ? 1 : 0);
              r.distQty  = v;                  // coluna "Qtd distribuída"
              r.qtyAdd   = v;                  // opcional: já pré-preenche "Qtd a adicionar"
              var price  = Number(r.sellPrice) || Number(d.avgSellPrice) || 0;
              r.forecast = Math.round(v * price * 100) / 100; // previsão (moeda)
            });

            // atualiza o total do cabeçalho
            d.totalAdd = aRows.reduce(function (s, r) { return s + (Number(r.qtyAdd) || 0); }, 0);

            oDetailM.refresh(true);
          },




    // mock com preço de venda por loja
    _buildMockStores: function (sUnit) {
      return [
        { storeId: "R103", storeName: "Store", stock: 10, coverageDays: 7, qtyAdd: 0, unit: sUnit, sellPrice: 11.90 , forecast: 10},
        { storeId: "R104", storeName: "Store Berlin Mitte",  stock:  8, coverageDays: 5, qtyAdd: 0, unit: sUnit, sellPrice: 34.50 , forecast: 10},
        { storeId: "R105", storeName: "Store Hamburg",       stock: 12, coverageDays: 9, qtyAdd: 0, unit: sUnit, sellPrice: 4.20, forecast: 10 },
        { storeId: "R106", storeName: "Store Munich",        stock:  6, coverageDays: 4, qtyAdd: 0, unit: sUnit, sellPrice: 13.00, forecast: 10 }
      ];
    },

    onStoreSearch: function (oEvent) {
      var s = oEvent.getParameter("newValue") || "";
      var oBind = this.byId("storesTable").getBinding("items");
      oBind.filter(new Filter([
        new Filter("storeName", FilterOperator.Contains, s),
        new Filter("storeId",   FilterOperator.Contains, s)
      ], false));
    },

    // Open forecast URL for a store row. If row has `forecastUrl` use it, otherwise build a default URL.
    onOpenForecast: function (oEvent) {
      var oSource = oEvent.getSource();
      var oCtx = oSource.getBindingContext("detail");
      var oRow = oCtx && oCtx.getObject ? oCtx.getObject() : null;
      var oDetail = this.getView().getModel("detail").getData() || {};

      var sUrl = (oRow && oRow.forecastUrl) || oDetail.forecastUrl || null;
      if (!sUrl && oRow && oDetail && oDetail.id) {
        // build a simple default (example) URL — adjust as needed
        //sUrl = "https://example.com/forecast?material=" + encodeURIComponent(oDetail.id) + "&store=" + encodeURIComponent(oRow.storeId || "");
        sUrl = "https://c00000016194-l000372-44302.da-euw4.demo-education.cloud.sap/sap/bc/ui2/flp?sap-language=EN#ForecastDemand-showUDFAnalyzeForecast";
      }
      if (sUrl) { window.open(sUrl, "_blank"); }
    },

    onQtyAddChange: function () {
      var oDetailModel = this.getView().getModel("detail");
      if (!oDetailModel) { return; }
      var a = oDetailModel.getProperty("/stores") || [];
      var total = a.reduce(function (s, r) { return s + (Number(r.qtyAdd) || 0); }, 0);
      oDetailModel.setProperty("/totalAdd", total);
    },

    // Popup de modo de entrega
    onOpenDeliveryDialog: function (oEvent) {
      var oCtx = oEvent.getSource().getParent().getParent().getBindingContext("detail");
      var oRow = oCtx.getObject();
      var oDetail = this.getView().getModel("detail").getData();

      var oDlgData = {
        materialId: oDetail.id,
        materialName: oDetail.name,
        unit: oDetail.unit || "EA",
        currency: oDetail.currency || "EUR",
        storeId: oRow.storeId,
        storeName: oRow.storeName,
        qty: Number(oRow.qtyAdd) || 0,
        modeIndex: 0
      };

      var that = this;
      if (!this._oDeliveryDlg) {
        Fragment.load({
          name: "agentretail.fragments.DeliveryMode",
          controller: this,
          id: this.getView().getId()
        }).then(function (oDialog) {
          that._oDeliveryDlg = oDialog;
          that.getView().addDependent(that._oDeliveryDlg);
          that._oDeliveryDlg.setModel(new JSONModel(oDlgData), "dlg");
          that._oDeliveryDlg.open();
        });
      } else {
        this._oDeliveryDlg.setModel(new JSONModel(oDlgData), "dlg");
        this._oDeliveryDlg.open();
      }
    },

    onDeliveryConfirm: function () {
      var m = this._oDeliveryDlg.getModel("dlg").getData();
      var sMode = m.modeIndex === 0 ? "STORE" : "DC";
      if (!m.qty || m.qty <= 0) { sap.m.MessageToast.show("Defina uma quantidade maior que zero."); return; }
      this._pushToSelectedWithMode(m.qty, sMode, { storeId: m.storeId, storeName: m.storeName });
      this._oDeliveryDlg.close();
      sap.m.MessageToast.show("Adicionado ao pedido (" + (sMode === "STORE" ? "Direto loja" : "Centralizado") + ").");
    },
    onDeliveryCancel: function () { if (this._oDeliveryDlg) { this._oDeliveryDlg.close(); } },

    _pushToSelectedWithMode: function (iQty, sMode, mExtra) {
      var oDetail = this.getView().getModel("detail").getData() || {};
      var sId = oDetail.id, sName = oDetail.name, sUnit = oDetail.unit || "EA";

      if (sMode === "STORE" && mExtra && mExtra.storeId) {
        sId = sId + "@" + mExtra.storeId;
        sName = sName + " - " + (mExtra.storeName || mExtra.storeId);
      }

      var oSelModel = this.getOwnerComponent().getModel("selectedMaterials");
      var a = oSelModel.getData() || [];
      var oExist = a.find(function (x) { return x.id === sId; });

      if (oExist) {
        oExist.qty = (Number(oExist.qty)||0) + iQty;
        oExist.qtyBase = (Number(oExist.qtyBase)||0) + iQty;
        oExist.deliveryMode = sMode;
        if (sMode === "STORE") { oExist.storeId = mExtra.storeId; oExist.storeName = mExtra.storeName; }
        else { delete oExist.storeId; delete oExist.storeName; }
      } else {
        a.push({
          id: sId, name: sName, unit: sUnit,
          qty: iQty, qtyBase: iQty,
          deliveryMode: sMode,
          storeId: sMode === "STORE" ? (mExtra && mExtra.storeId) : undefined,
          storeName: sMode === "STORE" ? (mExtra && mExtra.storeName) : undefined
        });
      }
      oSelModel.setData(a);
    },

    onAddToOrder: function () {
      var oDetail = this.getView().getModel("detail").getData();
      var iQty = Number(oDetail.totalAdd) || 0;
      if (iQty <= 0) { MessageToast.show("Nenhuma quantidade selecionada."); return; }
      this._pushToSelectedWithMode(iQty, "DC");
      (oDetail.stores || []).forEach(function (r) { r.qtyAdd = 0; });
      oDetail.totalAdd = 0;
      this.getView().getModel("detail").refresh(true);
      MessageToast.show("Material adicionado (Centralizado).");
    },

    onGoToOrder: function () {
      this.getOwnerComponent().getRouter().navTo("RouteView2");
    },
    formatMaterialHeader: function (sId, sName) {
        var id = sId || "";
        var nm = sName || "";
        return id + (nm ? " - " + nm : "");
      },
      formatTotalToAdd: function (aRows, sUnit) {
        if (!Array.isArray(aRows)) { return ""; }
        var sum = aRows.reduce(function (acc, r) { return acc + (Number(r.qtyAdd) || 0); }, 0);
        return "Qtd total a adicionar: " + sum + " " + (sUnit || "");
      },


    onNavBack: function () {
      var sPreviousHash = History.getInstance().getPreviousHash();
      if (sPreviousHash !== undefined) { window.history.go(-1); }
      else { this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true); }
    }
  });
});
