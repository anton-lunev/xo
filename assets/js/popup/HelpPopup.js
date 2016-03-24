/**
 * Попап c правилами игры
 */

XO.popup.HelpPopup = XO.popup.PopupWidget.extend({

    template: JST['assets/templates/popup/helpPopup.ejs'],

    showClose: true,

    selectors: {
        slide: '.help-slider__slide',
        activeSlide: '.help-slider__slide_active',
        prevButton: '.help-nav__prev',
        nextButton: '.help-nav__next',
        closeButton: '.help-nav__close'
    },

    events: {
        'click .close': 'close',
        'click .help-nav__close': 'close',
        'click .help-nav__next': 'showNext',
        'click .help-nav__prev': 'showPrev'
    },

    run: function () {
        this.show();

        this.$prevButton = this.$el.find(this.selectors.prevButton);
        this.$nextButton = this.$el.find(this.selectors.nextButton);
        this.$closeButton = this.$el.find(this.selectors.closeButton);
        this.$items = this.$el.find(this.selectors.slide);

        //Скроем сразу кнопку Назад и Закрыть
        this.$prevButton.fadeOut(0);
        this.$closeButton.fadeOut(0);
    },

    showNext: function () {
        var activeSlide = this.$items.filter(this.selectors.activeSlide),
            nextSlide = activeSlide.next();

        if (nextSlide.length) {
            this.changeSlide(activeSlide, nextSlide);
            this.$prevButton.fadeIn(200);
            if (!nextSlide.next().length) {
                this.$nextButton.hide(0);
                this.$closeButton.show(0);
            }
        }
    },

    showPrev: function () {
        var activeSlide = this.$items.filter(this.selectors.activeSlide),
            prevSlide = activeSlide.prev();

        if (prevSlide.length) {
            this.changeSlide(activeSlide, prevSlide);
            this.$nextButton.show(0);
            this.$closeButton.hide(0);
            if (!prevSlide.prev().length) {
                this.$prevButton.fadeOut(200);
            }
        }
    },

    changeSlide: function (activeSlide, moveSlide) {
        activeSlide.removeClass('help-slider__slide_active');
        moveSlide.addClass('help-slider__slide_active');
    }
});
