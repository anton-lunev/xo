/**
* PaymentHistory.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

    connection: 'redisPayment',

    attributes: {
        user_id: {
            type: 'string'
        },

        social_id: {
            type: 'string'
        },

        old_coins: {
            type: 'string'
        },

        new_coins: {
            type: 'string'
        }/*,

         payment_date: {
         type: 'datetime'
         }*/
    }
};

