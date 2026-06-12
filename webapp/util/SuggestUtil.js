sap.ui.define([], function () {
  "use strict";

  /**
   * Gera sugestões de quantidade por item.
   * Espera em orderData:
   *  - truckCapacity: número
   *  - items: [{ id, coverageDays, aggDemand30, qtyBase }]
   *  - (opcional) targetCoverageDays, maxCoverageDays
   *
   * Retorna:
   *  { items: [{ id, qty }], meta: { targetDays, totalAssigned } }
   */
  function suggest(orderData) {
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const capTotal = +orderData.truckCapacity || 0;

    // capacidade restante considerando o que já está preenchido (qtyBase)
    const usedNow = items.reduce((s, it) => s + (+it.qtyBase || 0), 0);
    const capLeft = Math.max(0, capTotal - usedNow);

    // nada para sugerir
    if (!items.length || capLeft <= 0) {
      return { items: items.map(it => ({ id: it.id, qty: 0 })), meta: { targetDays: null, totalAssigned: 0 } };
    }

    const T_BASE = Number.isFinite(+orderData.targetCoverageDays) ? +orderData.targetCoverageDays : 14;
    const T_MAX  = Number.isFinite(+orderData.maxCoverageDays)    ? +orderData.maxCoverageDays    : 35;

    // vetor com cov (dias) e demanda/dia
    const vec = items.map(it => ({
      id : it.id,
      cov: +it.coverageDays || 0,
      d  : (+it.aggDemand30 || 0) / 30  // demanda/dia
    }));

    // soma da necessidade para atingir cobertura alvo T
    function sumNeed(T) {
      let tot = 0;
      for (let i = 0; i < vec.length; i++) {
        const miss = Math.max(0, T - vec[i].cov);
        // arredonda pra cima para não subestimar
        tot += Math.max(0, Math.ceil(miss * vec[i].d));
      }
      return tot;
    }

    // 1) encontra T* que melhor consome a capacidade (binária simples)
    let Tstar = T_BASE;
    if (sumNeed(T_BASE) < capLeft) {
      let low = T_BASE, high = T_MAX;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const needMid = sumNeed(mid);
        if (needMid === capLeft) { Tstar = mid; break; }
        if (needMid < capLeft)   { Tstar = mid; low = mid + 1; }
        else                     { high = mid - 1; }
      }
    }

    // 2) necessidade por item em T*
    const needs = vec.map(x => {
      const miss = Math.max(0, Tstar - x.cov);
      return { id: x.id, need: Math.max(0, Math.ceil(miss * x.d)), d: x.d, cov: x.cov };
    });

    const totalNeed = needs.reduce((s, n) => s + n.need, 0);
    const allocById = {};

    if (totalNeed === 0) {
      // nenhum item precisa — ainda assim tentamos usar capacidade extra
      needs.forEach(n => allocById[n.id] = 0);
      let extra = capLeft;
      const order = needs
        .slice()
        .sort((a, b) => (a.cov - b.cov) || (b.d - a.d)); // menor cobertura / maior demanda
      let k = 0;
      while (extra > 0 && order.length) {
        const target = order[k % order.length];
        allocById[target.id] = (allocById[target.id] || 0) + 1;
        extra--; k++;
      }
    } else if (totalNeed === capLeft) {
      needs.forEach(n => allocById[n.id] = n.need);
    } else if (totalNeed > capLeft) {
      // 3a) falta capacidade: proporcional + restos
      const ratio = capLeft / totalNeed;
      needs.forEach(n => { allocById[n.id] = Math.floor(n.need * ratio); });
      // distribuir sobras 1 a 1 pelos maiores restos fracionários
      const rema = needs
        .map(n => ({ id: n.id, frac: (n.need * ratio) - Math.floor(n.need * ratio) }))
        .sort((a, b) => b.frac - a.frac);
      let assigned = Object.values(allocById).reduce((s, v) => s + v, 0);
      let left = capLeft - assigned;
      for (let i = 0; i < rema.length && left > 0; i++, left--) {
        allocById[rema[i].id] += 1;
      }
    } else {
      // 3b) sobra capacidade: aloca necessidades e distribui excedente
      needs.forEach(n => { allocById[n.id] = n.need; });
      let extra = capLeft - totalNeed;
      const order = needs
        .slice()
        .sort((a, b) => (a.cov - b.cov) || (b.d - a.d)); // menor cobertura / maior demanda
      let k = 0;
      while (extra > 0 && order.length) {
        const target = order[k % order.length];
        allocById[target.id] += 1;
        extra--; k++;
      }
    }

    // saída
    const out = items.map(it => ({ id: it.id, qty: allocById[it.id] || 0 }));
    const totalAssigned = out.reduce((s, x) => s + x.qty, 0);
    return { items: out, meta: { targetDays: Tstar, totalAssigned } };
  }

  return { suggest };
});
