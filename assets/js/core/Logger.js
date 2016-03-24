/**
 * Логгер
 *
 * @author aosipov
 */
(function(io) {
    var socket = io.connect();
    function log() {
        if (typeof console !== 'undefined') {
            var args = Array.prototype.slice.call(arguments);
            args = [].concat(args, ['UA: ' + navigator.userAgent]);
            console.log.apply(console, arguments);
        }
        socket.post('/logger/', {message: args});
    }
    window.log = log;
})(window.io);
