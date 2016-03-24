/**
 * Страница со статой переходов по рефам
 *
 * @author aosipov
 * @extends Backbone.View
 */

XO.admin.RefStats = Backbone.View.extend({

    template: JST['assets/templates/admin/refStats.ejs'],

    el: '.content',

    headers: ['create_date'],

    initialize: function() {
        var t = this;
        $.get('/ref/')
            .done(function(stat) {
                t.headers = t.headers.concat(stat[0].headers.split(','));
                t.model = new Backbone.Model({
                    refs: stat,
                    head: t.headers
                });
                t.render();
            });
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
    }
});
