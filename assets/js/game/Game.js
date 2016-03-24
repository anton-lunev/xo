/**
 * Основной класс игры
 */
XO.game.Game = Backbone.View.extend({

    template: JST['assets/templates/game/game.ejs'],

    bodyTemplate: JST['assets/templates/game/gameBody.ejs'],

    statusTemplate: JST['assets/templates/game/gameStatus.ejs'],

    el: '.app-layout__body',

    events: {
        "click .cell": "move",
        "click .invite-friend": "inviteFriends",
        "click .back": "close"
    },

    gameId: null,

    moveTimer: null,

    delayTimeoverTimer: null,

    /** время на ход - 20 сек*/
    TIME_LIMIT: 20,

    timerIteration: -1,

    /** @type  XO.popup.CallUserPopup */
    invitePopup: null,

    /** @type  XO.popup.WaitingGamePopup */
    waitingPopup: null,

    /** объект по умолчанию со статусом игры*/
    gameProcessDefaults: {
        text: 'Ожидаем подключения игрока',
        timer: null,
        progress: '100%',
        danger: false
    },

    /** разделяем селекторы для рендера */
    selectors: {
        game: '.game-body',
        status: '.game-players'
    },

    isAIGame: false,

    AI: null,

    AITimerCount: 10000,

    AITimer: null,

    isMoveLocked: false,

    /**
     * Инициализация класса игры
     * @param options
     */
    initialize: function(options) {
        this.listenTo(this.model, "change:Game", this.renderGame);
        this.listenTo(this.model, "change:GameProcess", this.renderStatus);
        if (options.gameId) {
            var t = this;
            t.gameId = options.gameId;
            $.get('/game', {
                id: t.gameId
            }, function(game) {
                if (game) {
                    var process = _.extend({}, t.gameProcessDefaults);

                    t.model.set({
                        Game: game,
                        GameProcess: process
                    });

                    if (_.isArray(game.users) && game.users.length == 2) {
                        t.startGame(game);
                    } else if (game.withFriend) {
                        var invitePopup = new XO.popup.CallUserPopup({gameId: t.gameId});

                        invitePopup.on('userCalled', function() {
                            t.initWaitingPopup();
                        });

                        invitePopup.on('userCancelled', function() {
                            t.close();
                        });
                    } else {
                        t.initWaitingPopup();
                        t.startAITimer();
                    }
                }
            });
        }
        t.subscribeEvents();
    },

    initWaitingPopup: function() {
        var t = this;
        this.waitingPopup = new XO.popup.WaitingGamePopup();
        this.waitingPopup.on('cancel', function() {
            t.close(true);
        })
    },

    startAITimer: function() {
        if (this.AITimer === null) {
            this.AITimer = setInterval(_.bind(this.joinAI, this), this.AITimerCount);
        }
    },

    stopAITimer: function() {
        if (this.AITimer) {
            clearInterval(this.AITimer);
        }
    },

    subscribeEvents: function() {
        var t = this;
        socket.on('game', function(msg) {
            if (t.model.get('Game').id == msg.id) {
                if (msg.verb == 'removedFrom') {
                    //чел удалился из игры
                    log('timer stopped, removedFrom');
                    t.stopMoveTimer();
                }
                t.updateGame(msg);
            }
        });

        socket.on('move', function(msg) {
            if (msg && msg.response) {
                t.onMove(msg.response);
            }
        });

        socket.on('timeover', function(msg) {
            log('timeover', msg);
            //останавливаем отложенный вызов timeover
            t.stopMoveTimer();
            t.unsubscribeSockEvents();
            t.showGameOver(msg.message);
        });
        $(window).one('unload', _.bind(t.close, t));
    },

    /**
     * Отписываемся от сокетов
     */
    unsubscribeSockEvents: function() {
        socket.removeAllListeners('game');
        socket.removeAllListeners('timeover');
        socket.removeAllListeners('move');
    },
    /**
     * Обработчик хода
     * @param move
     */
    onMove: function(move) {
        this.makeMove(move);
    },

    updateGame: function(game) {
        var t = this;
        if (game) {
            socket.get('/game', {id: game.id}, function(res) {
                if (res && _.isArray(res.users) && res.users.length == 2) {
                    t.startGame(res);
                } else if (res && res.id) {
                    log('rebuild game ', res.id);
                    t.getGame(res.id);
                }
            });
        }
    },

    getGame: function(gameId) {
        var t = this;
        socket.get('/game', {id: gameId}, function(game) {
            if (game) {
                t.model.set({
                    Game: game
                });
            }
        });
    },

    /**
     * Начинаем игру, все законектились и прочее
     * @param game
     */
    startGame: function(game) {
        if (this.waitingPopup) {
            this.waitingPopup.close();
        }

        this.stopAITimer();
        this.render();
        new XO.chat.PrivateChat({gameId: game.id});

        var message = (game.users[0].id == User.get('id') || game.users[1].id == User.get('id')) ?
            'Приготовьтесь, игра начинается!' : 'Вы находитесь в режиме просмотра игры';
        var t = this,
            notify = new XO.notify.Notify({
                durationOut: 1000,
                model: new Backbone.Model({
                    message: message
                })
            });
        Sounds.play("connected");
        //захайдим кнопку назад, без всяких там рендеров
        this.$('.back').hide();
        notify.on('notify:closed', function() {
            var process = t.model.get('GameProcess');
            process.text = (game.whoMove == User.get('id')) ? 'Сделайте ваш первый ход' : 'Противник ходит первым';
            t.model.set({
                Game: game,
                GameProcess: process
            });

            if (t.isGamePlayer()) {
                t.startMoveTimer();
            }
        });
    },

    /**
     * Рендер игрового поля
     */
    render: function() {
        this.$el.html(this.template(this.model.attributes));
        this.renderGame();
        this.renderStatus();
        return this;
    },

    renderGame: function() {
        this.$el.find(this.selectors.game).html(this.bodyTemplate(this.model.attributes));
        return this;
    },

    renderStatus: function() {
        this.$el.find(this.selectors.status).html(this.statusTemplate(this.model.attributes));
        return this;
    },

    move: function(e) {
        var $cell = $(e.target),
            game = this.model.get('Game');
        // проверим мы ли ходим, и все ли игроки в игре чтобы не мучать лишний раз сервак
        if (game.whoMove != User.get('id') || game.users.length != 2) {
            return;
        }

        if (this.isMoveLocked) {
            return;
        }
        if (!$cell.hasClass('cell-moveable')) {
            if (game.isOver) {
                this.showGameOver('Игра уже окончена!');
            } else {
                this.showMessage('Вы не можете сюда ходить.');
            }
            return;
        }
        var t = this;
        this.isMoveLocked = true;
        socket.post('/game/move', {gameId: game.id, cell: $cell.data('cell'), value: "X", position: game.position}, function(res) {
            t.isMoveLocked = false;
            if (res.response) {
                //делаем ход
                t.onMove(res.response);
                if (t.isAIGame) {
                    game.moveValue = res.response.value;
                    //для правдоподобности))
                    _.delay(function() {
                        t.AI.makeMove(game);
                    }, 1000 + Math.random() * 500);
                }
            }
        });
    },

    makeMove: function(move) {
        this.stopMoveTimer();
        var game = this.model.get('Game');
        game.position[0][move.cell] = move.value;
        move.moveValue = move.value;
        game.move = move.cell;
        game.winPosition = (move.win) ? move.win : null;
        game.whoMove = move.whoMove;
        if (move.users) {
            game.users = move.users;
        }
        //хз но как-то странно работают обновления атрибутов в бекбоне если честно
        this.model.set('Game', game);
        this.renderGame();
        Sounds.play("move");
        if (game.winPosition) {
            this.stopMoveTimer();
            this.showGameOver(move.message);
            return;
        } else if (move.message) {
            this.showMessage(move.message);
        }
        this.startMoveTimer();
    },

    /**
     * Показывает нотифай с мессаджем
     * @param message
     */
    showMessage: function(message) {
        if (message) {
            new XO.notify.Notify({
                model: new Backbone.Model({
                    message: message
                })
            });
        }
    },

    showGameOver: function(message) {
        if (message) {
            this.stopMoveTimer();
            var popup = new XO.popup.GameOverPopup({
                model: new Backbone.Model({
                    text: message
                })
            });
            popup.once('close', _.bind(this.close, this));
        }
    },

    close: function(withoutRender) {
        var gameId = this.model.get('Game').id,
            t = this;
        t.stopAITimer();
        socket.delete('/game/' + gameId + '/users/', {id: User.get('id')}, function() {
            log('Game leave: ', gameId);
            t.stopMoveTimer();
            if (!withoutRender) {
                t.$el.find('.game-body').remove();
                new XO.lobby.Lobby();
            }
        });
        this.undelegateEvents();
        $(window).off('unload');
        socket.removeAllListeners('game');
        socket.removeAllListeners('timeover');
        socket.removeAllListeners('move');
    },

    /**
     * Запускаем таймер на ход игрока
     */
    startMoveTimer: function() {
        //усе игра уже из овер
        if (this.model.get('Game').isOver) {
            return;
        }
        var t = this,
            time = 0,
            data = {};
        data.text = (t.model.get('Game').whoMove == User.get('id')) ?
            'Ваш ход' : 'Ходит противник';
        data.timer = t.TIME_LIMIT;
        data.progress = '100%';
        data.danger = false;
        t.model.set('GameProcess', data);
        _.delay(function() {
            t.$el.find('.bar').animate({width: '0%'}, t.TIME_LIMIT * 1000);
        });

        if (this.moveTimer !== null) {
            this.stopMoveTimer();
        }
        this.moveTimer = setInterval(function() {
            t.timerIteration++;
            time = t.TIME_LIMIT - t.timerIteration;

            if (time >= 0) {
                // обновлять будем не через модель а в доме, чтобы не рендерить не нежуное
                var $timer = t.$el.find('.timer'),
                    $bar = t.$el.find('.bar');

                $timer.text(time);
                if (time <= 10 && !$timer.hasClass('danger')) {
                    $timer.addClass('timer-danger');
                    $bar.addClass('bar-danger');
                    //тикаем только если ты ходишь
                    (t.model.get('Game').whoMove == User.get('id')) && Sounds.play("timer");
                }
            } else {
                //усе ты слил братан
                t.timeIsOver();
                t.stopMoveTimer();
            }
        }, 1000);
    },

    /**
     * Кончилось время на ход
     */
    timeIsOver: function() {
        if (this.isGamePlayer()) {
            var t = this,
                whoMove = t.model.get('Game').whoMove,
                gameId = t.model.get('Game').id;
            //если ты ходишь, то шлем месагу, иначе делаем отложенный вызов (ну чтобы две месаги не пересекались)
            if (whoMove == User.get('id')) {
                io.socket.post('/game/timeover', {gameId: gameId}, function() {
                    //сразу стопаем таймер
                    t.stopMoveTimer();
                });
            } else {
                if (t.delayTimeoverTimer === null) {
                    //отложенный вызов от противника (если что-то случилось с тем кто ходил)
                    t.delayTimeoverTimer = setTimeout(function() {
                        clearTimeout(t.delayTimeoverTimer);
                        t.delayTimeoverTimer = null;
                        if (!t.model.get('Game').isOver) {
                            log('timeover from delay called');
                            io.socket.post('/game/timeover', {gameId: gameId});
                        }
                    }, 3000);
                }
            }
        }
    },

    /**
     * Остановка таймера
     */
    stopMoveTimer: function() {
        this.model.set('GameProcess', {});
        clearInterval(this.moveTimer);
        this.moveTimer = null;
        Sounds.stop("timer");
        this.timerIteration = 0;
    },

    /**
     * Является ли юзер игроком в этой игре, или просто вотчер
     * @returns {Boolean|boolean}
     */
    isGamePlayer: function() {
        var users = this.model.get('Game').users || [],
            userId = User.get('id');
        return (_.isArray(users) && _.size(users) == 2 && (users[0].id == userId || users[1].id == userId));
    },

    joinAI: function() {
        var gameId = this.model.get('Game').id,
            t = this,
            id = _.shuffle(Brain.get('ids')).pop();
        if (gameId) {
            socket.post('/game/ai', {gameId: gameId, userId: id}, function(res) {
                if (res) {
                    t.isAIGame = true;
                    if (res.error) {
                        new XO.notify.Notify({
                            durationOut: 1000,
                            model: new Backbone.Model({
                                message: res.error.error_msg
                            })
                        });
                    } else if (res.id) {
                        var process = _.extend({}, t.gameProcessDefaults),
                            game = res;
                        t.model.set({
                            Game: game,
                            GameProcess: process
                        });
                        t.AI = new XO.game.GameAI();

                        if (_.isArray(game.users) && game.users.length == 2) {
                            t.startGame(game);
                        }
                    }
                }
            });
        }
    }
});
