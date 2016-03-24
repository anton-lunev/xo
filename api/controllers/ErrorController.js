/**
 * ErrorController
 *
 * @description :: Server-side logic for managing errors
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

    '404': function(req, res) {
        res.locals.layout = 'errorLayout';

        return res.view();
    }
};

