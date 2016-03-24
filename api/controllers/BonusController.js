/**
 * BonusController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var moment = require('moment');

module.exports = {

    getBonus: function(req, res) {
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
                    if (!user.just_created &&
                        (!user.last_bonus || moment(user.last_bonus).format('D') !== moment(user.last_visit).format('D'))
                    ) {

                        var bonus = Math.round(Math.random() * 90) + 10;
                        user.last_bonus = new Date();
                        user.coins += bonus;
                        user.save();

                        sails.sockets.broadcast(user.id, 'profile', {
                            coins: user.coins
                        });

                        return res.json(bonus);
                    } else {
                        return res.json({
                            error: {
                                error_msg: 'Bonus already got',
                                error_code: 1
                            }
                        });
                    }
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
    }
};

