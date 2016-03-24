/**
 * AntiFloodController
 *
 * @description :: Server-side logic for managing admins
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

    getConfig: function(req, res) {
        AntiFlood.find().limit(1).exec(function(err, config) {
            if (err) {
                sails.log.error('Error to find antiflood config', err);
                return res.ok();
            }

            return res.json(config[0]);
        });
    },

    saveConfig: function(req, res) {
        AntiFlood.find().limit(1).exec(function(err, config) {
            if (err) {
                sails.log.error('Error to find antiflood config', err);
                return res.ok();
            }

            var conf = config[0];
            conf.badPatterns = req.param('badPatterns');
            conf.goodPatterns = req.param('goodPatterns');
            conf.goodWords = req.param('goodWords');
            conf.save();

            sails.config.antiFlood.config = conf;

            return res.json(conf);
        });
    }

};

