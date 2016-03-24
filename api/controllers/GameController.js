/**
 * GameController
 *
 * @description :: Server-side logic for managing Games
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

/** инстанс логера */
/** @type sails.log */
var log = sails.log;

/** инстанс сокетов */
/** @type sails.sockets */
var sockets = sails.sockets;

var EXPIRE_TIME = 60 * 5; //время жизни игры 3 минуты

module.exports = {

    /**
     * Создание игры
     * @param req
     * @param res
     */
    'create': function(req, res) {
        var userId = User.getId(req),
            bet = parseInt(req.param('bet')),
            withFriend = !!req.param('withFriend'),
            sockets = sails.sockets;
        // далее поехали спускаться по водопадику
        async.waterfall([
            //проверка пользователя на валидность
            function(callback) {
                if (!userId) {
                    log.error('Unauthorized user!');
                    //Товарищу пора обновить страницу, он просрал сессию
                    sockets.broadcast('document', 'reload');
                    callback(true);
                } else {
                    callback(null);
                }
            },

            //юзер есть, проверяем ставку
            function(callback) {
                if (isNaN(bet)) {
                    log.error('Bet is NaN: ', bet);
                    callback(Game.errorMessage('Ставка должна быть числом', 1));
                } else {
                    callback(null);
                }
            },

            //ставка ок, ищем юзера
            function(callback) {
                User.findById(userId)
                    .then(function(userObj) {
                        if (_.isArray(userObj)) {
                            //юзер есть все ништяк
                            callback(null, userObj.pop());
                        } else {
                            log.error('Cant load user ', userId, 'to create game\n', err);
                            callback(true);
                        }
                    })
                    .fail(function(err) {
                        log.error('Cant find user ', userId, 'to create game\n', err);
                        callback(true);
                    });
            },

            //юзера нашли, пошли дальше, проверяем ставку относительно юзера
            function(user, callback) {
                //минимальная ставка
                if (bet < 25) {
                    callback(Game.errorMessage('Минимальная ставка: 25 монет', 2));
                } else if (bet > user.coins) {
                    //обновим профиль кульхацкеру
                    sails.sockets.broadcast(user.id, 'profile', {
                        coins: user.coins
                    });
                    if (user.coins > 0 && user.coins >= 25) {
                        callback(Game.errorMessage('Максмимальная ставка: ' + user.coins + ' монет', 3));
                    } else {
                        callback(Game.errorMessage('Недостаточно средств на счете, пополните ваш счет!', 4));
                    }
                } else {
                    //все хорошо
                    callback(null, user);
                }
            },

            //ура все ок создаем игру
            function(user, callback) {
                //todo:  по хорошему, сразу добавили юзера и в бой (без последующего джойна)
                Game.create({
                    bet: bet,
                    whoMove: user.id,
                    withFriend: withFriend,
                    users: [user]
                })
                    .then(function(game) {
                        if (game) {
                            callback(null, game);
                        } else {
                            callback(Game.errorMessage('Не удалось создать игру, повторите попытку позже.', 5));
                        }
                    })
                    .fail(function(err) {
                        log.error('Cant create game!\n', err);
                        callback(true);
                    });
            }
        ],
            //конечный коллбек
            function(err, result) {
                if (err) {
                    if (_.isObject(err)) {
                        return res.json(err);
                    } else {
                        res.badRequest();
                    }
                } else {
                    log.info('Game created: ', result.id);
                    Game.publishCreate(result);
                    return res.json(result);
                }
            }
        );
    },

    /**
     * Подключение к игре
     * @param req
     * @param res
     * @param next
     */
    'join': function(req, res, next) {
        //todo: если добавить отдельный метод для подключения АИ все будет работать
        var gameId = req.param('gameId'),
            sockets = sails.sockets;

        //поехали
        async.waterfall([
            //проверим передали ли айдиху игры
            function(callback) {
                if (!gameId) {
                    log.error('No game id passed to join');
                    callback(true);
                } else {
                    callback(null);
                }
            },

            //подргужаем игру
            function(callback) {
                Game.findById(gameId)
                    .then(function(gameObj) {
                        var game = (_.isArray(gameObj)) ? gameObj.pop() : false;

                        if (game && game.users) {
                            callback(null, game);
                        } else {
                            log.warning('Join game, error find by id:', gameId, 'userId:');
                            callback(true);
                        }

                    })
                    .fail(function(err) {
                        log.error('Cant find game by id ', gameId, 'to join\n Err:', err);
                        callback(true);
                    });
            },

            //есть игра и мы ее подгрузили
            function(game, callback) {
                if (_.size(game.users) < 2) {
                    // чувак в ожидании начала игры, все ок идем дальше
                    //проверим, а есть ли у тебя баблецо товарищ
                    var userId = User.getId(req);
                    if (userId) {
                        User.findById(userId)
                            .then(function(userObj) {
                                var user = (_.isArray(userObj)) ? userObj.pop() : false;

                                if (!user) {
                                    log.error('Cant find user, ', userId, ' to join a game:', game.id, err);
                                    callback(true);
                                    return;
                                }
                                if (game.bet > user.coins) {
                                    //обнвоим кульхацкеру профиль
                                    sockets.broadcast(user.id, 'profile', {
                                        coins: user.coins
                                    });
                                    callback(Game.errorMessage('Недостаточно средств на счете, пополните ваш счет!', 4));
                                    return;
                                }
                                //иначе все нормалек, подрубаем юзера
                                log.info('join to game:', game.id);
                                game.users.push(user);
                                game.isFull = (_.size(game.users) >= 2);
                                game.save()
                                    .then(function(game) {
                                        //ставим время жизни игры
                                        Game.native(function(err, connection) {
                                            connection.expire(["waterline:game:id:" + game.id, EXPIRE_TIME], function(err, res) {
                                                callback(null, game);
                                            });
                                        });
                                    })
                                    .catch(function(err) {
                                        callback(Game.errorMessage('Не удалось подключится к игре, поторите попытку позже', 5));
                                        log.error('Error create game:\n Err:', err);
                                    });
                            })
                            .fail(function(err) {
                                log.error('Cant find user (fail), ', userId, ' to join a game:', game.id, err);
                                callback(Game.errorMessage('Не удалось подключится к игре, поторите попытку позже', 5));
                            });
                    } else {
                        log.error('Unauthorized user!');
                        //Товарищу пора обновить страницу, он просрал сессию
                        sockets.broadcast('document', 'reload');
                        callback(true);
                    }
                } else if (_.size(game.users) >= 2) {
                    //игра уже идет, но ты можешь просто позырить, поэтому тебе возвращаем объект игры
                    log.info('join like a watcher:', game.id);
                    //давай тогда ты создашь просто игру себе)
                    callback({
                        error: {
                            error_msg: 'I dont wont be a watcher!',
                            error_code: 10,
                            bet: game.bet
                        }
                    });
                } else {
                    //а вот тут мы никогда быть не должны по идее
                    log.info('Strange situations in join...:', game.id);
                    callback(Game.errorMessage('Не удалось подключится к игре, поторите попытку позже', 5));
                }
                //подрубаем к чату игры
                req.socket.join('chat' + game.id);
            }
        ],
            //конечный коллбек с результатми
            function(err, result) {
                if (err) {
                    if (_.isObject(err)) {
                        return res.json(err);
                    } else {
                        res.badRequest();
                    }
                } else {
                    if (_.isArray(result.users) && _.size(result.users) == 2) {
                        Game.publishUpdate(result.id, {users: result.users});
                    }
                    return res.json(result);
                }
            }
        );
    },

    /**
     * Контроллер для подключения AI
     * @param req
     * @param res
     * @param next
     */
    'ai': function(req, res, next) {
        //todo: если добавить отдельный метод для подключения АИ все будет работать
        var gameId = req.param('gameId'),
            userId = req.param('userId'),
            sockets = sails.sockets;

        //поехали
        async.waterfall([
            //проверим передали ли айдиху игры
            function(callback) {
                if (!gameId || !userId) {
                    log.error('No game id passed to join');
                    callback(true);
                } else {
                    callback(null);
                }
            },

            //подргужаем игру
            function(callback) {
                Game.findById(gameId)
                    .then(function(gameObj) {
                        var game = (_.isArray(gameObj)) ? gameObj.pop() : false;

                        if (game && game.users) {
                            callback(null, game);
                        } else {
                            log.warning('Join game, error find by id:', gameId, 'userId:');
                            callback(true);
                        }

                    })
                    .fail(function(err) {
                        log.error('Cant find game by id ', gameId, 'to join\n Err:', err);
                        callback(true);
                    });
            },

            //есть игра и мы ее подгрузили
            function(game, callback) {
                if (_.size(game.users) < 2) {
                    // все ок подключаем к нему юзера
                    User.findById(userId)
                        .then(function(responce) {
                            var user = (_.isArray(responce)) ? responce.pop() : false;
                            if (user) {
                                game.users.push(user);
                                game.isFull = true;
                                game.save()
                                    .then(function(game) {
                                        callback(null, game);
                                    })
                                    .catch(function(err) {
                                        log.error('Cant join AI! \nErr:', err);
                                        callback(true);
                                    })
                            }
                        })
                } else if (_.size(game.users) >= 2) {
                    //игра уже идет, но ты можешь просто позырить, поэтому тебе возвращаем объект игры
                    log.info('join like a watcher:', game.id);
                    //подпишем тебя в канал вотчеров
                    req.socket.join(game.id);
                    callback(null, null);
                } else {
                    //а вот тут мы никогда быть не должны по идее
                    log.info('Strange situations in join...:', game.id);
                    callback(Game.errorMessage('Не удалось подключится к игре, поторите попытку позже', 5));
                }
                //подрубаем к чату игры
                req.socket.join('chat' + game.id);
            }
        ],
            //конечный коллбек с результатми
            function(err, result) {
                if (err) {
                    if (_.isObject(err)) {
                        return res.json(err);
                    } else {
                        res.badRequest();
                    }
                } else {
                    if (result) {
                        return res.json(result);
                    }
                }
            }
        );
    },

    /**
     * Покидание комнаты с игрой
     * @param req
     * @param res
     * @param next
     */
    'leave': function(req, res, next) {
        var gameId = req.param('gameId');

        async.waterfall([
            //проверим передали ли айдиху игры
            function(callback) {
                if (!gameId) {
                    log.error('No game id passed to leave');
                    callback(true);
                } else {
                    callback(null);
                }
            },

            //подргужаем игру
            function(callback) {
                Game.findById(gameId)
                    .then(function(gameObj) {
                        var game = (_.isArray(gameObj)) ? gameObj.pop() : false;

                        if (game && game.users) {
                            callback(null, game);
                        } else {
                            log.info('Leave game, error find by id:', gameId, 'seems like game already removeed');
                            callback(true);
                        }

                    })
                    .fail(function(err) {
                        log.error('Cant find game by id ', gameId, 'to leave\n Err:', err);
                        callback(true);
                    });
            },

            //игра есть, пошли дальше
            function(game, callback) {
                var userId = User.getId(req);

                if (!userId) {
                    log.error('Unauthorized user!');
                    //Товарищу пора обновить страницу, он просрал сессию
                    sockets.broadcast('document', 'reload');
                    callback(true);
                }

                if (_.size(game.users) == 1 && game.users[0].id == userId) {
                    //сам создал, сам же и удалил игру (вышел и не дождался коннекта)
                    Game.destroy(gameId)
                        .then(function() {
                            Game.publishDestroy(gameId);
                            callback(null, game);

                        })
                        .fail(function(err) {
                            log.error('Cant destroy game.\n Err:', err);
                            callback(true);
                        });
                } else if (game.users.length == 2 && Game.isGamePlayer(game.users, userId)) {
                    // печаль, ты либо сдался, либо случайно нажал f5 либо у тебя тупо кончился инет...
                    game.isOver = true;

                    var winnerId = 0,
                        loserId = 1;

                    if (game.users[0].id == userId) {
                        winnerId = 1;
                        loserId = 0;
                    }


                    // а теперь попорбуем запустить парралельные обновляния
                    async.parallel([
                        //обновляем победителя
                        function(cbParallel) {
                            var message = 'Поздравляем, противник сдался, вы выиграли!',
                                changes = {},
                                userId = game.users[winnerId].id;
                            User.updateWinner(userId, game.bet)
                                .then(function(userObj) {
                                    var winner = userObj.user,
                                        profile = userObj.profile,
                                        sockets = sails.sockets;

                                    sockets.broadcast(winner.id, 'profile', profile);
                                    sockets.broadcast(winner.id, 'timeover', {
                                        message: message
                                    });
                                    cbParallel(null, winner);
                                }).fail(function(err) {
                                    //тупо прокиним то что было
                                    cbParallel(null, game.users[winnerId]);
                                });
                        },

                        //обновляем лузера
                        function(cbParallel) {
                            var userId = game.users[loserId].id;
                            //loser = [].concat(game.users[loserId]).pop();
                            User.updateLoser(userId, game.bet)
                                .then(function(userObj) {
                                    cbParallel(null, userObj.user);
                                })
                                .fail(function(err) {
                                    //тупо прокиним то что было
                                    cbParallel(null, game.users[loserId]);
                                });
                        },

                        //архивируем игру
                        function(cbParallel) {
                            cbParallel(null);
                            /*ArchiveGame.create({
                             history: game.toJSON(),
                             gameId: game.id
                             })
                             .then(function() {
                             log.info('Game ', game.id, ' Archived');
                             cbParallel(null);
                             })
                             .fail(function(err) {
                             log.error('Cant move game ', gameId, 'to Archive\nErr:', err);
                             cbParallel(null);
                             });*/

                        }
                    ],
                        //финальный колбек парралельности
                        function(err, result) {
                            //все таски выполнились
                            //на эрор нам тут как бы посрать
                            //вазываем главный колбекс водопада
                            //result должен быть массив из двух юзеров - победителя и проигравшего
                            game.users = [].concat(result[0], result[1]);
                            //а теперь можно и обновить саму игру
                            callback(null, game);
                        }
                    );
                    //выходим как наблюдатель
                } else if (!Game.isGamePlayer(game.users, User.getId(req))) {
                    req.socket.leave(game.id);
                    callback(true, res.ok);
                }
                //отрубаемся от чата
                req.socket.leave('chat' + game.id);
            },

            //обновляем игру (точнее просто удаляем ее)
            function(game, callback) {
                if (game && game.id) {
                    if (!Game.isGamePlayer(game.users, User.getId(req))) {
                        req.socket.leave(game.id);
                    }
                    Game.destroy(game.id)
                        .then(function() {
                            Game.publishDestroy(game.id);
                            callback(null, next);
                        })
                        .fail(function(err) {
                            log.error('Cant remove game in leave', game.id, 'Err\n', err);
                            callback(null, next);
                        });
                } else {
                    //этого быть не должно быть, но на всякий случай просто вернем OK
                    callback(null, res.ok);
                }

            },
        ],
            //конечный коллбек
            function(err, result) {
                if (err) {
                    if (_.isObject(err)) {
                        return res.json(err);
                    } else if (_.isFunction(err)) {
                        //ok от вотчера
                        log.info('return ok in error of leave');
                        return result();
                    }
                    else {
                        res.badRequest();
                    }
                } else {
                    //джойн через next
                    Game.publishDestroy(gameId);
                    if (_.isFunction(result)) {
                        return result();
                    } else {
                        return res.json(result);
                    }
                }
            }
        );
    },

    /**
     * Ход игрока
     * @param req
     * @param res
     */
    move: function(req, res) {
        var cell = req.param('cell'),
            value = 'O',
            gameId = req.param('gameId'),
            newPosition = req.param('position'),
            socket = sails.sockets,
            aiMove = req.param('ai') || false;

        //поехали спускаться по водопаду
        async.waterfall([

            //проверим параметры для начала
            function(callback) {
                if (!req.isSocket) {
                    log.error('Not socket request on move');
                    callback(true);
                    return;
                }

                if (!User.getId(req)) {
                    log.error('User undefined in move');
                    callback(true);
                    return;
                }

                if (!newPosition) {
                    log.error('Possition not passed in params');
                    callback(true);
                    return;
                }

                if (gameId && (cell || cell == 0) && value) {
                    //все ок продолжаем, подгружаем игру и го го го
                    Game.findById(gameId)
                        .then(function(gameObj) {
                            var game = (_.isArray(gameObj)) ? gameObj.pop() : false;

                            if (game && game.users) {
                                callback(null, game);
                            } else {
                                log.info('Find game in move, error find by id:', gameId, 'seems like game already removeed');
                                callback(true);
                            }

                        })
                        .fail(function(err) {
                            log.error('Cant find game by id ', gameId, 'to make move\n Err:', err);
                            callback(true);
                        });
                } else {
                    log.error('Not enough params passed in move, cell:', cell, 'gameId:', gameId, 'value:', value);
                    callback(true);
                }
            },
            //игру нашли, все ок, поехали проверять что там да как
            function(game, callback) {
                var userId = User.getId(req);
                //игра уже закончена
                if (game.isOver) {
                    callback(true, Game.responseMessage('Игра уже закончена'));
                    return;
                }
                //если ход не компа проверяем
                if (!aiMove) {
                    if (!Game.isGamePlayer(game.users, userId)) {
                        callback(true, Game.errorMessage('Вы можете только наблюдать за игрой', 2));
                        return;
                    }

                    //проверка на попытку инъекции в игру
                    if (Game.isInjected(Game.makeArray(newPosition[0]), Game.makeArray(game.position[0]))) {
                        log.info('Game injection!');
                        callback(true, Game.errorMessage('Game injection', 3));
                        return;
                    }

                    if (game.users.length == 1) {
                        log.info('Game, not all users connected!');
                        callback(true, Game.responseMessage('Ожидаем подключения соперника'));
                        return;
                    }

                    //проверим, а ты ли ходишь
                    if (game.whoMove && game.whoMove != userId) {
                        log.info('Not sender move: ', {whoMove: game.whoMove, sender: userId});
                        callback(true, Game.responseMessage('Сейчас ходит противник'));
                        return;
                    }
                }
                //проверим свободна ли ячейка куда делают ход
                if (game.position && game.position[0] && game.position[0][cell] == '') {
                    //все ок поехали дальше
                    log.info('cell is empty go next');
                    var sender = req.session.User,
                        receiver = game.users[0];

                    if (!game.hasFirstMove) {
                        //поставим флаг о том что была первый ход
                        game.hasFirstMove = true;
                    }

                    if (aiMove) {
                        value = "O";
                        if (game.users[0].id == sender.id) {
                            receiver = game.users[0];
                            sender = game.users[1];
                        } else {
                            receiver = game.users[1];
                            sender = game.users[0];
                        }
                    } else {
                        if (game.users[0].id == sender.id) {
                            //если же ты еще и первый ты ходишь крестиками
                            receiver = game.users[1];
                            value = "X";
                        }
                    }
                    if (game.users[0].id == sender.id) {
                        //если же ты еще и первый ты ходишь крестиками
                        receiver = game.users[1];
                        value = "X";
                    }
                    //check win point
                    game.position[0][cell] = value;
                    //next move
                    game.whoMove = receiver.id;

                    var arrPositions = Game.makeArray(game.position[0]),
                        winObj = Game.checkWin(arrPositions, value, cell),
                        winnerMessage = '',
                        changes = {};

                    if (winObj.isWin) {
                        log.info('Has game winners! Go parallels');
                        game.isOver = true;
                        var winnerId = -1,
                            loserId = -1;
                        if (winObj.winPosition.length != 0) {
                            //в противном случае ничья
                            game.winPosition = winObj.winPosition;
                            if (value == 'X') {
                                winnerId = 0;
                                loserId = 1;
                                winnerMessage = 'Игра окончена! Крестики выиграли.';
                            } else {
                                winnerId = 1;
                                loserId = 0;
                                winnerMessage = 'Игра окончена! Нолики выиграли.';
                            }
                        }


                        //далее делаем так:
                        //запускаем парралельные таски на обновления юзеров
                        //затем в результирующей прокидываем дальше в водопад, помимо обновленной модели игры, данные по каждому юзеру о победе
                        //т.е. ту инфу что в кончном итоге должна будет уйти на клиента
                        async.parallel({
                                //обновляем победителя (либо первого пользователя, в случае ничьи
                                winner: function(cbParallel) {
                                    if (winnerId != -1) {
                                        //не ничья, обновляем победителя
                                        User.updateWinner(game.users[winnerId].id, game.bet)
                                            .then(function(userObj) {
                                                var winner = userObj.user,
                                                    profile = userObj.profile;
                                                var winnerObjToBroadcast = {
                                                    //id of reveiver
                                                    receiver: winner.id,
                                                    //message to profile
                                                    profile: profile,
                                                    //это общее событие у нас об окончании игры (м.б. лучше назвать gameover?)
                                                    timeover: {
                                                        message: winnerMessage
                                                    }
                                                };
                                                cbParallel(null, {
                                                    user: winner,
                                                    message: winnerObjToBroadcast
                                                });
                                            })
                                            .fail(function() {
                                                //поидее такого гоуна не должно произойти, но на всяикй случай, и кидаем ереро
                                                log.error('FATAL: cant update wuinner user in move');
                                                callback(true, null);
                                            });
                                    } else {
                                        //ничья, обновлим первого юзера
                                        var message = 'Нет больше ходов - ничья';
                                        User.updateDraw(game.users[0].id)
                                            .then(function(drawObj) {
                                                var drawUser = drawObj.user,
                                                    profile = drawObj.profile,
                                                    winnerObjToBroadcast = {
                                                        //id of reveiver
                                                        receiver: drawUser.id,
                                                        //message to profile
                                                        profile: profile,
                                                        //это общее событие у нас об окончании игры (м.б. лучше назвать gameover?)
                                                        timeover: {
                                                            message: message
                                                        }
                                                    };
                                                cbParallel(null, {
                                                    user: drawUser,
                                                    message: winnerObjToBroadcast
                                                });
                                            })
                                            .fail(function() {
                                                //поидее такого гоуна не должно произойти, но на всяикй случай, и кидаем ереро
                                                log.error('FATAL: cant update draw user in move');
                                                callback(true, null);
                                            });
                                    }
                                },

                                //обновляем лузера
                                loser: function(cbParallel) {
                                    var message = 'Игра окончена, вы проиграли!';

                                    if (loserId != -1) {
                                        User.updateLoser(game.users[loserId].id, game.bet)
                                            .then(function(loserObj) {
                                                var loser = loserObj.user,
                                                    profile = loserObj.profile,
                                                    loserObjToBroadcast = {
                                                        //id of reveiver
                                                        receiver: loser.id,
                                                        //message to profile
                                                        profile: profile,
                                                        //это общее событие у нас об окончании игры (м.б. лучше назвать gameover?)
                                                        timeover: {
                                                            message: message
                                                        }
                                                    };
                                                cbParallel(null, {
                                                    user: loser,
                                                    message: loserObjToBroadcast
                                                });
                                            })
                                            .fail(function() {
                                                //поидее такого гоуна не должно произойти, но на всяикй случай, и кидаем ереро
                                                log.error('FATAL: cant update loser in move');
                                                callback(true, null);
                                            });
                                    } else {
                                        //ничья, обновлим второго юзера
                                        message = 'Нет больше ходов - ничья';

                                        User.updateDraw(game.users[1].id)
                                            .then(function(drawObj) {
                                                var drawUser = drawObj.user,
                                                    profile = drawObj.profile,
                                                    winnerObjToBroadcast = {
                                                        //id of reveiver
                                                        receiver: drawUser.id,
                                                        //message to profile
                                                        profile: profile,
                                                        //это общее событие у нас об окончании игры (м.б. лучше назвать gameover?)
                                                        timeover: {
                                                            message: message
                                                        }
                                                    };
                                                cbParallel(null, {
                                                    user: drawUser,
                                                    message: winnerObjToBroadcast
                                                });
                                            })
                                            .fail(function() {
                                                //поидее такого гоуна не должно произойти, но на всяикй случай, и кидаем ереро
                                                log.error('FATAL: cant update draw user in move');
                                                callback(true, null);
                                            });
                                    }
                                }
                            },
                            //финальный колбек парралельности
                            function(err, result) {
                                //все таски выполнились
                                //на эрор нам тут как бы посрать
                                //вазываем главный колбекс водопада
                                //result должен быть массив из двух юзеров - победителя и проигравшего
                                if (err) {
                                    // беда, но такого быть не должно
                                    //todo: может в таких случаях прокидывать тогда текущее состояние юзера?
                                    callback(true);
                                    return;
                                }
                                game.users = [].concat(result.winner.user, result.loser.user);
                                //архивируем игру
                                callback(null, game, result.winner.message, result.loser.message);
                                /*ArchiveGame.create({
                                 history: game.toJSON(),
                                 gameId: game.id
                                 })
                                 .then(function() {
                                 log.info('Game ', game.id, ' Archived');
                                 //вызываем гланый коллбек и передаем нужную инфу
                                 callback(null, game, result.winner.message, result.loser.message);
                                 })
                                 .fail(function(err) {
                                 log.error('Cant move game ', gameId, 'to Archive\nErr:', err);
                                 //вызываем гланый коллбек
                                 callback(null, game, result.winner.message, result.loser.message);
                                 });*/
                            });
                    } else {
                        //можно делать ход =)
                        callback(null, game, null, null);
                    }
                } else {
                    log.error('Error on make move: cell is not empty');
                    callback(true, Game.errorMessage('Ошибка! Вы не можете сюда ходить', 4));
                }
            },
            // все ок, делаем ход, либо удаляем, если она уже окончена
            function(game, winner, loser, callback) {
                var receiverId = game.users[0].id,
                    senderId = User.getId(req);
                //кому надо будет отправить по сокету инфу
                if (aiMove) {
                    if (game.users[1].id == User.getId(req)) {
                        receiverId = game.users[0].id;
                        senderId = receiverId;
                    }
                } else {
                    if (game.users[0].id == User.getId(req)) {
                        receiverId = game.users[1].id;
                    }
                }
                if (game.isOver) {

                    if (_.isObject(winner) && _.isObject(loser)) {
                        //все игра закончилась, удаляем ее и пуляем ОК
                        var json = {
                            answer: {
                                from: senderId,
                                to: receiverId,
                                cell: cell,
                                value: value,
                                users: game.users,
                                whoMove: game.whoMove,
                                win: game.winPosition
                            },
                            game: game,
                            messages: {
                                winner: winner,
                                loser: loser
                            },
                            isOver: true
                        };

                        json['answer']['to'] = receiverId;
                        callback(null, json);
                    } else {
                        log.error('FATAL! No winner and loser object, when game is over!')
                        callback(true);
                    }

                    //Game.publishDestroy(game.id);
                    //и похер на ответ о удалении)
                    // а игра у нас удалится в leave
                    callback(null, json);
                } else {
                    //сохраняем игру и делаем ход
                    game.save()
                        .then(function(newGame) {
                            //var senderId = User.getId(req),
                            json = {
                                answer: {
                                    from: senderId,
                                    to: receiverId,
                                    cell: cell,
                                    value: value,
                                    users: newGame.users,
                                    whoMove: newGame.whoMove
                                },
                                isOver: false
                            };

                            callback(null, json);
                        })
                        .fail(function(err) {
                            log.error('FATAL! Cant save game in move!\n Err:', err);
                            callback(true, Game.errorMessage('Не удалось совершить ход, повторите попытку'), 5);
                        });
                }
            }
        ],
            //конечный коллбек
            function(err, result) {
                if (err) {
                    if (_.isObject(err)) {
                        log.info('err back in move, send json:\n', err);
                        return res.json(err);
                    } else {
                        log.info('err back in move, send ok');
                        return res.ok();
                        //res.badRequest();
                    }
                } else {
                    if (_.isObject(result)) {
                        var socket = sails.sockets,
                            response = Game.responseJSON(result.answer),
                            currentGame = result.game;
                        //это для наблюдателей
                        log.info('send a move message to watcher gameId:', gameId);
                        socket.broadcast(gameId, 'move', response);
                        //это для противника
                        socket.broadcast(result.answer.to, 'move', response);
                        if (aiMove) {
                            //шлем чуваку, который играет с копмпом
                            socket.broadcast(User.getId(req), 'move', response);
                        }
                        if (result.isOver) {
                            //игра окончена шлем мессаги о победе
                            try {
                                //сносим игру, и шлем месаги
                                //если ты вотчер то, все хватит зырить
                                if (!Game.isGamePlayer(currentGame.users, User.getId(req))) {
                                    req.socket.leave(currentGame.id);
                                }
                                Game.destroy(currentGame.id).exec(function(err) {
                                    try {
                                        if (err) {
                                            //похер на ошибку
                                            log.error('Cant remove game in move id: ', currentGame.id, ' error: ', err);
                                        }
                                        Game.publishDestroy(currentGame.id);
                                        var winner = result.messages.winner,
                                            loser = result.messages.loser;
                                        //броадкастим месаги
                                        //первым делом должна уйти месага о шаге! т.к. если мы пошлем сначала месагу об окончании игры
                                        //то сработает отписка отписка от сокетов!
                                        //профиль
                                        User.broadcastProfile(winner.receiver, winner.profile);
                                        User.broadcastProfile(loser.receiver, loser.profile);
                                        //гаме овер
                                        Game.broadcastTimeover(winner.receiver, winner.timeover);
                                        Game.broadcastTimeover(loser.receiver, loser.timeover);
                                        //вотчерам
                                        Game.broadcastTimeover(gameId, winner.timeover);
                                        //Game.publishDestroy(currentGame.id);
                                    } catch (e) {
                                        sails.log.error('Ecxeption Cant remove game id: ', currentGame.id, ' error: ', e);
                                    }

                                });
                            } catch (e) {
                                log.error('FATAL! Cant send game over message to clients! \nErr: ', e);
                            }
                        }
                        //пославшему шаг шлем ответ в колбек
                        return res.json(response);
                    } else {
                        return res.ok();
                    }
                }
            }
        );
    },

    /**
     * Контроллер окончания времени хода
     * @param req
     * @param res
     */
    timeover: function(req, res) {
        var gameId = req.param('gameId'),
            userId = User.getId(req);

        //запускаем водопад
        async.waterfall([
            //проверяем входные данные
            function(callback) {
                if (gameId && req.isSocket && userId) {
                    //все ок, пошли грузить игру
                    callback(null);
                } else {
                    callback(true);
                }
            },

            //подргужаем игру
            function(callback) {
                Game.findById(gameId)
                    .then(function(gameObj) {
                        var game = (_.isArray(gameObj)) ? gameObj.pop() : false;

                        if (game && game.users) {
                            callback(null, game);
                        } else {
                            log.warning('Timeover game, error find by id:', gameId, 'userId:', userId);
                            callback(true);
                        }

                    })
                    .fail(function(err) {
                        log.error('Cant find game by id ', gameId, 'to timeover event\n Err:', err);
                        callback(true);
                    });
            },

            //игра найдена, идем дальше
            function(game, callback) {
                if (!Game.isGamePlayer(game.users, userId)) {
                    // ты не игрок и поэтому твои месаги нас не интересуют
                    log.info('Timeover message from watcher, userId:', userId, ', return:', req.session.User.social_id);
                    callback(true);
                    return;
                }

                if (game.isOver) {
                    //игра уже закончена, выходим
                    callback(true);
                    return;
                } else {
                    //сразу сохраним что она закончилась, чтобы когда придет месага от второго юзера, не мучать дальше базу
                    game.isOver = true;
                    game.save();
                    log.info('Save game over in timeover');
                }

                var winnerId = 0,
                    loserId = 1,
                    message = '';

                if (game.whoMove == game.users[0].id) {
                    //проиграл первый чувак
                    message = 'Время закончилось! Нолики выиграли.';
                    winnerId = 1;
                    loserId = 0;
                } else if (game.whoMove == game.users[1].id) {
                    message = 'Время закончилось! Крестики выиграли.';
                }

                //запускаем парралельные таски на обновления юзеров
                //затем в результирующей прокидываем дальше в водопад, помимо обновленной модели игры, данные по каждому юзеру о победе
                //т.е. ту инфу что в кончном итоге должна будет уйти на клиента
                async.parallel({
                        //обновляем победителя (либо первого пользователя, в случае ничьи
                        winner: function(cbParallel) {
                            var changes = {},
                                winnerObjToBroadcast = {},
                                winnerUser;

                            if (winnerId != -1) {
                                //не ничья, обновляем победителя
                                User.updateWinner(game.users[winnerId].id, game.bet)
                                    .then(function(userObj) {
                                        var winner = userObj.user,
                                            profile = userObj.profile;
                                        var winnerObjToBroadcast = {
                                            //id of reveiver
                                            receiver: winner.id,
                                            //message to profile
                                            profile: profile,
                                            //это общее событие у нас об окончании игры (м.б. лучше назвать gameover?)
                                            timeover: {
                                                message: message
                                            }
                                        };
                                        cbParallel(null, {
                                            user: winner,
                                            message: winnerObjToBroadcast
                                        });
                                    }).
                                    fail(function() {
                                        //поидее такого гоуна не должно произойти, но на всяикй случай, и кидаем ереро
                                        log.error('FATAL: cant update winner in timeover');
                                        callback(true, null);
                                    });
                            }
                        },

                        //обновляем лузера
                        loser: function(cbParallel) {
                            if (loserId != -1) {
                                User.updateLoser(game.users[loserId].id, game.bet)
                                    .then(function(loserObj) {
                                        var loser = loserObj.user,
                                            profile = loserObj.profile,
                                            loserObjToBroadcast = {
                                                //id of reveiver
                                                receiver: loser.id,
                                                //message to profile
                                                profile: profile,
                                                //это общее событие у нас об окончании игры (м.б. лучше назвать gameover?)
                                                timeover: {
                                                    message: message
                                                }
                                            };
                                        cbParallel(null, {
                                            user: loser,
                                            message: loserObjToBroadcast
                                        });
                                    })
                                    .fail(function() {
                                        //поидее такого гоуна не должно произойти, но на всяикй случай, и кидаем ереро
                                        log.error('FATAL: cant update loser in timeover');
                                        callback(true, null);
                                    });
                            }
                        }
                    },
                    //финальный колбек парралельности
                    function(err, result) {
                        //все таски выполнились
                        //на эрор нам тут как бы посрать
                        //вазываем главный колбекс водопада
                        //result должен быть массив из двух юзеров - победителя и проигравшего
                        if (err) {
                            // беда, но такого быть не должно
                            //todo: может в таких случаях прокидывать тогда текущее состояние юзера?
                            callback(true);
                            return;
                        }
                        game.users = [].concat(result.winner.user, result.loser.user);
                        //архивируем игру
                        callback(null, game, result.winner.message, result.loser.message);
                        /*ArchiveGame.create({
                         history: game.toJSON(),
                         gameId: game.id
                         })
                         .then(function() {
                         log.info('Game ', game.id, ' Archived');
                         //вызываем гланый коллбек и передаем нужную инфу
                         callback(null, game, result.winner.message, result.loser.message);
                         })
                         .fail(function(err) {
                         log.error('Cant move game ', gameId, 'to Archive\nErr:', err);
                         //вызываем гланый коллбек
                         callback(null, game, result.winner.message, result.loser.message);
                         });*/
                    });
            },

            // все ок, подготавливаем ответ
            function(game, winner, loser, callback) {
                if (_.isObject(winner) && _.isObject(loser)) {
                    //все игра закончилась, удаляем ее и пуляем ОК
                    var json = {
                        game: game,
                        messages: {
                            winner: winner,
                            loser: loser
                        },
                        isOver: true
                    };

                    callback(null, json);
                } else {
                    log.error('FATAL! No winner and loser object, when time is over!')
                    callback(true);
                }

            }
        ],
            //финальный колбек
            function(err, result) {
                if (err) {
                    res.forbidden();
                } else {
                    //все ок
                    if (_.isObject(result)) {
                        var currentGame = result.game;

                        if (result.isOver) {
                            //игра окончена шлем мессаги о победе
                            try {
                                //сносим игру, и шлем месаги
                                sails.log.debug('remove gameId: ', currentGame.id);

                                if (!Game.isGamePlayer(currentGame.users, User.getId(req))) {
                                    req.socket.leave(currentGame.id);
                                }
                                Game.destroy(currentGame.id).exec(function(err, rec) {
                                    try {
                                        if (err) {
                                            //похер на ошибку
                                            log.error('Cant remove game in timeover id: ', currentGame.id, ' \nerror: ', err);
                                        }
                                        Game.publishDestroy(currentGame.id);
                                        var winner = result.messages.winner,
                                            loser = result.messages.loser;
                                        //броадкастим месаги
                                        //профиль
                                        User.broadcastProfile(winner.receiver, winner.profile);
                                        User.broadcastProfile(loser.receiver, loser.profile);
                                        //гаме овер
                                        Game.broadcastTimeover(winner.receiver, winner.timeover);
                                        Game.broadcastTimeover(loser.receiver, loser.timeover);
                                        //вотчерам
                                        Game.broadcastTimeover(gameId, winner.timeover);
                                        //если ты вотчер то, все хватит зырить
                                    } catch (e) {
                                        sails.log.error('Exception Cant remove game id: ', currentGame.id, 'from userId: ', User.getId(req), ' error: ', e);
                                    }
                                });
                            } catch (e) {
                                log.error('FATAL! Cant send game over message to clients in timeover! \nErr: ', e);
                            }
                        }
                        return res.ok();
                    } else {
                        return res.ok();
                    }
                }
            }
        );
    },

    active: function(req, res) {
        var bet = parseInt(req.param('bet'));

        if (bet >= 25) {
            async.waterfall([
                //проверим наличие бабла у чувака
                function(callback) {
                    var userId = User.getId(req);
                    if (userId) {
                        User.findById(userId)
                            .then(function(result) {
                                if (result && _.isArray(result) && _.size(result)) {
                                    var user = result.pop();
                                    if (user.coins >= bet) {
                                        //все ок понеслась
                                        callback(null);
                                    } else {
                                        callback("Error: not enough money to join game", null);
                                    }
                                }
                            })
                            .catch(function(err) {
                                callback(err, null);
                            })
                    } else {
                        callback("Error: not enough money to join game", null);
                    }
                },

                //дергаем игру
                function(callback) {
                    Game.native(function (err, collection) {
                        if (err) {
                            callback('Game get queue redis err\n: ' + err, null);
                        } else {
                            var key = "active:game:" + bet;
                            collection.spop(key, function(err, result) {
                                if (err) {
                                    callback('Game get queue redis err\n: ' + err, null);
                                }
                                if (result) {
                                    //есть активная игра, идем дальше
                                    callback(null, result);
                                } else {
                                    callback('No active games with bet: ' + bet, null);
                                }
                            });
                        }
                    });
                },

                function(gameId, callback) {
                    sails.log.debug('active_game from redis', gameId);
                    if (gameId) {
                        Game.findById(gameId)
                            .then(function(result) {
                                if (result && _.isArray(result) && _.size(result)) {
                                    var game = result.pop();
                                    callback(null, game);
                                } else {
                                    callback('Game not found', null);
                                }
                            })
                            .catch(function(err) {
                                callback(err, null);
                            })
                    } else {
                        callback('Game not found', null);
                    }
                }
            ],
                //конечный колбек
                function(err, result) {
                    if (err) {
                        sails.log.info("GetActiveGame err:\nErr:", err);
                        return res.ok();
                    } else if (result) {
                        return res.json(result)
                    }

                    return res.ok();
                });
        } else {
            //проверка все равно будет в джойне
            return res.ok();
        }
    },

    tables: function(req, res) {
        return res.json(sails.config.tables.vk);
    }
};

