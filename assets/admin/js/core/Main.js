/**
 * Класс инициализатор компонентов админки
 *
 * @author aosipov
 * @task
 * @class
 */


(function(io) {
    function log() {
        if (typeof console !== 'undefined') {
            console.log.apply(console, arguments);
        }
    }
    window.log = log;
    var socket = io.connect();

    socket.on('connect', function() {
        socket.get('/logger/subscribe');
    });

    socket.on('disconnect', function() {
        socket.get('/logger/unsubscribe');
    });

    $(document).ready(function() {
        new XO.admin.Nav();
        new XO.admin.Onlines();
    });
})(window.io);
