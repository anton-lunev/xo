/**
 * ChatController - контроллер чата
 *
 * @description :: Server-side logic for managing chats
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

    /**
     * Отправка сообщения в публичный чат
     * @param req
     * @param res
     */
    message: function(req, res) {
        var message = {
            message: ((req.param('message') || '')).substr(0, 200),
            author: req.param('author')
        };
        AntiFlood.checkFlood(message.message).then(function (check) {
            sails.log.info(check);
            if (check) {
                var response = Chat.response(message);
                Chat.native(function (err, collection) {
                    if (err) {
                        sails.log.info('Chat redis err\n: ', err);
                    } else {
                        collection.lpush('chat', JSON.stringify(message), function(err, result) {
                            collection.ltrim('chat', 0, 99);
                        });
                    }
                });
                Chat.publicMessage(response);
                return res.json(response);
            } else {
                return res.ok();
            }
        }).catch(function (err) {
            sails.log.error('FATAL: cant check flood! \nErr: ', err);
            return res.ok();
        });
    },

    /**
     * Список старых сообщений чата (история)
     *
     * @param req
     * @param res
     */
    messages: function(req, res) {
        Chat.native(function (err, collection) {
            if (err) {
                sails.log.info('Chat redis err\n: ', err);
            } else {
                collection.lrange('chat', 0, -1, function(err, result) {
                    var mess = [];
                    for (var i = 0; i < result.length; i++) {
                        mess.push(JSON.parse(result[i]));
                    }

                    return res.json({
                        response: {
                            messages: mess.reverse()
                        }
                    });
                });
            }
        });
    },

    /**
     * Оптавка сообщения в чат, в игре (по сути приват)
     * @param req
     * @param res
     */
    'private': function(req, res) {
        var message = {
            message: ((req.param('message') || '')).substr(0, 200),
            author: req.param('author')
        };
        AntiFlood.checkFlood(message.message).then(function (check) {
            if (check) {
                var gameId = req.param('gameId'),
                    response = Chat.response(message);
                //просто публикуем сообщение без сохранения
                if (gameId) {
                    Chat.privateMessage(gameId, response);
                    return res.json(response);
                } else {
                    return res.ok();
                }
            } else {
                return res.ok();
            }
        }).catch(function (err) {
            sails.log.error('FATAL: cant check flood! \nErr: ', err);
            return res.ok();
        });
    }
};

