sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/ui/util/Storage",
  "sap/m/TablePersoController",
  "sap/ui/core/routing/History",
  "sap/ui/core/Fragment",
  "sap/ui/thirdparty/jquery",  "agentretail/util/SuggestUtil" ,"agentretail/util/SupplierAlertsUtil"
], function (
  Controller, JSONModel, MessageToast, Filter, FilterOperator, Sorter,
  Storage, TablePersoController, History, Fragment, jQuery,SuggestUtil,SupplierAlertsUtil
) {
  "use strict";

  var BASE_URL = "https://example.com/pedidos/criar";
 var PO_LINK_BASE = "http://localhost:8082/test/flp.html?sap-ui-xx-viewCache=false#app-preview&/detail/4500515037";


  function toISODateString(d) {
    if (!d) { return ""; }
    var dt = (d instanceof Date) ? d : new Date(d);
    return isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
  }
  function pad(n) { return String(n).padStart(2, "0"); }

  return Controller.extend("agentretail.controller.View2", {

    onInit: function () {
      this.getOwnerComponent().getRouter()
        .getRoute("RouteView2")
        .attachPatternMatched(this._onObjectMatched, this);
     
      // Personalização (TablePersoController) com jQuery Deferred
      var oStore = new Storage(Storage.Type.local, "agentretail");
      var PERS_KEY = "view2.table.perso";
      this._persoService = {
        getPersData: function () {
          var d = new jQuery.Deferred();
          try {
            var s = oStore.get(PERS_KEY);
            d.resolve(s ? JSON.parse(s) : {});
          } catch (e) { d.resolve({}); }
          return d.promise();
        },
        setPersData: function (oData) {
          var d = new jQuery.Deferred();
          try { oStore.put(PERS_KEY, JSON.stringify(oData || {})); } catch (e) {}
          d.resolve(); return d.promise();
        },
        delPersData: function () {
          var d = new jQuery.Deferred();
          try { oStore.remove(PERS_KEY); } catch (e) {}
          d.resolve(); return d.promise();
        }
      };

      this._oTPC = new TablePersoController({
        table: this.byId("orderItemsTable"),
        persoService: this._persoService
      });
      this._oTPC.activate();
       this.getView().setModel(new JSONModel({ count: 0, items: [] }), "alerts");
    },
    _recalcAlerts: function () {
  var oOrder = this.getOwnerComponent().getModel("order");
  var data = oOrder.getData() || {};
  var res = SupplierAlertsUtil.recalc(data);
  this.getView().getModel("alerts").setData(res);
},onOpenSupplierAlerts: function (oEvent) {
  var that = this;
  if (!this._alertsPopover) {
    sap.ui.core.Fragment.load({
      name: "agentretail.fragments.SupplierAlertsPopover",
      controller: this,
      id: this.getView().getId()
    }).then(function (oPopover) {
      that._alertsPopover = oPopover;
      that.getView().addDependent(oPopover);
      oPopover.setModel(that.getView().getModel("alerts"), "alerts");
      that._recalcAlerts(); // garante dados antes de abrir
      oPopover.openBy(oEvent.getSource());
    });
  } else {
    this._recalcAlerts();
    this._alertsPopover.openBy(oEvent.getSource());
  }
},


    /* regra de sugestão */
     onSuggestQuantities: function () {
  var that = this;

  this._openSuggestProgress().then(function () {
    var m = that._getSuggestModel();
    m.setProperty("/busy", true);
    that._startDots();

    try {
      var oOrder  = that.getOwnerComponent().getModel("order");
      var aItems  = oOrder.getProperty("/items") || [];
      var cap     = Number(oOrder.getProperty("/truckCapacity")) || 0;

      // parâmetros opcionais (se quiser expor no modelo)
      var T_BASE  = Number(oOrder.getProperty("/targetCoverageDays")) || 14;
      var T_MAX   = Number(oOrder.getProperty("/maxCoverageDays"))    || 35;

      // ➜ chama o util (toda a lógica está lá)
      var res = SuggestUtil.suggest({
        items: aItems,
        truckCapacity: cap,
        targetCoverageDays: T_BASE,
        maxCoverageDays: T_MAX
      });

      // aplica somente qty/qtyBase
      var byId = {};
      (res.items || []).forEach(function (x) { byId[x.id] = x.qty; });

      aItems.forEach(function (it) {
        var q = byId[it.id] || 0;
        it.qty = q;
        it.qtyBase = q;
      });

      oOrder.refresh(true);
      that._recalcTotals();
      that._recalcAlerts();

      that._stopDots();
      m.setProperty("/busy", false);
      m.setProperty("/message", "Sugestões aplicadas");
      setTimeout(function(){ if (that._dlgSuggest){ that._dlgSuggest.close(); } }, 1200);

    } catch (e) {
      console.error(e);
      that._stopDots();
      m.setProperty("/busy", false);
      m.setProperty("/message", "Erro ao gerar sugestões");
      setTimeout(function(){ if (that._dlgSuggest){ that._dlgSuggest.close(); } }, 1500);
    }
  });
},

      formatCoverageText: function (days) {
        var d = Number(days) || 0;
        return d + " d";
      },formatCoverageState: function (days) {
        var d = Number(days) || 0;
        if (d < 3)  { return "Error"; }
        if (d < 7)  { return "Warning"; }
        return "Success";
      },
      
    formatPoHref: function (sPoNumber) {
        if (!sPoNumber) { return ""; }
        // monte a URL do detalhe do pedido
        //return PO_LINK_BASE + encodeURIComponent(sPoNumber);
        return PO_LINK_BASE ;
      },

    /* ====== FORMATTERS (Capacidade & Markup) ====== */
    formatRemainingCapacity: function (capacity, used) {
      var c = Number(capacity) || 0;
      var u = Number(used) || 0;
      var r = c - u;
      return r >= 0 ? (r + " PEÇ") : ("Exceeded " + Math.abs(r) + " PEÇ");
    },
    formatRemainingState: function (capacity, used) {
      var c = Number(capacity) || 0;
      var u = Number(used) || 0;
      var r = c - u;
      if (r < 0)  { return "Error"; }
      if (r === 0){ return "Warning"; }
      return "Success";
    },
    formatCapacityPercent: function (capacity, used) {
      var c = Number(capacity) || 0;
      var u = Number(used) || 0;
      if (c <= 0) { return 0; }
      var p = Math.round(100 * Math.min(u, c) / c);
      return isFinite(p) ? p : 0;
    },
    formatCapacityLabel: function (capacity, used) {
      var c = Number(capacity) || 0;
      var u = Number(used) || 0;
      if (c <= 0) { return "0%"; }
      var p = Math.round(100 * Math.min(u, c) / c);
      return p + "%";
    },

    formatMarkupPct: function (cost, avgSell) {
      var c = Number(cost) || 0;
      var s = Number(avgSell) || 0;
      if (c <= 0 || s <= 0) { return "—"; }
      var m = ((s - c) / c) * 100;
      return Math.round(m) + " %";
    },
    formatMarkupState: function (cost, avgSell) {
      var c = Number(cost) || 0;
      var s = Number(avgSell) || 0;
      if (c <= 0 || s <= 0) { return "None"; }
      var m = ((s - c) / c) * 100;
      if (m < 10)  { return "Error"; }
      if (m <= 30) { return "Warning"; }
      if (m > 50)  { return "Success"; }
      return "Information";
    },
    formatPctText: function (v) {
      var n = Number(v);
      if (!isFinite(n)) { return "—"; }
      return Math.round(n) + " %";
    },
    formatPctStateValue: function (v) {
      var n = Number(v);
      if (!isFinite(n)) { return "None"; }
      if (n < 10)  { return "Error"; }
      if (n <= 30) { return "Warning"; }
      if (n > 50)  { return "Success"; }
      return "Information";
    },
    formatStockState: function (pct) {
      var p = Number(pct) || 0;
      if (p < 30) { return "Error"; }
      if (p < 60) { return "Warning"; }
      return "Success";
    },

    /* ====== ROTA / CARREGAMENTO ====== */
    _onObjectMatched: function () {
      // 1) Ler itens selecionados (podem vir vazios após reload)
      var oSelModel = this.getOwnerComponent().getModel("selectedMaterials");
      var aSel = (oSelModel && Array.isArray(oSelModel.getData())) ? oSelModel.getData() : [];

      // 2) Se não há itens, avisa e volta (não precisa mexer na View1)
      if (!aSel.length) {
        MessageToast.show("Nenhum material selecionado. Volte e selecione linhas ou use o botão '+'.");
        this.onNavBack();
        return;
      }

      // 3) Normalize/enriqueça itens
      aSel.forEach(function (it) {
        if (it.price == null)        { it.price = 11; }
        if (it.avgSellPrice == null) { it.avgSellPrice = it.price * 1.3; }
        if (it.stockPct == null)     { it.stockPct = Math.floor(30 + Math.random() * 60); } // 30–90%
        if (it.qtyBase == null)      { it.qtyBase = Number(it.qty) || 0; }
        // ➕ Novos campos (mock / defaults)
        if (it.stockTotal == null)   { it.stockTotal = Math.floor(20 + Math.random()*80); }     // PEÇ
       
        if (it.aggDemand30 == null)  { it.aggDemand30 = Math.floor(30 + Math.random()*150); }   // PEÇ/30d
        var demPerDay = (Number(it.aggDemand30) || 0) / 30;
         if (it.coverageDays == null) { it.coverageDays = Math.round((Number(it.stockTotal) || 0) / demPerDay); }    // dias

        delete it.poNumber;
      });

      // 4) Preservar capacidade e moeda já existentes
      var oOrder = this.getOwnerComponent().getModel("order");
      var cap  = oOrder.getProperty("/truckCapacity") || 10000;
      var curr = oOrder.getProperty("/currency") || "EUR";

      // 5) Popular pedido
      oOrder.setData({
        items: aSel,
        expectedDelivery: "",
        currency: curr,
        showPoColumn: false,
        truckCapacity: cap,
        totals: { totalWeight: 0, totalVolume: 0, totalValue: 0, avgMarkup: null }
      });

      // 6) TotaIs
      this._recalcTotals();
      this._recalcAlerts();
    },

    /* ====== Toolbar ====== */
    onOpenPerso: function () { this._oTPC.openDialog(); },

    onOpenSortDialog: function () {
      var that = this;
      if (!this._oVSD) {
        Fragment.load({
          name: "agentretail.fragments.SortFilter",
          controller: this,
          id: this.getView().getId()
        }).then(function (oDlg) {
          that._oVSD = oDlg;
          that.getView().addDependent(oDlg);
          that._oVSD.open();
        });
      } else {
        this._oVSD.open();
      }
    },

    onSortFilterConfirm: function (oEvent) {
      var mParams = oEvent.getParameters();
      var oBinding = this.byId("orderItemsTable").getBinding("items");

      // Sorters
      var aSorters = [];
      if (mParams.sortItem) {
        aSorters.push(new Sorter(mParams.sortItem.getKey(), mParams.sortDescending));
      }

      // Filters (faixas de markup)
      var aFilters = [];
      if (mParams.filterItems && mParams.filterItems.length) {
        var aKeys = mParams.filterItems.map(function (i) { return i.getKey(); });
        var fn = function (oCtx) {
          var it = oCtx.getObject();
          var c = Number(it.price) || 0, s = Number(it.avgSellPrice) || 0;
          if (c <= 0 || s <= 0) { return false; }
          var m = ((s - c) / c) * 100, pass = false;
          aKeys.forEach(function (k) {
            if (k === "lt10"      && m < 10)             pass = true;
            if (k === "btw10_30" && m >= 10 && m <= 30)  pass = true;
            if (k === "btw30_50" && m > 30  && m <= 50)  pass = true;
            if (k === "gt50"     && m > 50)              pass = true;
          });
          return pass;
        };
        aFilters.push(new Filter({ path: "price", test: fn }));
      }

      oBinding.sort(aSorters);
      oBinding.filter(aFilters);
    },
    onSortFilterCancel: function () {},

    onOrderSearch: function (oEvent) {
      var s = oEvent.getParameter("newValue") || "";
      var oBind = this.byId("orderItemsTable").getBinding("items");
      oBind.filter(new Filter([
        new Filter("id",   FilterOperator.Contains, s),
        new Filter("name", FilterOperator.Contains, s)
      ], false));
    },

    /* ====== Edição de Itens ====== */
    onQtyChange: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext("order");
      if (!oCtx) { return; }
      var oObj = oCtx.getObject();
      var iVal = Number(oEvent.getParameter("value"));
      oObj.qty = isNaN(iVal) ? 0 : iVal;
      oObj.qtyBase = oObj.qty;
      oCtx.getModel().refresh(true);
      this._recalcTotals();
    },

    onPriceChange: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext("order");
      if (!oCtx) { return; }
      var oObj = oCtx.getObject();
      var f = Number(oEvent.getParameter("value"));
      oObj.price = isNaN(f) ? 0 : f;
      oCtx.getModel().refresh(true);
      this._recalcTotals();
    },

    onAvgSellChange: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext("order");
      if (!oCtx) { return; }
      var oObj = oCtx.getObject();
      var f = Number(oEvent.getParameter("value"));
      oObj.avgSellPrice = isNaN(f) ? 0 : f;
      oCtx.getModel().refresh(true);
      this._recalcTotals();
    },

    _recalcTotals: function () {
      var oOrder = this.getOwnerComponent().getModel("order");
      var a = oOrder.getProperty("/items") || [];

      var totals = {
        totalWeight: a.reduce(function (s, x) { return s + (Number(x.qtyBase) || 0); }, 0),
        totalVolume: 0,
        totalValue:  a.reduce(function (s, x) {
          return s + (Number(x.qtyBase) || 0) * (Number(x.price) || 0);
        }, 0),
        avgMarkup: null
      };

      var aMarkups = a
        .map(function (it) {
          var c = Number(it.price) || 0;
          var s = Number(it.avgSellPrice) || 0;
          if (c > 0 && s > 0) { return ((s - c) / c) * 100; }
          return null;
        })
        .filter(function (v) { return typeof v === "number" && isFinite(v); });

      if (aMarkups.length) {
        totals.avgMarkup = aMarkups.reduce(function (sum, v) { return sum + v; }, 0) / aMarkups.length;
      }

      oOrder.setProperty("/totals", totals);
    },

    /* ====== Navegação / Detalhe ====== */
    onItemPress: function (oEvent) {
      var oObj = oEvent.getParameter("listItem").getBindingContext("order").getObject();
      this._goToMaterialDetail(oObj);
    },
    onMaterialTitlePress: function (oEvent) {
      var oObj = oEvent.getSource().getBindingContext("order").getObject();
      this._goToMaterialDetail(oObj);
    },
    _goToMaterialDetail: function (oOrderItem) {
      var sMatId = (oOrderItem.id || "").split("@")[0];
      var oFull = null;
      var oMats = this.getOwnerComponent().getModel("materials");
      if (oMats) {
        var a = oMats.getProperty("/items") || [];
        oFull = a.find(function (x) { return x.id === sMatId; }) || null;
      }
      var oDetail = oFull || {
        id: sMatId, name: oOrderItem.name, unit: oOrderItem.unit, vendor: "RETAIL LIEFERANT"
      };
      this.getOwnerComponent().setModel(new JSONModel(oDetail), "detail");
      this.getOwnerComponent().getRouter().navTo("RouteView3", { materialId: encodeURIComponent(sMatId) });
    },

    /* ====== Geração de Pedido ====== */
    onOpenDeliveryDialog: function () {
      var oOrder = this.getOwnerComponent().getModel("order");
      var aItems = oOrder.getProperty("/items") || [];
      if (!aItems.length) { MessageToast.show("Nenhum item no pedido."); return; }

      var oDlgData = {
        expectedDelivery: oOrder.getProperty("/expectedDelivery") || toISODateString(new Date()),
        itemsCount: aItems.length,
        totalWeight: oOrder.getProperty("/totals/totalWeight") || 0
      };

      var that = this;
      if (!this._oDeliveryDialog) {
        Fragment.load({
          name: "agentretail.fragments.DeliveryDateDialog",
          controller: this,
          id: this.getView().getId()
        }).then(function (oDialog) {
          that._oDeliveryDialog = oDialog;
          that.getView().addDependent(that._oDeliveryDialog);
          that._oDeliveryDialog.setModel(new JSONModel(oDlgData), "dlg");
          that._oDeliveryDialog.open();
        });
      } else {
        this._oDeliveryDialog.setModel(new JSONModel(oDlgData), "dlg");
        this._oDeliveryDialog.open();
      }
    },

    onDeliveryCreate: function () {
  var m = this._oDeliveryDialog.getModel("dlg").getData();
  var sDate = toISODateString(m.expectedDelivery);
  if (!sDate) { sap.m.MessageToast.show("Informe uma data de entrega válida."); return; }

  var oOrder = this.getOwnerComponent().getModel("order");
  oOrder.setProperty("/expectedDelivery", sDate);

  // 1) Gerar números de pedido (sem mostrar ainda)
  var aItems = oOrder.getProperty("/items") || [];
  var sStamp = (function () {
    var d = new Date();
    return d.getFullYear().toString().slice(-2)
         + pad(d.getMonth() + 1) + pad(d.getDate())
         + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }());
  var poDC = "4500515037";
  var mapStorePO = {};

  aItems.forEach(function (it) {
    var sId = String(it.id || "");
    var idx = sId.indexOf("@");
    if (idx === -1) {
      it.poNumber = poDC;                    // DC
    } else {
      var storeId = sId.substring(idx + 1);  // Loja
      if (!mapStorePO[storeId]) {
        //mapStorePO[storeId] = "PO-" + storeId + "-" + sStamp;
        mapStorePO[storeId] = "65000123";
      }
      it.poNumber = mapStorePO[storeId];
    }
  });

  // 👉 garanta que a coluna fique oculta enquanto o progresso roda
  oOrder.setProperty("/showPoColumn", false);

  this._oDeliveryDialog.close();

  // 2) Abre progresso e roda as 3 etapas
  var that = this;
  this._openGenerateOrderProgress().then(function () {
    return that._runGenerateOrderSequence(); // resolve DEPOIS de fechar o diálogo
  }).then(function () {
    // 3) Agora sim: mostra a coluna com os números
    oOrder.setProperty("/showPoColumn", true);
    oOrder.refresh(true);
  });
}
,

