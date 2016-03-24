/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

    me: function(req, res) {
        try {
            User.findOne({id: req.session.User.id}, function(err, user) {
                if (err) {
                    sails.log.error('Get profile, find user error:', err);
                    return res.json({
                        error: {
                            error_msg: 'Unknown user',
                            error_code: 1
                        }
                    });
                } else {
                    return res.json(user);
                }
            });
        } catch (e) {
            sails.log.error('Get profile exception:', e);
            return res.json({
                error: {
                    error_msg: 'Unknown user',
                    error_code: 1
                }
            });
        }
    },

    /**
     * Вернет айдиху того юзреа который будет играть за АИ
     * @param req
     * @param res
     */
    brain: function(req, res) {
        // пока тупо подрубаем харкодного юзера
        //todo: вынести в конфиг айдиху
        var fakesIds = ["-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "-9", "-10"];
        User.find({social_id: fakesIds})
            .then(function(data) {
                if (_.isArray(data)) {
                    var ids = _.invoke(data, 'getId');
                }
                return res.json({
                    ids: ids
                });
            })
            .fail(function(err) {
                return res.json({
                    id: '547eb3e9907572dc013c1bb7'
                });
            });
    },

    /**
     * Обновление подписки для юзера после реконекта сервака
     * @param req
     * @param res
     */
    reconnect: function(req, res) {
        //todo: во всех методах сделать проверку на то что запрос от сокета!
        if (!req.isSocket) {
            return res.badRequest();
        }
        if (req.session && req.session.User && req.session.User.id) {
            req.socket.join(req.session.User.id);
            req.socket.join('onlines');
            req.socket.join('document');
            req.socket.join('chat');
            /*var text = (req.session.User.sex == 2) ? 'присоединился ' : 'присоединилась ',
                message = Chat.response({
                    message: 'К нам ' + text + req.session.User.first_name,
                    author: 'Администратор'
                });
            Chat.publicMessage(message);*/
            sails.sockets.broadcast('Logger', {
                onlines: sails.sockets.subscribers('onlines')
            });
        }
        return res.ok();
    },

    disconnect: function(req, res) {
        if (!req.isSocket) {
            return res.badRequest();
        }

        if (req.session && req.session.User && req.session.User.id) {
            req.socket.leave(req.session.User.id);
            req.socket.leave('onlines');
            req.socket.leave('document');
            sails.sockets.broadcast('Logger', {
                onlines: sails.sockets.subscribers('onlines')
            });
        }

        return res.ok();
    },

    fast_fix: function(req, res) {
        User.find().then(function(users) {
            if (_.isArray(users)) {
                for (var i = 0; i < users.length; i++) {
                    users[i].win = parseInt(users[i].win);
                    users[i].lose = parseInt(users[i].lose);
                    users[i].draw = parseInt(users[i].draw);
                    users[i].minutes = parseInt(users[i].minutes);
                    users[i].coins = parseInt(users[i].coins);
                    users[i].save()
                        .fail(function(err) {
                            sails.log.error('Update err: ', users[i].social_id, err);
                        });
                    sails.log.info('User: ', users[i].social_id, ' updated');
                }
            }
            return res.json({
                records: users.length
            });
        });
    },

    createFakes: function(req, res) {
        User.findOne({social_id: '231794740'})
            .then(function(user) {
                if (user) {
                    var fakes = [];
                    for (var i = 1; i < 11; i++) {
                        var newUser = _.extend({}, user);
                        delete newUser.id;
                        newUser.social_id = "-" + i;
                        newUser.win = 0;
                        newUser.lose = 0;
                        newUser.draw = 0;
                        fakes.push(newUser);
                    }
                    User.create(fakes).then(function(users) {
                        sails.log.info('fakes created', users);
                        return res.ok();
                    });

                }
            });
    }
};

