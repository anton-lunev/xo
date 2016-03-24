/**
* Ref.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

    connection: 'mysqlServer',

    tableName: 'refs',

    attributes: {

        user_id: {
            type: 'string'
        },

        social_id: {
            type: 'string'
        },

        ref: {
            type: 'string'
        }
    },

    /**
     * Сохраняем реф по которому перешел юзер
     * @param req - реквест
     * @param user
     */
    saveRef: function(req, user) {
        if (req && user) {
            var ref = req.param('referrer'),
                request = req.param('request_key'),
                user_id = user.id,
                social_id = user.social_id;
            sails.log.warn(user_id,  social_id);
            if ((ref && /^ad_/gi.test(ref)) || request) {
                if (ref) {
                    ref = ref.replace('ad_', '');
                } else {
                    ref = 'from_request';
                }

                ref = ref.replace('ad_', '');

                //пишем в реф
                Ref.create({
                    user_id: user_id,
                    social_id: social_id,
                    ref: ref
                })
                    .then(function(res) {
                        sails.log.info('Ref:', ref, 'uid: ', social_id);
                    })
                    .catch(function(err) {
                        sails.log.error('Ref create error:', ref, 'uid: ', social_id, '\nErr:', err);
                    });

                //пишем в когорту, что переход по рефу
                Cohort.increment(user_id, 'from_ref', 1);
            }
        }
    }
};

