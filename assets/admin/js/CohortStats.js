/**
 * Страница с когортной статой
 *
 * @author aosipov
 * @extends Backbone.View
 */

XO.admin.CohortStats = Backbone.View.extend({

    template: JST['assets/templates/admin/cohortStats.ejs'],

    el: '.content',

    headers: [
        "timestamp",
        "R2",
        "R",
        "registration",
        "login",
        "from_ref",
        "win_one_game",
        "lose_one_game",
        "played_one_game",
        "played_three_games",
        "played_ten_games"
    ],

    initialize: function() {
        var t = this;
        $.get('/cohort/all')
            .done(function(stat) {

                t.model = new Backbone.Model({
                    cohort: stat,
                    head: t.headers
                });
                t.render();
            });
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
    }
});
