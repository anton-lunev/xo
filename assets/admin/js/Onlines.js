/**
 * Виджет онлайнов
 *
 * @author aosipov
 * @extends Backbone.View
 */
XO.admin.Onlines = Backbone.View.extend({

    template: JST['assets/templates/admin/onlines.ejs'],

    el: '.onlines-wrap',

    initialize: function() {
        this.model = new Backbone.Model({
            onlines: []
        });
        io.socket.get('/logger/subscribe');
        this.listenTo(this.model, "change", this.render);
        this.subscribeEvents();
        this.render();
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
    },

    subscribeEvents: function() {
        var t = this;
        io.socket.on('message', function(msg) {
            log('onlines get the message:', msg);
            t.model.set('onlines', msg.onlines);
        });
    }
});
