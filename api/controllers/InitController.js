/**
 * InitController
 *
 * @description :: Server-side logic for managing inits
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

    /**
     * Пуляем за один запрос все что нужно
     * @param req
     * @param res
     */
    start: function(req, res) {
        //todo: добавить обработчики ошибок нафик!!!
        async.parallel({
                //профиль
                me: function(cbParallel) {
                    User.findOne({id: req.session.User.id}, function(err, user) {
                        cbParallel(null, user);
                    });
                },

                //мозги
                brain: function(cbParallel) {
                    var fakesIds = ["-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "-9", "-10"];
                    User.find({social_id: fakesIds})
                        .then(function(data) {
                            if (_.isArray(data)) {
                                var ids = _.invoke(data, 'getId');
                            }
                            cbParallel(null, ids);
                        })
                        .fail(function(err) {
                            cbParallel(null, ['547eb3e9907572dc013c1bb7']);
                        });
                },

                configAntiflud: function(cbParallel) {
                    AntiFlood.find().limit(1).exec(function(err, config) {
                        if (err) {
                            sails.log.error('Error to find antiflood config', err);
                            config = [];
                            config.push('');
                        }
                        cbParallel(null, config.pop());
                    });
                },

                chat: function(cbParallel) {
                    Chat.native(function (err, collection) {
                        if (err) {
                            sails.log.info('Chat redis err\n: ', err);
                        } else {
                            collection.lrange('chat', 0, -1, function(err, result) {
                                var mess = [];
                                for (var i = 0; i < result.length; i++) {
                                    mess.push(JSON.parse(result[i]));
                                }

                                cbParallel(null, mess.reverse());
                            });
                        }
                    });
                },

                topAll: function(cbParallel) {
                    User.find({
                        where: {
                            limit: 100,
                            sort: 'win DESC'
                        }})
                        .exec(function(err, users) {
                            var response = {};
                            if (err) {
                                sails.log.error('Can not find top users:', err);
                                response = {
                                    error: {
                                        error_msg: 'No friends',
                                        error_code: 13

                                    }
                                };
                            } else {
                                response = {
                                    response: users
                                };

                            }
                            cbParallel(null, response);
                        });
                },

                tables: function(cbParallel) {
                    cbParallel(null, sails.config.tables.vk);
                },

                price: function(cbParallel) {
                    var params = [],
                        price = sails.config.price.vk;

                    for (var key in price) {
                        if (price.hasOwnProperty(key) && price[key].price) {
                            params.push({
                                coins: price[key].coins,
                                price: price[key].price,
                                itemInfo: {
                                    item: key,
                                    type: 'item'
                                }
                            });
                        }
                    }
                    cbParallel(null, params);
                }
            },
            //финальный колбек парралельности
            function(err, result) {
                return res.json(result);
            });
    }
};

