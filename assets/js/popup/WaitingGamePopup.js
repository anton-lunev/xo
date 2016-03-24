/**
 * Попап ожидания других игроков
 *
 * @author alunev
 * @extends XO.popup.PopupWidget
 * @class
 */
XO.popup.WaitingGamePopup = XO.popup.PopupWidget.extend({

    template: JST['assets/templates/popup/waitingGamePopup.ejs'],

    showClose: true,

    message: 'Ожидаем подключения игрока',

    events: {
        'click .close': 'cancel'
    },

    run: function() {
        this.model.set({
            message: this.message
        });
        this.show();
    },

    cancel: function () {
        this.trigger('cancel');
        this.close();
    }
});
