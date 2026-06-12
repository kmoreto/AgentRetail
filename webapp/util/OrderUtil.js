sap.ui.define([], function() {
  "use strict";
  return {
    createOrder: function(oOrder){
      return new Promise(function(resolve){
        setTimeout(function(){
          resolve("4500" + Math.floor(Math.random()*10000));
        }, 1200);
      });
    }
  };
});
