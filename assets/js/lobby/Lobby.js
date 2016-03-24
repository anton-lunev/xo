/**
 * Клиентская часть лобби
 *
 * @author aosipov
 * @extends Backbone.View
 */

XO.lobby.Lobby = Backbone.View.extend({

    el: '.app-layout__body',

    template: JST['assets/templates/lobby/lobby.ejs'],

    initialize: function() {
        this.render();
    },

    render: function() {
        this.$el.html(this.template());
        new XO.lobby.Tabs({});
    }
});
