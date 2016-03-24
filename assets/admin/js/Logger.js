/**
 * Обработчик логгера
 *
 * @author aosipov
 */
XO.admin.Logger = Backbone.View.extend({

    template: JST['assets/templates/admin/logger.ejs'],

    el: '.content',

    events: {
        "click .clear": "clearLogs"
    },

    initialize: function() {
        this.model = new Backbone.Model({
            message: null
        });
        this.listenTo(this.model, "change", this.renderLogs);
        this.subscribeEvents();
        this.render();
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
    },

    renderLogs: function() {
        this.$el.find('.log-wrap').prepend(this.template(this.model.attributes));
    },

    subscribeEvents: function() {
        io.socket.removeListener('message', this.onMessage);
        io.socket.on('message', _.bind(this.onMessage, this));
    },

    onMessage: function(msg) {
        var t = this;
        log('on message in logger, ', msg);
        if (msg && msg.log) {
            var $filter = t.$('#filter');
            msg.text = XO.admin.Utils.syntaxHighlight(msg.log);
            if ($filter.val()) {
                var rExp = new RegExp($filter.val(), "gi");
                if (rExp.test(msg.text)) {
                    t.model.set('message', msg);
                }
            } else {
                t.model.set('message', msg);
            }
        }
    },

    clearLogs: function() {
        this.$('.log-wrap').empty();
    }
});
