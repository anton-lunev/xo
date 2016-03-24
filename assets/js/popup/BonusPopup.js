/**
 * Попап с ежедневным бонусом
 *
 * @author alunev
 * @extends XO.popup.PopupWidget
 * @class
 */
XO.popup.BonusPopup = XO.popup.PopupWidget.extend({

    template: JST['assets/templates/popup/bonusPopup.ejs'],

    showClose: true,

    events: {
        'click .close': 'closePopup',
        'click .bonus-popup__get': 'closePopup'
    },

    run: function() {
        this.show();
        var t = this;
        $({numberValue: 0}).animate({numberValue: this.bonus}, {
            duration: 1500,
            easing: 'linear',
            step: function() {
                t.$('.bonus-popup__bonus-count').text(Math.ceil(this.numberValue));
            }
        });
    },

    closePopup: function() {
        var t = this;
        SocialAPI.wallpost({
            message: 'Заходите в игру каждый день, как я, и получайте бонусы! http://vk.com/4inrow?ad_id=bonus',
            attachment: 'photo-92403339_362739292,http://vk.com/4inrow'
        }).done(function() {
            t.close();
        })
    }
});
