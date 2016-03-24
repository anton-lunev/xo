/**
 * Chat.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    connection: 'redisChat',

    attributes: {

        author: {
            type: 'string'
        },

        message: {
            type: 'string'
        },

        user_id: {
            type: 'string'
        }
    },

    /**
     * Формируем ответ клиенту
     * @param msg
     * @returns {{}}
     */
    response: function(msg) {
        var response = {};

        if (_.isObject(msg) && msg.author &&  msg.message) {
            response = {
                response: {
                    message: msg
                }
            }
        } else {
            response = {
                error: {
                    error_msg: 'Bad params passed to chat message'
                }
            }
        }

        return response;
    },

    /**
     * Рассылка месаги в публичный чат
     * @param msg
     */
    publicMessage: function(msg) {
        sails.sockets.broadcast('chat', 'message', msg);
    },

    /**
     * Рассылка в игровую комнату
     * @param room
     * @param msg
     */
    privateMessage: function(room, msg) {
        sails.sockets.broadcast('chat' + room, 'private', msg);
    }
};

