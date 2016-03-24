/**
 * Переключалка табов
 *
 * @author aosipov
 * @extends Backbone.View
 */
XO.lobby.Tabs = Backbone.View.extend({

    el: '.tabs',

    template: JST['assets/templates/lobby/tabs.ejs'],

    events: {
        'click [data-tab]': 'onTabClick'
    },

    initialize: function() {
        new XO.chat.Chat();
        new XO.lobby.TopFriends();
        new XO.lobby.TopAll();
        new XO.lobby.Tables();
        this.render();
        this.getBonus();
    },

    render: function() {
        this.$el.html(this.template());
        return this;
    },

    getBonus: function () {
        var lastBonus = User.get('last_bonus');
        if (!User.get('just_created') &&
            (!lastBonus || moment(lastBonus).format('D') !== moment(User.get('last_visit')).format('D'))
        ) {
            $.get('/bonus/getBonus', function(res) {
                if (res.error) {
                    log(res.error.error_msg)
                } else {
                    new XO.popup.BonusPopup({
                        bonus: res
                    });
                }
            });
        }
    },

    onTabClick: function(e) {
        var $current = this.$el.find('.active'),
            $target = $(e.currentTarget);
        $current.removeClass('active');
        $($.find('.' + $current.data('tab'))).hide();
        $target.addClass('active');
        $($.find('.' + $target.data('tab'))).show();
    }
});