//gerando pedido progress//
/* ====== PROGRESSO - GERAR PEDIDO ====== */
_getGenModel: function () {
  if (!this._genModel) {
    this._genModel = new sap.ui.model.json.JSONModel({ message: "Gerando pedido..." });
  }
  return this._genModel;
},

_openGenerateOrderProgress: function () {
  var that = this;
  if (!this._dlgGenProg) {
    return sap.ui.core.Fragment.load({
      name: "agentretail.fragments.GenerateOrderProgress",
      controller: this,
      id: this.getView().getId()
    }).then(function (dlg) {
      that._dlgGenProg = dlg;
      that.getView().addDependent(dlg);
      dlg.setModel(that._getGenModel(), "gen");
      dlg.open();
      return dlg;
    });
  }
  this._dlgGenProg.open();
  return Promise.resolve(this._dlgGenProg);
},

onCloseGenerateOrderProgress: function () {
  if (this._dlgGenProg) { this._dlgGenProg.close(); }
},

_startDotsOnModel: function (oModel, base) {
  if (this._dotsTimerGen) { clearInterval(this._dotsTimerGen); }
  var i = 0;
  this._dotsTimerGen = setInterval(function () {
    i = (i + 1) % 4;
    oModel.setProperty("/message", base + ".".repeat(i));
  }, 500);
},

