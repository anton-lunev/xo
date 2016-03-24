/**
 * AdminController
 *
 * @description :: Server-side logic for managing admins
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var bcrypt = require('bcrypt');

module.exports = {

    auth: function(req, res) {
        sails.log.info('Admin auth');
        req.session.Admin = null;
        return res.view({
            layout: 'admin/authLayout'
        });
    },

    login: function(req, res) {
        var login = req.param('login'),
            password = req.param('password');

        if (login && password) {
            Admin.findOne({
                login: login
            }).exec(function(err, admin) {

                if (err) {
                    sails.log.error('Error to find admin', err);
                    return res.redirect('/admin/auth');
                }

                if (admin && admin.id) {
                    bcrypt.compare(password, admin.password, function(err, valid) {
                        if (err) {
                            sails.log.error('Error to compare hash', err);
                            return res.redirect('/admin/auth');
                        }

                        if(valid) {
                            req.session.Admin = admin;
                            req.session.socket_id = sails.sockets.id(req.socket);
                            sails.log.info('Success auth', req.session.Admin);
                            return res.redirect('/admin/main');
                        } else {
                            return res.redirect('/admin/auth');
                        }
                    });
                } else {
                    return res.redirect('/admin/auth');
                }
            });
        } else {
            return res.redirect('/admin/auth');
        }
    },

    main: function(req, res) {
        sails.log.info('render main admin view');
        return res.view({
            layout: 'admin/adminLayout'
        });
    }
};

