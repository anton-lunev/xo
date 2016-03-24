/**
 * Профиль пользователя
 *
 * @author aosipov
 * @task
 * @extends Backbone.View
 * @class
 */

XO.profile.Profile = Backbone.View.extend({

    template: JST['assets/templates/profile/profile.ejs'],

    el: '.app-layout__profile',

    events: {
        'click .coins-wrap': 'buyCoins',
        'click .help-wrap': 'showHelp',
        'click .sound': 'switchSound'
    },

    initialize: function() {
        this.listenTo(this.model, "change", this.render);
        this.subscribeToEvents();

        if (amplify.store('sound') === undefined) {
            amplify.store('sound', true);
        }

        this.model.set({
            sound: amplify.store('sound')
        });

        if (this.model.get('just_created') && !amplify.store.sessionStorage('showHelpPopup')) {
            this.showHelp();
            amplify.store.sessionStorage('showHelpPopup', true)
        }
    },

    subscribeToEvents: function() {
        var t = this;
        socket.on('profile', function(msg) {
            log('profile:', msg);
            t.model.set(msg);
        });
    },

    render: function() {
        this.$el.html(this.template({
            User: this.model.attributes
        }));
    },

    buyCoins: function() {
        new XO.popup.PaymentPopup();
    },

    switchSound: function () {
        var sound = amplify.store('sound', !amplify.store('sound'));

        Sounds.sound(sound);
        Sounds.play("connected");
        this.model.set({
            sound: sound
        });
    },

    showHelp: function () {
        var popup = new XO.popup.HelpPopup({
            model: new Backbone.Model()
        });
    }

});
