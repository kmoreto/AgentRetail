sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("agentretail.controller.View1", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        messages: [],
        results: []
      }), "chat");

      this.getView().setModel(new JSONModel({
        items: [
          {
            icon: "sap-icon://alert",
            color: "#bb0000",
            title: "Risk Of Out Of Stock",
            date: "02 Minutes Ago",
            subtitle: "Product: PA0001, Bread",
            description: "Raise additional replenishment quantity for 12 locations."
          },
          {
            icon: "sap-icon://alert",
            color: "#e9730c",
            title: "Extreme High Forecast",
            date: "1 Hour Ago",
            subtitle: "1490 Units · 30%",
            description: "Milk A in NYC Retail Store on Apr 17, 2023."
          },
          {
            icon: "sap-icon://warning",
            color: "#e9730c",
            title: "Minimum Service Level Not Met",
            date: "2 Hours Ago",
            subtitle: "Order Proposals: 3526747, 3526748",
            description: "Order quantity of 27 PAL does not meet the target."
          },
          {
            icon: "sap-icon://information",
            color: "#0070f2",
            title: "Supplier Last Order Before Vacation",
            date: "1 Day Ago",
            subtitle: "Supplier: Natural Grocery Corp.",
            description: "Cheese to DC 1 last ordered before supplier vacation."
          }
        ]
      }), "alerts");

      this.getView().setModel(new JSONModel({
        items: [
          this._kpi("Service Level", ">= 95%", "91%", "-3.8%", "Error", "#e23b3b", 91),
          this._kpi("Turnover", "90%", "94%", "+5%", "Success", "#13a538", 94),
          this._kpi("Stock", "90%", "91%", "+5%", "Success", "#13a538", 91),
          this._kpi("Supplier Reliability", "90%", "91%", "+5%", "Success", "#13a538", 91),
          this._kpi("Forecast MAPE", "5%", "9%", "-3%", "Success", "#13a538", 78)
        ]
      }), "kpis");

      this.getView().setModel(new JSONModel({
        orderProposalHtml: this._buildOrderProposalChart(),
        donutHtml: this._buildDonutChart(),
        forecastHtml: this._buildForecastChart(),
        calendarHtml: this._buildCalendar(),
        promotionsHtml: this._buildPromotions()
      }), "charts");

      this.getView().setModel(new JSONModel({
        events: [
          { date: "04/02", title: "Apple New Product", type: "Event" },
          { date: "04/06", title: "Start: Easter Promotion", type: "Local Promotion" },
          { date: "04/09", title: "Soccer World Cup", type: "Special Event" },
          { date: "04/18", title: "Easter", type: "Holiday" },
          { date: "04/30", title: "Store Construction", type: "Local Construction" }
        ]
      }), "calendar");

      this.getView().setModel(new JSONModel({
        items: [
          this._product("sap-icon://product", "Pop Soda Chain", "SP0120002", "Wed, Mar 15", "2023", "40", "#e23b3b", "40/90"),
          this._product("sap-icon://nutrition-activity", "Spicy Luxury Chain", "SP0102002", "Wed, Mar 15", "2023", "45", "#f5b335", "23/29"),
          this._product("sap-icon://meal", "Vegetarian Meat Chain", "SP0103002", "Fri, Oct 07", "2022", "34", "#13a538", "25/34"),
          this._product("sap-icon://product", "Frozen Clean Chain", "SP0104002", "Thu, Mar 17", "2023", "29", "#13a538", "25/29")
        ]
      }), "products");

      this._jouleKB = [
        {
          pattern: /ruptura|out of stock|estoque|risco|bread|pao|pão/i,
          reply: "Identifiquei 4 alertas relevantes. O maior risco esta em PA0001 Bread, com baixa cobertura em 12 lojas. Recomendo aumentar a quantidade de reposicao e priorizar lojas com historico de venda acima da previsao.",
          results: [
            { title: "Risk Of Out Of Stock", subtitle: "PA0001 Bread · 12 lojas impactadas", action: "showRisk", buttonText: "Ver risco" }
          ]
        },
        {
          pattern: /forecast|previsao|previsão|demanda|milk|leite/i,
          reply: "A previsao extrema para Milk A indica 1490 unidades, 30% acima do baseline. O pico aparece no varejo de NYC em 17 de abril e deve ser tratado antes das proximas ordens automaticas.",
          results: [
            { title: "Extreme High Forecast", subtitle: "Milk A · NYC Retail Store · +30%", action: "showForecast", buttonText: "Abrir forecast" }
          ]
        },
        {
          pattern: /pedido|order|proposal|proposta|service level|nivel de servico|nível de serviço/i,
          reply: "Ha 352 propostas de pedido no monitor. 89 exigem acao e 3 foram concluidas. Duas propostas nao atingem o nivel minimo de servico por quantidade insuficiente.",
          results: [
            { title: "Order Proposals", subtitle: "89 itens exigem acao", action: "showOrders", buttonText: "Revisar pedidos" }
          ]
        },
        {
          pattern: /promo|promocao|promoção|easter|calendar|calendario|calendário/i,
          reply: "O calendario mostra a promocao de Pascoa junto com eventos locais e sazonalidade. Sugiro revisar a campanha B e antecipar compras para produtos com maior sensibilidade promocional.",
          results: [
            { title: "Promotion Plan", subtitle: "Campanhas de abril com impacto de demanda", action: "showPromotions", buttonText: "Ver promocoes" }
          ]
        }
      ];
    },

    onAfterRendering: function () {
      this._wireJouleShellNative();
    },

    _kpi: function (sName, sTarget, sValue, sDelta, sState, sColor, iWidth) {
      return {
        name: sName,
        target: "Target: " + sTarget,
        value: sValue,
        delta: sDelta,
        state: sState,
        barHtml: "<div class='retailKpiBar'><span style='width:" + iWidth + "%;background:" + sColor + "'></span></div>"
      };
    },

    _product: function (sIcon, sName, sSupplier, sDate, sYear, sCount, sColor, sLabel) {
      return {
        icon: sIcon,
        name: sName,
        supplier: sSupplier,
        date: sDate,
        year: sYear,
        count: sCount,
        barHtml: "<div class='retailProductBar'><span style='width:72%;background:" + sColor + "'></span><b>" + sLabel + "</b></div>"
      };
    },

    _buildOrderProposalChart: function () {
      var aDays = ["04/06", "04/07", "04/08", "04/09", "04/10", "04/11", "04/12", "04/13", "04/14"];
      var aRed = [50, 20, 34, 16, 20, 38, 10, 32, 20];
      var aBlue = [8, 30, 28, 50, 45, 19, 39, 48, 30];
      return "<div class='retailBarChart'>" + aDays.map(function (sDay, i) {
        return "<div class='retailBarCol'><div class='retailBars'><span class='red' style='height:" + aRed[i] + "%'></span><span class='blue' style='height:" + aBlue[i] + "%'></span></div><em>" + sDay + "</em></div>";
      }).join("") + "</div><div class='retailLegend'><span class='red'></span>Unreleased <span class='blue'></span>Transfer Failed <span class='gray'></span>Completed</div>";
    },

    _buildDonutChart: function () {
      return "<div class='retailDonutWrap'><div class='retailDonut'><span>30</span></div><div class='retailDonutLabels'><b>5</b><b>7</b><b>16</b><b>2</b></div></div><div class='retailLegend'><span class='red'></span>Cancelled <span class='orange'></span>Overdue Open <span class='blue'></span>Open <span class='gray'></span>Delivery Completed</div>";
    },

    _buildForecastChart: function () {
      var a = [12, 18, 34, 50, 36, 25, 14, 28, 22, 31, 21, 17, 49, 65, 43, 20, 18, 22, 30, 24, 33];
      return "<div class='retailForecast'>" + a.map(function (v, i) {
        return "<span class='retailForecastBar' style='height:" + (18 + (i % 4) * 9) + "%'></span><i style='height:" + v + "%'></i>";
      }).join("") + "</div><div class='retailLegend'><span class='blue'></span>System Forecast <span class='dark'></span>Unit Sales <span class='gray'></span>Sales History</div>";
    },

    _buildCalendar: function () {
      var days = Array.from({ length: 30 }, function (_, i) { return i + 1; });
      return "<div class='retailCalendar'><strong>April 2023</strong><div>" + days.map(function (d) {
        var cls = d === 17 ? "today" : ([5, 8, 12, 18, 23].indexOf(d) >= 0 ? "marked" : "");
        return "<span class='" + cls + "'>" + d + "</span>";
      }).join("") + "</div></div>";
    },

    _buildPromotions: function () {
      var rows = ["Campaign A", "Campaign B", "Campaign C", "Campaign D", "Campaign E", "Campaign F", "Campaign G"];
      return "<div class='retailPromoPlan'>" + rows.map(function (row, i) {
        var left = 8 + (i * 9) % 48;
        var width = 16 + (i * 7) % 28;
        var cls = i % 3 === 0 ? "pink" : (i % 3 === 1 ? "blue" : "green");
        return "<div><b>" + row + "</b><span class='" + cls + "' style='left:" + left + "%;width:" + width + "%'></span></div>";
      }).join("") + "<em></em></div>";
    },

    openJoule: function () {
      var that = this;
      if (!this._pJoule) {
        this._pJoule = sap.ui.core.Fragment.load({
          id: this.getView().getId(),
          name: "agentretail.fragments.JouleDialog",
          controller: this
        }).then(function (oDialog) {
          that.getView().addDependent(oDialog);
          oDialog.addStyleClass("jouleDialog");
          oDialog.setContentWidth("500px");
          oDialog.setContentHeight("690px");
          oDialog.attachAfterClose(function () {
            that._clearJouleShellFocus();
          });
          return oDialog;
        });
      }
      this._pJoule.then(function (oDialog) {
        oDialog.open();
        setTimeout(function () {
          that._wireJouleDomFallback();
        }, 0);
      });
    },

    onJouleClose: function () {
      var oDialog = this.byId("jouleDialog");
      if (oDialog) {
        oDialog.close();
      }
      this._clearJouleShellFocus();
    },

    _clearJouleShellFocus: function () {
      setTimeout(function () {
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
      }, 0);
    },

    onJouleLiveChange: function () {
      var oBtn = this._getJouleControl("btnSend");
      if (oBtn) {
        oBtn.setEnabled(true);
      }
    },

    _getJouleControl: function (sId) {
      return this.byId(sId) || sap.ui.getCore().byId(this.getView().createId(sId));
    },

    _wireJouleDomFallback: function () {
      if (this._bJouleDomFallbackReady) {
        return;
      }
      var oBtn = this._getJouleControl("btnSend");
      var oInput = this._getJouleControl("inpUserMsg");
      if (!oBtn || !oInput) {
        return;
      }

      oBtn.attachPress(this.onJouleSend.bind(this));
      oInput.attachSubmit(this.onJouleSend.bind(this));
      this._bJouleDomFallbackReady = true;
    },

    onJouleSend: function (oEvent) {
      var oInput = this._getJouleControl("inpUserMsg");
      var sText = (oInput && oInput.getValue ? oInput.getValue() : "").trim();
      if (!sText) {
        return;
      }
      if (oEvent && oEvent.preventDefault) {
        oEvent.preventDefault();
      }

      var oChat = this.getView().getModel("chat");
      var aMsgs = (oChat.getProperty("/messages") || []).slice();
      var oIntent = (this._jouleKB || []).find(function (oItem) {
        return oItem.pattern.test(sText);
      });

      aMsgs.push({ role: "user", text: sText });
      oChat.setProperty("/messages", aMsgs);
      oChat.setProperty("/results", []);
      oInput.setValue("");

      setTimeout(function () {
        aMsgs.push({
          role: "assistant",
          text: oIntent ? oIntent.reply : "Posso responder sobre ruptura, previsao de demanda, propostas de pedido, calendario promocional e produtos novos. Experimente perguntar: quais itens tem risco de ruptura?"
        });
        oChat.setProperty("/messages", aMsgs);
        oChat.setProperty("/results", oIntent ? oIntent.results : []);
        oChat.refresh(true);
      }, 250);
    },

    onJouleOpenResult: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext("chat");
      var oRes = oCtx && oCtx.getObject();
      var oDialog = this.byId("jouleDialog");
      if (oDialog) {
        oDialog.close();
      }
      MessageToast.show(oRes && oRes.title ? oRes.title + " destacado no cockpit." : "Acao executada.");
    },

    _wireJouleShellNative: function () {
      var oHtml = this.byId("jouleShellNative");
      var oDom = oHtml && oHtml.getDomRef && oHtml.getDomRef();
      var oButton = oDom && oDom.classList && oDom.classList.contains("sapShellJouleNative")
        ? oDom
        : (oDom && oDom.querySelector && oDom.querySelector(".sapShellJouleNative"));
      if (!oButton || oButton.dataset.jouleReady === "true") {
        return;
      }

      oButton.dataset.jouleReady = "true";
      oButton.addEventListener("click", function (oEvent) {
        oEvent.preventDefault();
        oEvent.currentTarget.blur();
        this.openJoule();
      }.bind(this));
    },

    onApplyFilters: function () {
      MessageToast.show("Filtros aplicados ao cockpit.");
    },

    onClearFilters: function () {
      MessageToast.show("Filtros limpos.");
    },

    onAlertDetails: function () {
      MessageToast.show("Detalhe do alerta aberto.");
    },

    onIgnoreAlert: function () {
      MessageToast.show("Alerta ignorado.");
    }
  });
});
