/**
 * Попап с выбором друзей для вызова на дуель
 *
 * @author aosipov
 * @extends XO.popup.PopupWidget
 * @class
 */
XO.popup.CallUserPopup = XO.popup.PopupWidget.extend({

    template: JST['assets/templates/popup/callUserPopup.ejs'],

    showClose: true,

    events: {
        'click .call': 'callUser',
        'click .close': 'close'
    },

    run: function() {
        var t = this;
        t.model = new Backbone.Model({friends:[]});
        t.show();

        t.loadFriendsToCall().done(function(friends) {
            if (_.isArray(friends) && friends.length) {
                t.model.set({
                    friends: friends
                });
                t.show();
            } else {
                t.close();
                SocialAPI.inviteFriends();
            }
        });
    },

    /**
     * Загрузка списка друзей которых можно позвать на дуэль
     * @returns {*}
     */
    loadFriendsToCall: function() {
        var def = new $.Deferred();
        SocialAPI.getFriendsToCall().done(function(friends) {
            if (_.size(friends)) {
                def.resolve(friends);
            } else {
                SocialAPI.friends.getNotApp().done(function (friends) {
                    def.resolve(_.sortBy(friends, function(friend) {
                        return !friend.online;
                    }));
                })
            }
        });

        return def.promise();
    },

    /**
     * Зовем кореша
     * @param e
     */
    callUser: function(e) {
        var friends = this.model.get('friends'),
            id = $(e.currentTarget).data('id'),
            gameId = this.gameId,
            t = this;
        log('Call user click');
        if (friends && friends[id]) {
            SocialAPI.showRequestBox({
                uid: friends[id].socialId,
                message: 'Вызываю тебя на дуэль!',
                requestKey: gameId
            })
                .done(function() {
                    log('User called');
                    t.on('afterClose', function () {
                        t.trigger('userCalled');
                    });
                    t.close();
                })
                .fail(function() {
                    log('call cancelled');
                    t.trigger('userCancelled');
                });
        }
    }
});
