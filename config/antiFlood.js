/**
 * Конифиг антифлуда
 *
 * @author alunev
 * @class
 */

var Q = require('q');

module.exports.antiFlood = {
    config: {
        badPatterns: [],
        goodPatterns: [],
        goodWords: []
    },

    getConfig: function () {
        var def = Q.defer(),
            t = this;

        if (!t.config.badPatterns.length) {
            AntiFlood.find().limit(1).exec(function(err, config) {
                if (err) {
                    sails.log.error('Error to get antiflood config', err);
                    def.reject();
                }
                var conf = config[0];
                t.config = {
                    badPatterns: conf.badPatterns,
                    goodPatterns: conf.goodPatterns,
                    goodWords: conf.goodWords
                };
                def.resolve(t.config);
            })
        } else {
            def.resolve(t.config);
        }
        return def.promise;
    }
};
