/**
 * app.js
 *
 * This file contains some conventional defaults for working with Socket.io + Sails.
 * It is designed to get you up and running fast, but is by no means anything special.
 *
 * Feel free to change none, some, or ALL of this file to fit your needs!
 */

User = null;
UserProfile = null;

(function(io) {

    // as soon as this file is loaded, connect automatically,
    var socket = io.connect();
    log('Connecting to Sails.js...');

    socket.on('connect', function socketConnected() {
        log('Socket subscribes');
        //подписываемся тут, чтобы быть не было новых переподписок при перезагрузке сервека
        // Listen for Comet messages from Sails
        socket.get('/user/reconnect');
        socket.get('/game');
    });

    socket.on('disconnect', function() {
        socket.get('/user/disconnect');
    });

    socket.on('reload', function() {
        document.location.reload(true);
    });

    $(window).one('unload', function() {
        socket.get('/user/disconnect');
    });
    // Expose connected `socket` instance globally so that it's easy
    // to experiment with from the browser console while prototyping.
    window.socket = socket;


    $(window).ready(function() {
        new SocialAPI({}, function() {
            var waitPopup = new XO.popup.WaitingGamePopup({message: 'Загрузка данных'});
            $.get('/init/start', function(res) {
                waitPopup.close();
                if (res) {
                    if (res.brain) {
                        Brain = new Backbone.Model({
                            ids: res.brain
                        });
                    }

                    if (res.me) {
                        User = new Backbone.Model(res.me);
                        new XO.profile.Profile({
                            model: User
                        });
                    }

                    if (res.configAntiflud) {
                        var config = res.configAntiflud;
                        AntiFlood.badPatterns = config.badPatterns;
                        AntiFlood.goodPatterns = config.goodPatterns;
                        AntiFlood.goodWords = config.goodWords;
                    }

                    if (res.chat) {
                        ChatMessages = new Backbone.Model({
                            'messages': res.chat
                        });
                    }

                    if (res.topAll && res.topAll.response) {
                        TopAllModel = new Backbone.Model({
                            users: res.topAll.response
                        });
                    }

                    if (res.tables) {
                        TablesModel = new Backbone.Model({
                            tables: res.tables
                        });
                    }

                    if (res.price) {
                        PriceModel = new Backbone.Model({
                            payments: res.price
                        });
                    }
                }

                var $ref = $('#ref'),
                    gameId = $ref.val();
                if (gameId != '') {
                    //пришли по рефу, кидаем чела сразу в игру
                    socket.post('/game/' + gameId + '/users/', {id: User.get('id')}, function(res) {
                        if (res && res.id) {
                            log('Join game from ref: ');
                            new XO.game.Game({
                                gameId: gameId,
                                model: new Backbone.Model()
                            });
                        } else {
                            // игра уже закончилась, либо старый реквест
                            new XO.lobby.Tabs({});
                        }
                    });
                    $ref.val('');
                } else {
                    new XO.lobby.Tabs({});
                }

            });
        });
    });

})(window.io);
