/**
 * Попап о завершении игры
 */

XO.popup.GameOverPopup = XO.popup.PopupWidget.extend({

    template: JST['assets/templates/popup/gameOverPopup.ejs'],

    events: {
        "click .game-over" : "closePopup"
    },

    run: function() {
        this.show();
    },

    closePopup: function() {
        this.close();
    }
});