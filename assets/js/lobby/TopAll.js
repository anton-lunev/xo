/**
 * Общий топ игроков
 *
 * @author aosipov
 * @extends Backbone.View.extend
 */

XO.lobby.TopAll = Backbone.View.extend({

    el: '.tab-top-all',

    template: JST['assets/templates/lobby/topAll.ejs'],


    initialize: function() {
        this.model = TopAllModel;
        this.render();
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
        return this;
    },

    onTabClick: function(e) {
        var $current = this.$el.find('.active'),
            $target = $(e.currentTarget);
        $current.removeClass('active');
        $($.find('.' + $current.data('tab'))).hide();
        $target.addClass('active');
        $($.find('.' + $target.data('tab'))).show();
    }
});
