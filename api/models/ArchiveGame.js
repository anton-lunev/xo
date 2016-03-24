/**
 * ArchiveGame.js
 *
 * @description Архив сыгранных игр
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    attributes: {
        history: {
            type: 'json'
        },

        gameId: {
            type: 'string'
        }
    }
};

