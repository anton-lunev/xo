/**
 * Created by Ossipov on 11.01.15.
 *
 * @author aosipov
 * @extends Backbone.View.extend
 */

XO.lobby.TopFriends = Backbone.View.extend({

    el: '.tab-top-friends',

    template: JST['assets/templates/lobby/topFriends.ejs'],

    events: {
        'click .invite': 'invite'
    },

    initialize: function() {
        var t = this;
        this.model = new Backbone.Model();
        this.loadFriends().done(function(topFriends) {
            t.model.set({
                friends: topFriends
            });
            t.render();
        });
    },

    invite: function() {
        log('invite friends');
        SocialAPI.inviteFriends();
    },

    loadFriends: function() {
        var topFriends = [].concat(User.get('social_id')),
            def = new $.Deferred();
        SocialAPI.getAppFriendsIds()
            .done(function(friends) {
                if (friends.length) {
                    topFriends = topFriends.concat(friends);
                    $.get('/top/friends/', {uids: topFriends.join(',')})
                        .done(function(top) {
                            if (top && top.response) {
                                def.resolve([].concat(top.response));
                            } else {
                                def.resolve([].concat([User.attributes]));
                            }
                        })
                        .fail(function() {
                            def.resolve([].concat([User.attributes]));
                        });
                } else {
                    def.resolve([].concat([User.attributes]));
                }
            })
            .fail(function() {
                def.resolve([].concat([User.attributes]));
            });
        return def.promise();
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
