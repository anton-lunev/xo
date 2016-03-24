/**
 * TopController
 *
 * Контроллер для топов
 *
 * @description :: Server-side logic for managing tops
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
    /**
     * Возвращает топ друзей (/top/friends/)
     * @param req
     * @param res
     */
    friends: function(req, res) {
        var uids = req.param('uids') || "",
            socialIds = uids.split(','),
            response = {};

        if (socialIds.length) {
            try {
                User.find({
                    where: {
                        social_id: socialIds,
                        sort: 'win DESC'
                    }})
                    .exec(function(err, friends) {
                        if (err) {
                            response = {
                                error: {
                                    error_msg: 'No friends',
                                    error_code: 12

                                }
                            };
                            return res.json(response);
                        } else {
                            response = {
                                response: friends
                            };
                            return res.json(response);
                        }
                    });
            } catch (e) {
                sails.log.error('Get top friends exception:', e);
                response = {
                    error: {
                        error_msg: 'No friends',
                        error_code: 11

                    }
                };
                return res.json(response);
            }
        } else {
            response = {
                error: {
                    error_msg: 'No friends',
                    error_code: 11

                }
            };
            return res.json(response);
        }
    },

    /**
     * Топ всех пользователей
     *
     * @param req
     * @param res
     */
    all: function(req, res) {
        var response = {};

        try {
            User.find({
                where: {
                    limit: 100,
                    sort: 'win DESC'
                }})
                .exec(function(err, users) {
                    if (err) {
                        sails.log.error('Can not find top users:', err);
                        response = {
                            error: {
                                error_msg: 'No friends',
                                error_code: 13

                            }
                        };
                        return res.json(response);
                    } else {
                        response = {
                            response: users
                        };

                        return res.json(response);
                    }

                });
        } catch (e) {
            sails.log.error('Get top users exception:', e);
            response = {
                error: {
                    error_msg: 'No users',
                    error_code: 14

                }
            };
        }
    }
};

