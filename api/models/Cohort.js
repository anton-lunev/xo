/**
 * Cohort.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

var moment = require('moment');

module.exports = {

    connection: 'mysqlServer',

    tableName: 'cohort',

    attributes: {

        user_id: {
            type: 'string'
        },

        event: {
            type: 'string'
        },

        value: {
            type: 'integer',
            defaultsTo: 1
        }
    },

    /**
     * Инкрементим статистику по ключу (филду) статистики
     *
     * @param user_id
     * @param event
     * @param value
     */
    increment: function(user_id, event, value) {

        value = value || '1';

        if (user_id && event) {
            Cohort.create({
                user_id: user_id,
                event: event.toLowerCase(),
                value: value
            })
                .then(function(data) {
                    sails.log.info('Cohort created:', data);
                })
                .fail(function(err) {
                    sails.log.error('Cant insert cohort data: user_id',  user_id, 'event:', event, 'value:', value, ' Err:\n', err);
                });
        } else {
            sails.log.warn('Bad params passed to create cohort record: user_id',  user_id, 'event:', event, 'value:', value);
        }
    }
};

