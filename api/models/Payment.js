/**
 * Payment.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

var Q = require('q');

module.exports = {

    attributes: {
    },

    /**
     * Получение информации о товаре
     * @param item
     * @returns {*}
     */
    getItemsInfo: function(item) {

        var config = sails.config.price.vk;

        if (config.hasOwnProperty(item)) {
            return {
                'response': {
                    'item_id': config[item].item_id,
                    'title': config[item].title,
                    'photo_url': config.photoUrl,
                    'price': config[item].price
                }
            };
        } else {
            return {
                'response': {
                    'error_code': 20,
                    'error_msg': 'Товара не существует.',
                    'photo_url': config.photoUrl,
                    'critical': true
                }
            };
        }

    },

    /**
     * Сама оплата в голосах вк
     * @param params
     * @returns {*}
     */
    getStatusChange: function(params) {
        var config = sails.config.price.vk;
        var def =  Q.defer();
        if (params['status'] == 'chargeable') {
            var order_id = parseInt(params['order_id']),
                item = params['item'],
                coins = 0;

            if (config.hasOwnProperty(item)) {
                coins = config[item].coins;
            } else {
                if (item.indexOf('offer_') === -1) {
                    coins = 0;
                } else {
                    coins = params['item_currency_amount'];
                }
            }

            if (coins > 0) {
                var socialId = params['user_id'];
                if (socialId) {
                    User.findOne({social_id: socialId}).exec(function(err, user) {
                        if (err) {
                            sails.log.error('Cant find user ', socialId, ' to complete payment');
                            def.resolve({
                                'response': {
                                    'error_code': 101,
                                    'error_msg': 'Can not complete payment action.',
                                    'photo_url': config.photoUrl,
                                    'critical': true
                                }
                            });
                        } else if (user){
                            var oldCoins = parseInt(user.coins);
                            user.coins = oldCoins + coins;
                            user.save();
                            // Код проверки товара, включая его стоимость
                            var app_order_id = 1; // Получающийся у вас идентификатор заказа.

                            def.resolve({
                                'response': {
                                    'order_id': order_id,
                                    'app_order_id': app_order_id
                                }
                            });
                            sails.sockets.broadcast(user.id, 'profile', {
                                type: 'profile',
                                coins: user.coins,
                                changed: {
                                    coins: '+' + coins
                                }
                            });
                            //запишим в историю платежей
                            PaymentHistory.create({
                                user_id: user.id,
                                social_id: user.social_id,
                                old_coins: oldCoins,
                                new_coins: user.coins
                            }).exec(function(err, payment) {
                                    if (err) {
                                        sails.log.error('Can not save payment into history');
                                    }
                                });
                        } else {
                            def.resolve({
                                'response': {
                                    'error_code': 102,
                                    'error_msg': 'Can not get user data to complete payment action.',
                                    'critical': true
                                }
                            });
                        }
                    });
                } else {
                    def.resolve({
                        'response': {
                            'error_code': 102,
                            'error_msg': 'Can not get user data to complete payment action.',
                            'critical': true
                        }
                    });
                }
            } else {
                def.resolve({
                    'response': {
                        'error_code': 100,
                        'error_msg': 'Bad params passed.',
                        'photo_url': config.photoUrl,
                        'critical': true
                    }
                });
            }
        } else {

            def.resolve({
                'response': {
                    'error_code': 100,
                    'error_msg': 'Bad params passed.',
                    'photo_url': config.photoUrl,
                    'critical': true
                }
            });
        }
        return def.promise;
    }
};

