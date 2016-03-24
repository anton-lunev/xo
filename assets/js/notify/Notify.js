/**
 * Класс для показа нотификаций пользователю
 *
 * @author aosipov
 * @task
 * @extends Backbone.View
 * @class
 */

XO.notify.Notify = Backbone.View.extend({

    template: JST['assets/templates/notify/notify.ejs'],

    el: '.notify',

    durationIn: 1000,

    durationOut: 4000,

    initialize: function(options) {
        if (options) {
            _.extend(this, options);
        }
        this.render();
    },

    render: function() {
        var t = this;
        this.$el.html(this.template(this.model.attributes));
        this.$el
            .css({
            "margin-top": -(this.$el.height() / 2),
            "margin-left": -(this.$el.width() / 2)
        })
            .fadeIn(t.durationIn, function() {
                $(this).fadeOut(t.durationOut, function() {
                    t.trigger('notify:closed');
                });
            });
    }
});
