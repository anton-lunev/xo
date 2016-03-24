/**
 * Попап покупки монет
 *
 * @author aosipov
 * @extends XO.popup.PopupWidget
 * @class
 */

XO.popup.PaymentPopup = XO.popup.PopupWidget.extend({

    template: JST['assets/templates/popup/paymentPopup.ejs'],

    showClose: true,

    events: {
        'click .buy': 'buy',
        'click .close': 'onClose'
    },

    run: function() {
        var t = this;
        t.model = PriceModel;
        t.show();
        log('Payment show');
    },

    /**
     * Загрузка цен на монеты
     */
    loadPrice: function() {
        var def = new $.Deferred();
        $.get('/payment/price').done(function(price) {
            def.resolve(price);
        });

        return def.promise();
    },

    buy: function(e) {
        var payments = this.model.get('payments'),
            id = $(e.currentTarget).data('id');

        if (payments && payments[id]) {
            log('Payment try: ',  payments[id].itemInfo);
            SocialAPI.makePayment(payments[id].itemInfo);
            this.close();
        }
    },

    onClose: function() {
        log('Payment close');
        this.close();
    }
});
