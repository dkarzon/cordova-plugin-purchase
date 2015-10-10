(function () {
    "use strict";

	//   {
    //     "purchaseToken":"tokenabc",
    //     "developerPayload":"mypayload1",
    //     "packageName":"com.example.MyPackage",
    //     "purchaseState":0, [0=purchased, 1=canceled, 2=refunded]
    //     "orderId":"12345.6789",
    //     "purchaseTime":1382517909216,
    //     "productId":"example_subscription"
    //   }
    store.setProductData = function(product, data) {

        store.log.debug("android -> product data for " + product.id);
        store.log.debug(data);

        product.transaction = {
            type: 'android-playstore', //TODO - does this need to be here?
            id: data.orderId,
            purchaseToken: data.purchaseToken,
            developerPayload: data.developerPayload,
            receipt: data.receipt,
            signature: data.signature
        };

        // When the product is owned, adjust the state if necessary
        if (product.state !== store.OWNED && product.state !== store.FINISHED &&
            product.state !== store.APPROVED) {

            if (data.purchaseState === 0) {
                product.set("state", store.APPROVED);
            }
        }

        // When the product is cancelled or refunded, adjust the state if necessary
        if (product.state === store.OWNED || product.state === store.FINISHED ||
            product.state === store.APPROVED) {

            if (data.purchaseState === 1) {
                product.trigger("cancelled");
                product.set("state", store.VALID);
            }
            else if (data.purchaseState === 2) {
                product.trigger("refunded");
                product.set("state", store.VALID);
            }
        }
    };

    store.iabGetPurchases = function() {
        store.inappbilling.getPurchases(
            function(purchases) { // success
                // example purchases data:
                //
                // [
                //   {
                //     "purchaseToken":"tokenabc",
                //     "developerPayload":"mypayload1",
                //     "packageName":"com.example.MyPackage",
                //     "purchaseState":0,
                //     "orderId":"12345.6789",
                //     "purchaseTime":1382517909216,
                //     "productId":"example_subscription"
                //   },
                //   { ... }
                // ]
                if (purchases && purchases.length) {
                    for (var i = 0; i < purchases.length; ++i) {
                        var purchase = purchases[i];
                        var p = store.get(purchase.productId);
                        if (!p) {
                            store.log.warn("plugin -> user owns a non-registered product");
                            continue;
                        }
                        store.setProductData(p, purchase);
                    }
                }
                store.ready(true);
            },
            function() { // error
                // TODO
            }
        );
    };
    
    store.pluginInit = function (success, fail, options, skus, log) {
        if (!options)
            options = {};
    
        this.options = {
            showLog: options.showLog !== false
        };
    
        if (this.options.showLog) {
            log('setup ok');
        }
    
        var hasSKUs = false;
        //Optional Load SKUs to Inventory.
        if(typeof skus !== "undefined"){
            if (typeof skus === "string") {
                skus = [skus];
            }
            if (skus.length > 0) {
                if (typeof skus[0] !== 'string') {
                    var msg = 'invalid productIds: ' + JSON.stringify(skus);
                    if (this.options.showLog) {
                        log(msg);
                    }
                    fail(msg, store.ERR_INVALID_PRODUCT_ID);
                    return;
                }
                if (this.options.showLog) {
                    log('load ' + JSON.stringify(skus));
                }
                hasSKUs = true;
            }
        }
    
        if (hasSKUs) {
            cordova.exec(success, fail, "InAppBillingPlugin", "init", [skus]);
        }
        else {
            //No SKUs
            cordova.exec(success, fail, "InAppBillingPlugin", "init", []);
        }
    };

})();
