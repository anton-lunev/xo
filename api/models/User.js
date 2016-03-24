/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */
var VkDriver = require('../services/VkDriver');
var Q = require('q');

module.exports = {

    attributes: {
        social_id: {
            type: 'string'
        },
        sex: 'string',
        photo_100: 'string',
        first_name: 'string',
        last_name: 'string',
        bdate: 'string',
        coins: {
            type: 'integer',
            defaultsTo: 100
        },

        minutes: {
            type: 'integer',
            defaultsTo: 1
        },

        win: {
            type: 'integer',
            defaultsTo: 0
        },
        lose: {
            type: 'integer',
            defaultsTo: 0
        },
        draw: {
            type: 'integer',
            defaultsTo: 0
        },

        last_visit: {
            type: 'datetime',
            defaultsTo: function() {
                return new Date();
            }

        },

        last_bonus: 'datetime',

        moveSymbol: "string",

        /*games: {
            collection: 'game',
            via: 'users'
        },*/

        is_novice: {
            type: 'boolean',
            defaultsTo: true
        },

        just_created: {
            type: 'boolean',
            defaultsTo: true
        },

        getId: function() {
            return this.id;
        },

        getSocialId: function() {
            return this.social_id;
        }
    },

    setLevel: function(user) {
        try {
            var config = sails.config.app.vk.prod,
                vk = VkDriver(config.app_id, config.secret);
            sails.log.info('setLevel:', {levels: user.social_id + ':' + user.win});
            vk('secure.setUserLevel', {levels: user.social_id + ':' + user.win}, function(res) {
                //stub
            });
        } catch (e) {
            sails.log.err('secure.setUserLevel', e);
        }
    },

    /**
     * Получаем юзера из сессии
     * @param request
     */
    getId: function(request) {
        if (request && request.session && request.session.User && request.session.User.id) {
            return request.session.User.id
        }
        sails.log.debug('User lost session');
        return false;
    },

    /**
     * Броадкастим по сокету инфу об обновлении профиля
     * @param to
     * @param msg
     */
    broadcastProfile: function(to, msg) {
        if (to && msg) {
            sails.sockets.broadcast(to, 'profile', msg);
        }
    },

    /**
     * Пишем когорту
     *
     * @param user
     * @param type
     */
    setCohortStat: function(user, type) {
        //пишем когорту
        switch(type) {
            case 'win':
                if (user.win == 0) {
                    Cohort.increment(user.id, type + '_one_game');
                }
                break;
            case 'lose':
                if (user.lose == 0) {
                    Cohort.increment(user.id, type + '_one_game');
                }
                break;
            default:
                if (user.draw == 0) {
                    Cohort.increment(user.id, 'draw_one_game');
                }
        }

        if (user.win == 0 &&  user.lose == 0 && user.draw == 0) {
            Cohort.increment(user.id, 'played_one_game');
        }

        if (user.win + user.lose + user.draw + 1 == 3) {
            Cohort.increment(user.id, 'played_three_games');
        }

        if (user.win + user.lose + user.draw + 1 == 10) {
            Cohort.increment(user.id, 'played_ten_games');
        }
    },
    /**
     * Обновляем победителя
     * @param id
     * @param bet
     * @returns {promise|Deferred.promise|Q.promise}
     */
    updateWinner: function(id, bet) {
        var def = Q.defer(),
            log = sails.log;
        if (id && bet) {
            User.findOne(id)
                .then(function(winner) {
                    User.setCohortStat(winner, 'win');
                    winner.win = parseInt(winner.win) + 1;
                    winner.coins = parseInt(winner.coins) + parseInt(bet);
                    if (winner.is_novice && (winner.win > 3 || winner.lose > 3)) {
                        winner.is_novice = false;
                    }
                    if (winner.just_created) {
                        winner.just_created = false;
                    }
                    var changes = {
                        coins: '+' + bet,
                        win: '+1'
                    };

                    User.setLevel(winner);

                    winner.save().then(function() {
                        def.resolve({
                            user: winner,
                            profile: {
                                changed: changes,
                                win: winner.win,
                                lose: winner.lose,
                                draw: winner.draw,
                                coins: winner.coins
                            }
                        });
                    }).fail(function() {
                        // ну значит не повезло)
                        def.resolve({
                            user: winner,
                            profile: {
                                changed: changes,
                                win: winner.win,
                                lose: winner.lose,
                                draw: winner.draw,
                                coins: winner.coins
                            }
                        })
                    });
                })
                .fail(function(err) {
                    sails.log.error('FATAL: Update a winner user (', id ,') error:\n', err);
                    def.reject();
                });
        } else {
            sails.log.error('FATAL: Update a winner no id passed');
            def.reject();
        }

        return def.promise;
    },

    /**
     * Обвноляем лузера
     * @param id
     * @param bet
     * @returns {promise|Deferred.promise|Q.promise}
     */
    updateLoser: function(id, bet) {
        var def = Q.defer(),
            log = sails.log;
        if (id && bet) {
            User.findOne(id)
                .then(function(loser) {
                    User.setCohortStat(loser, 'lose');
                    loser.lose = parseInt(loser.lose) + 1;
                    loser.coins = parseInt(loser.coins) - parseInt(bet);
                    if (loser.is_novice && (loser.win > 3 || loser.lose > 3)) {
                        loser.is_novice = false;
                    }
                    if (loser.just_created) {
                        loser.just_created = false;
                    }

                    var changes = {
                        coins: '-' + bet,
                        lose: '+1'
                    };

                    loser.save().then(function() {
                        def.resolve({
                            user: loser,
                            profile: {
                                changed: changes,
                                win: loser.win,
                                lose: loser.lose,
                                draw: loser.draw,
                                coins: loser.coins
                            }
                        });
                    }).fail(function() {
                        // ну значит не повезло)
                        def.resolve({
                            user: loser,
                            profile: {
                                changed: changes,
                                win: loser.win,
                                lose: loser.lose,
                                draw: loser.draw,
                                coins: loser.coins
                            }
                        })
                    });
                })
                .fail(function(err) {
                    sails.log.error('FATAL: Update a loser user (', id ,') error:\n', err);
                    def.reject();
                });
        } else {
            sails.log.error('FATAL: Update a loser no id passed');
            def.reject();
        }

        return def.promise;
    },

    /**
     * Обновляем ничью
     * @param id
     * @returns {promise|Deferred.promise|Q.promise}
     */
    updateDraw: function(id) {
        var def = Q.defer(),
            log = sails.log;
        if (id) {
            User.findOne(id)
                .then(function(drawer) {
                    User.setCohortStat(drawer, 'draw');
                    drawer.draw = parseInt(drawer.draw) + 1;

                    if (drawer.is_novice && (drawer.win > 3 || drawer.lose > 3)) {
                        drawer.is_novice = false;
                    }

                    if (drawer.just_created) {
                        drawer.just_created = false;
                    }

                    var changes = {
                        draw: '+1'
                    };

                    drawer.save().then(function() {
                        def.resolve({
                            user: drawer,
                            profile: {
                                changed: changes,
                                win: drawer.win,
                                lose: drawer.lose,
                                draw: drawer.draw
                            }
                        });
                    }).fail(function() {
                        // ну значит не повезло)
                        def.resolve({
                            user: drawer,
                            profile: {
                                changed: changes,
                                win: drawer.win,
                                lose: drawer.lose,
                                draw: drawer.draw
                            }
                        })
                    });
                })
                .fail(function(err) {
                    sails.log.error('FATAL: Update a drawer user (', id ,') error:\n', err);
                    def.reject();
                });
        } else {
            sails.log.error('FATAL: Update a drawer no id passed');
            def.reject();
        }

        return def.promise;
    },

    afterCreate: function(newRec, next) {
        Cohort.increment(newRec.id, 'registration');
        next();
    },

    updateLastVisit: function (user) {
        user.last_visit = new Date();
        sails.log.info('last_visit:', user.last_visit);
        user.save();
    }
};

