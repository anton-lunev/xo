/**
 * PaymentController
 * Контроллер платежей
 *
 * @description :: Server-side logic for managing Payments
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var SigGenerator = require('../services/SigGenerator');

module.exports = {

    price: function(req, res) {
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
        return res.json(params);
    },

    /**
     * Колллбек от ВК при оплате
     * @param req
     * @param res
     */
    secure_callback: function(req, res) {
        var item = req.param('item'),
            notificationType = req.param('notification_type'),
            response = {},
            params = req.params.all();

        if (!SigGenerator.check(params)) {
            response = {
                'error': {
                    'error_code': 10,
                    'error_msg': 'Несовпадение вычисленной и переданной подписи запроса.',
                    'critical': true
                }
            };
            sails.log.info('Order. Item: ', item, 'type: ', notificationType, 'response:', response);
            return res.json(response);
        } else {
            switch (notificationType) {
                case 'get_item':
                    response = Payment.getItemsInfo(item);
                    sails.log.info('Order. Item: ', item, 'type: ', notificationType, 'response:', response);
                    return res.json(response);
                    break;

                case 'get_item_test':
                    response = Payment.getItemsInfo(item);
                    sails.log.info('Order. Item: ', item, 'type: ', notificationType, 'response:', response);
                    return res.json(response);
                    break;

                case 'order_status_change':
                    // Изменение статуса заказа
                    Payment.getStatusChange(params)
                        .then(function(response) {
                            sails.log.info('Order. Item: ', item, 'type: ', notificationType, 'response:', response);
                            return res.json(response)
                        });
                    break;

                case 'order_status_change_test':
                    // Изменение статуса заказа в тестовом режиме
                    Payment.getStatusChange(params)
                        .then(function(response) {
                            sails.log.info('Order. Item: ', item, 'type: ', notificationType, 'response:', response);
                            return res.json(response)
                        });
                    break;
                default:
                    response = {
                        'response': {
                            'error_code': 100,
                            'error_msg': 'Bad params passed.',
                            'photo_url': config.photoUrl,
                            'critical': true
                        }
                    };
                    sails.log.info('Order. Item: ', item, 'type: ', notificationType, 'response:', response);
                    return res.json(response);
            }
        }
    }
};
