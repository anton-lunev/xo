/**
 * Попап создания игры
 *
 * @author aosipov
 * @extends XO.popup.PopupWidget
 * @class
 */

XO.popup.CreateGamePopup = XO.popup.PopupWidget.extend({

    template: JST['assets/templates/popup/createGamePopup.ejs'],

    showClose: true,

    events: {
        'click .create': 'createGame',
        'click .close': 'close'
    },

    MIN_BET: 25,

    withFriend: false,

    run: function() {
        this.model = new Backbone.Model({
            minBet: this.MIN_BET,
            maxBet: User.get('coins')
        });
        this.show();
        log('Create game show');
    },

    createGame: function() {
        var bet = parseInt(this.$('.bet').val()),
            t = this;
        log('bet: ', bet);
        if (bet && (bet >= this.model.get('minBet') || bet <= this.model.get('maxBet'))) {
            this.hide();
            if (bet > User.get('coins')) {
                t.close();
                new XO.popup.PaymentPopup();
                return;
            }

            io.socket.post('/game', {bet: bet, withFriend: t.withFriend}, function(data) {
                if (data && data.error) {
                    t.hide();
                    var notify = new XO.notify.Notify({
                        durationOut: 1000,
                        model: new Backbone.Model({
                            message: data.error.error_msg
                        })
                    });
                    notify.on('notify:closed', function() {
                        t.show();
                    });
                } else {
                    // кто чем ходит пока харкодно, чисто кто создал тот и папа (делаем пока на сервере)
                    var userId = User.get('id');
                    socket.post('/game/' + data.id + '/users/', {id: userId}, function(res) {
                        log('join game cb:', data.id);
                        t.close();
                        new XO.game.Game({
                            gameId: data.id,
                            model: new Backbone.Model()
                        });
                    });
                }
            });
        } else {
            t.hide();
            var notify = new XO.notify.Notify({
                durationOut: 1000,
                model: new Backbone.Model({
                    message: 'Укажите ставку для начала игры!'
                })
            });
            notify.on('notify:closed', function() {
                t.show();
            });
        }
    }
});
