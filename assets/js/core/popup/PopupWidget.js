/**
 * Виджет попапа
 *
 * @author aosipov
 * @extends Backbone.View
 */
XO.createNamespace('XO.popup');

XO.core.popup.PopupWidget = Backbone.View.extend({

    el: '.popup',

    template: JST['assets/templates/popup/popupWidget.ejs'],

    /* overlay on show*/
    $backdrop: $('.backdrop'),

    /** тело попапа */
    $popupBody: $('.popup-body'),

    $closeBtn: $('.close'),

    /** анимация по дефолту */
    FADE_IN_DURATION: 300,

    /** показывать ли крестик */
    showClose: false,

    initialize: function(options) {
        _.extend(this, options, {});
        if (!this.model) {
            this.model = new Backbone.Model({});
        }

        (this.showClose) ? this.$closeBtn.show() : this.$closeBtn.hide();

        this.listenTo(this.model, "change", this.render);
        this.run();
    },

    /**
     * переопределяемый метод
     */
    run: function() {

    },

    render: function() {
        if (this.$el.length && this.template && this.model) {
            this.$backdrop.show();
            this.$popupBody.html(this.template(this.model.attributes));
            this.trigger('render');
        }
        return this;
    },

    show: function() {
        //если попап захайдили, просто показываем его без рендера
        if (this.$el.is(':hidden')) {
            this.$el.fadeIn(this.FADE_IN_DURATION);
        }
        this.render();
        this.trigger('show');
    },

    close: function() {
        this.trigger('close');
        this.$backdrop.hide();
        this.$el.hide();
        this.undelegateEvents();
        this.$popupBody.empty();
        this.trigger('afterClose');
        this.off();
    },

    hide: function() {
        this.$el.fadeOut(this.FADE_IN_DURATION);
    }
});

/** сократим путь для простоты*/
XO.popup.PopupWidget = XO.core.popup.PopupWidget;
