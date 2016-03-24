/**
 * Admin.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    attributes: {

        login: {
            type: 'string'
        },
        password: {
            type: 'string'
        },
        comment: {
            type: 'string'
        }
    },

    beforeCreate: function (values, next) {

        // This checks to make sure the password and password confirmation match before creating record
        if (!values.password || !values.login) {
            return next({err: ["Empty password or login"]});
        }

        require('bcrypt').hash(values.password, 10, function passwordEncrypted(err, encryptedPassword) {
            if (err) return next(err);
            values.password = encryptedPassword;
            // values.online= true;
            next();
        });
    }
};

