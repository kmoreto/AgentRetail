sap.ui.define([], function () {
  "use strict";
  function allocate(orderData){
    var items = (orderData.items || []).map(function(it, idx){
      return Object.assign({ index: idx, volume: it.volume || it.Volume || 1, qty: Number(it.qty||0) }, it);
    });
    var cap = Number(orderData.truckCapacity || 0);
    if (!cap || cap <= 0) {
      var usedV = items.reduce(function(s, it){ return s + (it.qty * (it.volume||1)); }, 0);
      return { items: items, usedVolume: usedV, capacity: cap, utilization: cap? (usedV/cap)*100 : 0 };
    }
    items.forEach(function(it){
      if (!it.qty || it.qty <= 0) {
        it.qty = Math.max(1, Math.round(Math.random()*8)+1);
      }
    });
    var desiredVolume = items.reduce(function(s, it){ return s + it.qty * (it.volume||1); }, 0);
    if (desiredVolume <= cap) {
      return { items: items, usedVolume: desiredVolume, capacity: cap, utilization: (desiredVolume/cap)*100 };
    }
    var scale = cap / desiredVolume;
    var frac = [];
    var used = 0;
    items.forEach(function(it, i){
      var qScaled = it.qty * scale;
      var q = Math.floor(qScaled);
      if (it.qty > 0 && q === 0) q = 1;
      it.qty = q;
      used += q * (it.volume||1);
      frac.push({ i: i, f: qScaled - q, vol: (it.volume||1) });
    });
    var guard = 10000;
    while (used > cap && guard-- > 0) {
      var idx = -1, bestScore = -1;
      for (var k=0;k<items.length;k++){
        if (items[k].qty > 0) {
          var score = (items[k].volume||1);
          if (score > bestScore) { bestScore = score; idx = k; }
        }
      }
      if (idx === -1) break;
      items[idx].qty -= 1;
      used -= (items[idx].volume||1);
    }
    guard = 10000;
    frac.sort(function(a,b){ return b.f - a.f; });
    var p = 0;
    while (used < cap && guard-- > 0 && p < frac.length){
      var it = items[frac[p].i];
      var addVol = (it.volume||1);
      if (used + addVol <= cap) {
        it.qty += 1;
        used += addVol;
      } else {
        p++;
      }
    }
    return { items: items, usedVolume: used, capacity: cap, utilization: (used/cap)*100 };
  }
  return { allocate };
});
