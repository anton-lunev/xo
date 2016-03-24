/**
 * AauthController
 *
 * @description :: Server-side logic for managing vkauths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var VkDriver = require('../services/VkDriver');
var async = require('async');

module.exports = {

    /**
     * Авторизация через ВК
     * @param req
     * @param res
     * @param next
     */
    vk: function (req, res, next) {
        var token = req.param('access_token') || undefined,
            socialId = req.param('viewer_id') || undefined;

        if (token && socialId) {
            //создаем или находим юзера
            var vk = VkDriver(token);
            try {
                async.waterfall([
                    function (callback) {
                        //сначала поищем по соц айди, если нет, то будем получать инфу
                        //todo: учитывая что в европе с апи проблемы делаем пока так
                        sails.log.info('Get user go to install or go render social_id:', socialId);
                        User.findOne({social_id: socialId}).exec(function(err, user) {
                            try {
                                if (!err && user) {
                                    Cohort.increment(user.id, 'login');
                                    User.updateLastVisit(user);
                                    callback(null, user);
                                } else {
                                    vk('users.get', {fields: 'sex, photo_100, bdate'}, function(data) {
                                        try {
                                            if (_.isArray(data) && data.length && data[0].id) {
                                                var loadedUser = data[0];
                                                sails.log.info('SocialUser:', loadedUser);
                                                loadedUser.social_id = loadedUser.id;
                                                delete loadedUser.id;
                                                User.create({social_id: socialId}, loadedUser, function (err, user) {
                                                    if (err) {
                                                        sails.log.error('User.create error! social_id:', socialId, ' err: ', err);
                                                        callback({error: "Can't create user"});
                                                    }
                                                    //все ок
                                                    callback(null, user);
                                                });
                                            } else {
                                                callback({
                                                    error: "Can't load user by VK API",
                                                    data: data
                                                });
                                            }
                                        } catch (e) {
                                            sails.log.error('Auth API exception:', e);
                                            callback({
                                                error: "Can't load user by VK API",
                                                data: data
                                            });
                                        }

                                    });
                                }
                            } catch (e) {
                                sails.log.error('Auth exception:', e);
                                callback({
                                    error: "Can't load user by VK API",
                                    data: data
                                });
                            }

                        });
                    }
                ], function (err, user) {
                    if (err) {
                        sails.log.error('Load user error!:', err);
                        return res.forbidden('You are not permitted to perform this action.');
                    }
                    var gameId = req.param('request_key') || '';
                    // устаналвиваем сессию и прочее
                    req.session.authenticated = true;
                    req.session.User = user;
                    sails.log.info('Ref: ', gameId);
                    //проверим и сохраним реф
                    Ref.saveRef(req, user);
                    if (gameId != '') {
                        //есть реф, проверим его, может игра уже закончилась либо идет
                        Game.findById(gameId)
                            .then(function(responce) {
                                var game = (_.isArray(responce)) ? responce.pop() : false;
                                if (game && !game.isOver) {
                                    sails.log.info('ref game info:', game);
                                    if ((game.users && _.isArray(game.users) && game.users.length == 1)) {
                                        // все ок
                                        sails.log.info('Ref checked go to game');
                                        return res.view('lobby/lobby', {
                                            User: user,
                                            ref: {
                                                gameId: gameId
                                            }
                                        });
                                    }
                                    // игра уже идет, реф не прокидываем
                                    sails.log.info('Ref game already started');
                                    return res.view('lobby/lobby', {
                                        User: user,
                                        ref: {
                                            gameId: ''
                                        }
                                    });
                                } else  {
                                    // игра уже может и закончилась
                                    sails.log.info('Ref game is already over');

                                    return res.view('lobby/lobby', {
                                        User: user,
                                        ref: {
                                            gameId: ''
                                        }
                                    });
                                }
                            })
                            .fail(function(err) {
                                sails.log.error('Find game by ref error: ', err);

                                return res.view('lobby/lobby', {
                                    User: user,
                                    ref: {
                                        gameId: ''
                                    }
                                });
                            });

                    } else {
                        sails.log.info('No ref go lobby');
                        return res.view('lobby/lobby', {
                            User: user,
                            ref: {
                                gameId: ''
                            }
                        });
                    }
                });
            } catch (e) {
                sails.log.error('Auth social_id:', socialId, ' exception:', e);
                return res.badRequest();
            }

        } else {
            sails.log.error('Auth failed! Unknown socialId or token:', socialId, token);
            res.forbidden();
        }
    }
};

