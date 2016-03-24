/**
 * Очередь для отложенных вызовов
 * думаю пожет пригодится
 * @url http://stackoverflow.com/questions/3583724/how-do-i-add-a-delay-in-a-javascript-loop
 */

module.exports = {

    queue: [],

    index: 0,

    defaultDelay: 3000,

    init: function(defaultDelay) {
        this.queue.length = 0;
        this.index = 0;
        this.defaultDelay = defaultDelay;
    },

    add: function(fn, delay) {
        this.queue.push({
            fn: fn,
            delay: delay
        });
    },

    run: function(index) {
        (index || index === 0) && (this.index = index);
        var self = this;
        setTimeout(function() {
            self.next();
        }, this.queue[0].delay || this.defaultDelay);
    },

    next: function() {
        var self = this
            , i = this.index++
            , at = this.queue[i]
            , next = this.queue[this.index];
        if (!at) return;
        at.fn();
        next && setTimeout(function() {
            self.next();
        }, next.delay || this.defaultDelay);
    },

    reset: function() {
        this.index = 0;
    },

    finish: function(cb) {
        _.isFunction(cb) && cb();
    }
};