_stopDotsOnModel: function () {
  if (this._dotsTimerGen) { clearInterval(this._dotsTimerGen); this._dotsTimerGen = null; }
},

_runGenerateOrderSequence: function () {
  var that = this;
  var m = this._getGenModel();

  // Etapa 1
  this._startDotsOnModel(m, "Gerando pedido ao fornecedor");
  return new Promise(function (resolve) {
    setTimeout(function () {
      // Etapa 2
      that._startDotsOnModel(m, "Gerando pedidos de transferência");
      setTimeout(function () {
        // Etapa 3
        that._startDotsOnModel(m, "Gerando pedido de entrega");
        setTimeout(function () {
          that._stopDotsOnModel();
          m.setProperty("/message", "Pedidos gerados com sucesso");
          setTimeout(function () {
            if (that._dlgGenProg) { that._dlgGenProg.close(); }
            resolve();
          }, 900);
        }, 1200); // duração etapa 3
      }, 1200);   // duração etapa 2
    }, 1200);     // duração etapa 1
  });
},



    onDeliveryCancel: function () {
      if (this._oDeliveryDialog) { this._oDeliveryDialog.close(); }
    },

    onNavBack: function () {
      var sPreviousHash = History.getInstance().getPreviousHash();
      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      } else {
        this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
      }
    }
  
    ,
    _getSuggestModel: function(){
      if (!this._sugModel){
        this._sugModel = new JSONModel({ busy:false, message:"Gerando sugestões" });
      }
      return this._sugModel;
    },
    _openSuggestProgress: function(){
      var that = this;
      if (!this._dlgSuggest){
        return Fragment.load({ name: "agentretail.fragments.SuggestProgress", controller: this }).then(function(dlg){
          that._dlgSuggest = dlg;
          that.getView().addDependent(dlg);
          dlg.setModel(that._getSuggestModel(), "suggest");
          dlg.open();
          return dlg;
        });
      }
      this._dlgSuggest.open();
      return Promise.resolve(this._dlgSuggest);
    },
    onCloseSuggestProgress: function(){ if (this._dlgSuggest){ this._dlgSuggest.close(); } },
    _openGenerateOrderDialog: function(){
      var that = this;
      if (!this._dlgGenType){
        return Fragment.load({ name: "agentretail.fragments.GenerateOrderDialog", controller: this }).then(function(dlg){
          that._dlgGenType = dlg;
          that.getView().addDependent(dlg);
          dlg.open();
          return dlg;
        });
      }
      this._dlgGenType.open();
      return Promise.resolve(this._dlgGenType);
    },
    onCancelGenerateType: function(){ if (this._dlgGenType){ this._dlgGenType.close(); } },
    onConfirmGenerateType: function(){
      var idx = this._dlgGenType.byId("rbgType").getSelectedIndex();
      this._dlgGenType.close();
      // idx 0 = Transferência, idx 1 = Fornecedor
      if (idx === 0){
        // Simula geração de pedido de transferência
        sap.m.MessageBox.success("Pedido de Transferência gerado: TR" + Math.floor(Math.random()*100000));
      } else {
        // Chama o fluxo original do seu onCreateOrder (se existir)
        if (this._doCreateOrderOriginal) {
          this._doCreateOrderOriginal();
        } else if (this.onCreateOrderOriginal) {
          this.onCreateOrderOriginal();
        } else {
          // Fallback: mensagem
          sap.m.MessageToast.show("Gerar Pedido Fornecedor acionado");
        }
      }
    }  ,
    _startDots: function(){
      var that = this;
      if (this._dotsTimer){ clearInterval(this._dotsTimer); }
      var i = 0, base = "Gerando sugestões";
      var m = this._getSuggestModel();
      this._dotsTimer = setInterval(function(){
        i = (i + 1) % 4; // 0..3
        m.setProperty("/message", base + ".".repeat(i));
      }, 500);
    },
    formatAgreementMarginPct: function (cost, avgSell, agreement) {
        var c = Number(cost) || 0;
        var s = Number(avgSell) || 0;
        var a = Number(agreement) || 0;
        if (c <= 0 || s <= 0) { return "—"; }
        var m1 = ((s - c) / c) * 100;           // margem normal
        var m2 = ((s - c + a) / c) * 100;       // margem com acordo
        return Math.round(Math.max(m1, m2)) + " %";
      },

    formatAgreementMarginState: function (cost, avgSell, agreement) {
        var c = Number(cost) || 0;
        var s = Number(avgSell) || 0;
        var a = Number(agreement) || 0;
        if (c <= 0 || s <= 0) { return "None"; }
        var m = ((s - c + a) / c) * 100;
        if (m < 10)  { return "Error"; }
        if (m <= 30) { return "Warning"; }
        if (m > 50)  { return "Success"; }
        return "Information";
      },
      _covFromStockDemand: function (stockTotal, aggDemand30) {
        var d = Number(aggDemand30) / 30;
        if (!isFinite(d) || d <= 0) return null;
        var s = Number(stockTotal) || 0;
        return s / d;
      },
      formatCoverageTextFromStockDemand: function (stockTotal, aggDemand30) {
        var c = this._covFromStockDemand(stockTotal, aggDemand30);
        if (c == null) return "—";
        return Math.round(c) + " d";
      },
      formatCoverageStateFromStockDemand: function (stockTotal, aggDemand30) {
        var c = this._covFromStockDemand(stockTotal, aggDemand30);
        var d = c == null ? 0 : c;
        if (d < 3)  return "Error";
        if (d < 7)  return "Warning";
        return "Success";
},

    _stopDots: function(){
      if (this._dotsTimer){ clearInterval(this._dotsTimer); this._dotsTimer = null; }
    }
  });
});
