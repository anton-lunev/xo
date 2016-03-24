/**
 * Работа с чатом
 *
 * @author aosipov
 * @task #28
 * @extends Backbone.View
 * @class
 */

XO.chat.Chat = Backbone.View.extend({

    template: JST['assets/templates/chat/chat.ejs'],

    messageTemplate: JST['assets/templates/chat/message.ejs'],

    el: '.lobby-wrapper__chat',

    events: {
        'click .send-message': 'sendMessage',
        'keyup .chat-text': 'autoSend'
    },

    initialize: function() {
        var messages = ChatMessages.get('messages');
        this.model = new Backbone.Model();
        this.listenTo(this.model, "change:messages", this.renderOldMessages);
        this.listenTo(this.model, "change:message", this.renderMessage);
        this.subscribeToEvents();
        this.render();
        this.model.set('messages', messages);
    },

    subscribeToEvents: function() {
        var t = this;
        socket.on('message', function(res) {
            log('chat message:', res);
            if (res.response && res.response.message) {
                t.model.set('message', res.response.message);
            }
        });
    },

    render: function() {
        this.$el.html(this.template({
            User: this.model.attributes
        }));
    },

    renderOldMessages: function() {
        this.$el.find('.chat-body').html(this.messageTemplate({
            messages: this.model.get('messages')
        }));
        this.scrollToEnd();
    },

    renderMessage: function() {
        this.$el.find('.chat-body').append(this.messageTemplate({
            message: this.model.get('message')
        }));
        this.scrollToEnd();
    },

    scrollToEnd: function() {
        this.$el.find('.chat-body').scrollTop(this.$el.find('.chat-body').get(0).scrollHeight);
    },

    sendMessage: function() {
        var $text = this.$el.find('.chat-text');
        if ($text.val() && $text.val() != '' && AntiFlood.checkFlood($text.val())) {
            io.socket.post('/chat/message', {
                message: $text.val(),
                author: User.get('first_name'),
                id: User.get('id')
            });
        }
        $text.val('');
    },

    autoSend: function(e) {
        if (e && e.keyCode == 13) {
            this.sendMessage();
        }
    }
});
