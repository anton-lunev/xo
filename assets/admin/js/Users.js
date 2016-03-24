/**
 * Поиск пользователей и работа с ними
 *
 * @author aosipov
 * @extends Backbone.View
 * @class
 */

XO.admin.Users = Backbone.View.extend({

    template: JST['assets/templates/admin/users.ejs'],

    el: '.content',

    events: {
        "click .search": "searchUser",
        "click input[type='text']": "clearFields",
        "click .edit": "editFields"
    },

    initialize: function() {
        this.model = new Backbone.Model({
            user_id: null,
            social_id: null,
            User: null
        });
        this.listenTo(this.model, "change", this.render);
        this.render();
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
    },

    clearFields: function(e) {
        $(e.currentTarget).val('');
    },

    searchUser: function() {
        var $user_id = this.$('#user_id'),
            $social_id = this.$('#social_id'),
            t = this;

        if ($user_id.val()) {
            $.get('/user/', {id: $user_id.val()})
                .done(function(user) {
                    console.log(user);
                    t.model.set({
                        user_id: user[0].id,
                        social_id: user[0].social_id,
                        info: XO.admin.Utils.syntaxHighlight(user),
                        User: user[0]
                    });
                });
        } else if ($social_id.val()) {
            $.get('/user/', {social_id: $social_id.val()})
                .done(function(user) {
                    console.log(user);
                    t.model.set({
                        user_id: user[0].id,
                        social_id: user[0].social_id,
                        info: XO.admin.Utils.syntaxHighlight(user),
                        User: user[0]
                    });
                });
        }
    },

    editFields: function() {
        var field = this.$('#field').val(),
            value = this.$('#value').val(),
            User = this.model.get('User') || {};

        if (confirm("Уверен?!") && this.model.get('user_id') && field && User.hasOwnProperty(field)) {
            var data = {},
                id = this.model.get('user_id'),
                t = this;
            data[field] = value;
            io.socket.put('/user/' + id, data, function(updateUser) {
                console.log('updateUser', updateUser);
                t.model.set('info', XO.admin.Utils.syntaxHighlight(updateUser));
            });
        }
    }
});
