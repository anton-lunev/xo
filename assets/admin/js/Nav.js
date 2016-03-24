/**
 * Админка
 *
 * @author aosipov
 * @extends Backbone.View
 */
XO.admin.Nav = Backbone.View.extend({

    el: '.navbar',

    events: {
        'click .users': 'showUsers',
        'click .logs': 'showLogs',
        'click .cohort': 'showCohort',
        'click .ref': 'showRef',
        'click .antiflood': 'showAntiFlood'
    },

    tabUsers: null,

    tabLogs: null,

    tabCohort: null,

    tabRef: null,

    tabAntiFlood: null,

    showUsers: function() {
        if (this.tabUsers) {
            this.tabUsers.render();
        } else {
            this.tabUsers = new XO.admin.Users();
        }

    },

    showLogs: function() {
        if (this.tabLogs) {
            this.tabLogs.model.set({message: null});
            this.tabLogs.render();
        } else {
            this.tabLogs = new XO.admin.Logger();
        }
    },

    showCohort: function() {
        if (this.tabCohort) {
            this.tabCohort.render();
        } else {
            this.tabCohort = new XO.admin.CohortStats();
        }
    },

    showRef: function() {
        if (this.tabRef) {
            this.tabRef.render();
        } else {
            this.tabRef = new XO.admin.RefStats();
        }
    },

    showAntiFlood: function() {
        if (this.tabAntiFlood) {
            this.tabAntiFlood.render();
        } else {
            this.tabAntiFlood = new XO.admin.AntiFlood();
        }
    }
});
