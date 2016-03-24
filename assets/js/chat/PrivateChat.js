/**
 * Чат, который находится непостредственно в игре
 *
 * @author aosipov
 * @extends XO.chat.Chat
 */

XO.chat.PrivateChat = XO.chat.Chat.extend({

    el: '.private-chat',

    gameId: null,

    initialize: function(options) {
        _.extend(this, options, {});
        this.model = new Backbone.Model();
        this.listenTo(this.model, "change:messages", this.renderOldMessages);
        this.listenTo(this.model, "change:message", this.renderMessage);
        this.subscribeToEvents();
        this.render();
    },

    subscribeToEvents: function() {
        var t = this;
        socket.on('private', function(res) {
            log('private message:', res);
            if (res.response && res.response.message) {
                t.model.set('message', res.response.message);
            }
        });
    },

    sendMessage: function() {
        var $text = this.$el.find('.chat-text');

        if ($text.val() && $text.val() != '') {
            io.socket.post('/chat/private', {
                message: $text.val(),
                author: User.get('first_name'),
                id: User.get('id'),
                gameId: this.gameId
            });
            $text.val('');
        }
    }

});
