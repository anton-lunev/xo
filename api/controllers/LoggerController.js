/**
 * LoggerController
 *
 * @description :: Server-side logic for managing loggers
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

    message: function(req, res) {
        var message = req.param('message'),
            sock_id = true;
        if (message) {
            //sails.sockets.emit
            sails.sockets.broadcast('Logger', {
                log: message,
                from: (req.session.User && req.session.User.social_id) ? req.session.User.social_id : '' ,
                date: getLogDate(),
                onlines: sails.sockets.subscribers('onlines')
            });
        } else {
            sails.log.error('cant publish:', message, sock_id);
        }
        return res.ok();
    },

    subscribe: function(req, res) {
        req.socket.join('Logger');
        sails.sockets.broadcast('Logger', {
            onlines: sails.sockets.subscribers('onlines')
        });
        return res.json({
            success: true
        });
    },

    unsubscribe: function(req, res) {
        sails.sockets.leave(req.socket, 'Logger');
        return res.json({
            success: true
        });
    },

    onlines: function(req, res) {
        sails.sockets.broadcast('Logger', {
            onlines: sails.sockets.subscribers('onlines')
        });
        return res.json({
            success: true
        });
    }
};
function getLogDate() {
    var today = new Date(),
        dd = today.getDate(),
        mm = today.getMonth() + 1, //January is 0!
        yyyy = today.getFullYear(),
        hh = today.getHours(),
        mi = today.getMinutes(),
        ss = today.getSeconds();

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    if (hh < 10) {
        hh = '0' + hh;
    }

    if (mi < 10) {
        mi = '0' + mi;
    }

    if (ss < 10) {
        ss = '0' + ss;
    }

    today = dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + mi + ':' + ss;
    return today;
}
