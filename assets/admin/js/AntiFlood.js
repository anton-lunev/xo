/**
 * Настройки антифлуда
 *
 * @author alunev
 * @extends Backbone.View
 * @class
 */

XO.admin.AntiFlood = Backbone.View.extend({

    template: JST['assets/templates/admin/antiFlood.ejs'],

    el: '.content',

    events: {
        "click .addInput": "addInput",
        "click .saveConfig": "saveConfig"
    },

    initialize: function() {
        this.model = new Backbone.Model({
            badPatterns: null,
            goodPatterns: null,
            goodWords: null
        });
        this.getConfig();
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
    },

    getConfig: function () {
        var t = this;
        $.get('/antiflood/getConfig')
            .done(function(config) {
                console.log(config);
                t.model.set({
                    badPatterns: config.badPatterns,
                    goodPatterns: config.goodPatterns,
                    goodWords: config.goodWords
                });
                t.render();
            });
    },

    addInput: function (e) {
        var $button = $(e.target);
        var $wrapper = $button.parent().siblings('.form-inputs');

        $wrapper.prepend('\
            <div class="form-group"> \
            <input type="text" class="form-control ' + $button.attr('id') + '" placeholder="' + $button.attr('id') + '">\
            </div>\
            ');
    },

    saveConfig: function () {
        var t = this;

        var attributes = {
            badPatterns: [],
            goodPatterns: [],
            goodWords: []
        };

        this.$('.badPatterns').each(function() {
            if($(this).val() !== '') {
                attributes.badPatterns.push($(this).val());
            }
        });
        this.$('.goodPatterns').each(function() {
            if($(this).val() !== '') {
                attributes.goodPatterns.push($(this).val());
            }
        });
        this.$('.goodWords').each(function() {
            if($(this).val() !== '') {
                attributes.goodWords.push($(this).val());
            }
        });

        $.post('/antiflood/saveConfig', attributes)
            .done(function(config) {
                t.model.set(attributes);
                t.render();
            });

        console.log(attributes);
    }
});
