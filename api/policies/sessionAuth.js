/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */
module.exports = function(req, res, next) {

    try {
        if (req.session && req.session.authenticated) {
            return next();
        }

        // User is not allowed
        // (default res.forbidden() behavior can be overridden in `config/403.js`)
        return res.forbidden('You are not permitted to perform this action.');
    } catch (e) {
        sails.log.error('POLICY_ERROR: sessAuth', e);
        return res.forbidden('You are not permitted to perform this action.');
    }
};
