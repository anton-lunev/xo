/**
 * Генератор подписи для контакта
 *
 * @author aosipov
 * @class
 */

var crypto = require('crypto');
var utf8 = require('utf8');

module.exports = {

    /**
     * Генератор подписи
     * @param params
     * @returns {*}
     */
    generate: function(params) {
        if (_.isObject(params)) {
            params = sortObjectByKey(params);
            var str = '';

            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    str += key + '=' + params[key];
                }
            }
            var sig = crypto.createHash('md5').update(str + sails.config.app.vk.prod.secret).digest('hex');
            params['sig'] = sig;
        } else {
            sails.log.error('Can not generate sig for empty params');
        }

        return params;
    },

    /**
     * Проверка подписи на валидность
     * @param params
     * @returns {boolean}
     */
    check: function(params) {
        if (_.isObject(params) && params['sig']) {
            var sig = params['sig'],
                str = '';

            delete params.sig;
            if (params.hasOwnProperty('id')) {
                delete params.id;
            }

            params = sortObjectByKey(params);

            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    str += key + '=' + utf8.encode(params[key]);
                }
            }
            var checkSig = crypto.createHash('md5').update(str + sails.config.app.vk.prod.secret).digest('hex');

            if (checkSig.toString() == sig.toString()) {
                return true;
            }
        }

        return false;
    }
};
/**
 * Сортируем объект по ключам
 *
 * @param obj
 * @returns {{}}
 */
function sortObjectByKey(obj) {
    var keys = [];
    var sorted_obj = {};

    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            keys.push(key);
        }
    }

    // sort keys
    keys.sort();
    // create new array based on Sorted Keys
    _.each(keys, function(key) {
        sorted_obj[key] = obj[key];
    });

    return sorted_obj;
}
