/**
 * Слайдер со столами
 *
 * @author alunev
 * @extends Backbone.View
 */

XO.lobby.Tables = Backbone.View.extend({

    el: '.tab-games__tables',

    template: JST['assets/templates/lobby/tables.ejs'],

    events: {
        "click .table__btn-play": "play"
    },

    currentClass: 'tables-slider__item--current',
    leftClass: 'tables-slider__item--left',
    leftOutClass: 'tables-slider__item--left-out',
    rightClass: 'tables-slider__item--right',
    rightOutClass: 'tables-slider__item--right-out',

    current: 0,
    withFriend: false,

    initialize: function() {
        var t = this;
        if (!t.model) {
            t.model = TablesModel;
        }
        t.render();
    },

    /**
     * Пытаемся начать игру
     * @param e
     */
    play: function(e) {
        var button = e.target;
        var tableId = button.getAttribute("data-table-id");
        var tableData = this.model.get('tables')[tableId];
        this.withFriend = $(button).hasClass('table__btn-play_friend');

        if (tableData.bet > User.get('coins')) {
            new XO.popup.PaymentPopup();
            return;
        }

        if (this.withFriend) {
            this.createGame(tableData);
        } else {
            this.getGame(tableData)
        }

    },

    /**
     * Ищем свободные столы
     * @param tableData
     * @returns {*}
     */
    getGame: function(tableData) {
        var def = $.Deferred(),
            t = this,
            waitPopup = new XO.popup.WaitingGamePopup({message: 'Получаем список столов'});
        $.get('/game/active', {bet: tableData.bet}, function(game) {
            waitPopup.close();
            if (game.id) {
                t.joinGame(game);
            } else {
                t.createGame(tableData);
            }
        });
        return def;
    },

    /**
     * Заходим в игру
     * @param game
     */
    joinGame: function(game) {
        var gameId = game.id,
            userId = User.get('id'),
            t = this;/*,
         waitPopup = new XO.popup.WaitingGamePopup({message: 'Подключаемся к столу'})*/;
        socket.post('/game/' + gameId + '/users/', {id: userId}, function(res) {
            if (res) {
                /*waitPopup.close();*/
                if (res.error) {
                    if (res.error.error_code == 10) {
                        log('Watcher exception:', res.error);
                        t.createGame(res.error);
                    } else {
                        new XO.notify.Notify({
                            durationOut: 1000,
                            model: new Backbone.Model({
                                message: res.error.error_msg
                            })
                        });
                    }
                } else if (res.id) {
                    log('Join game: ', gameId);
                    new XO.game.Game({
                        gameId: gameId,
                        model: new Backbone.Model()
                    });
                }
            }
        });
    },

    /**
     * Создаем новую игру, ждем других игроков
     * @param tableData
     */
    createGame: function(tableData) {
        var bet = tableData.bet,
            t = this,
            waitPopup = new XO.popup.WaitingGamePopup({message: 'Получаем список игроков'});
        log('bet: ', bet);
        io.socket.post('/game', {bet: bet, withFriend: t.withFriend}, function(data) {
            if (data && data.error) {
                waitPopup.close();
                new XO.notify.Notify({
                    durationOut: 1000,
                    model: new Backbone.Model({
                        message: data.error.error_msg
                    })
                });
            } else {
                // кто чем ходит пока харкодно, чисто кто создал тот и папа (делаем пока на сервере)
                new XO.game.Game({
                    gameId: data.id,
                    model: new Backbone.Model()
                });
            }
        });
    },

    /**
     * Рендерим слайдер
     */
    render: function() {
        this.$el.html(this.template(this.model.attributes));

        this.$el.addClass('tab-games__active');

        this.$items = this.$('.tables-slider__wrapper').children();
        this.itemsCount = this.$items.length;

        this.$navPrev = this.$('.tables-slider__nav-item--prev');
        this.$navNext = this.$('.tables-slider__nav-item--next');

        this.classList = [this.leftClass, this.leftOutClass, this.rightClass, this.rightOutClass, this.currentClass].join(' ');

        this._layout();
        this._loadEvents();
    },

    /**
     * Готовим начально положение слайдера
     * @private
     */
    _layout: function() {
        // current, left and right items
        this._setItems();

        this.$leftItm.addClass(this.leftClass);
        this.$rightItm.addClass(this.rightClass);
        this.$currentItm.removeClass(this.classList).addClass(this.currentClass);

    },

    /**
     * Выстраиваем слайды
     * @private
     */
    _setItems: function() {
        this.$currentItm = this.$items.eq(this.current);
        this.$leftItm = ( this.current === 0 ) ? this.$items.eq(this.itemsCount - 1) : this.$items.eq(this.current - 1);
        this.$rightItm = ( this.current === this.itemsCount - 1 ) ? this.$items.eq(0) : this.$items.eq(this.current + 1);

        // next & previous items
        if (this.itemsCount > 3) {
            // next item
            this.$nextItm = ( this.$rightItm.index() === this.itemsCount - 1 ) ? this.$items.eq(0) : this.$rightItm.next();
            this.$nextItm.removeClass(this.classList).addClass(this.rightOutClass);

            // previous item
            this.$prevItm = ( this.$leftItm.index() === 0 ) ? this.$items.eq(this.itemsCount - 1) : this.$leftItm.prev();
            this.$prevItm.removeClass(this.classList).addClass(this.leftOutClass);
        }

    },

    /**
     * Подписываемся на события переключения слайдов
     * @private
     */
    _loadEvents: function() {
        var _self = this;

        this.$navPrev.on('click.gallery', function(event) {
            _self._navigate('prev');
            return false;
        });

        this.$navNext.on('click.gallery', function(event) {
            _self._navigate('next');
            return false;
        });
    },

    /**
     * Переключаем слайды
     * @param dir
     * @private
     */
    _navigate: function(dir) {
        switch (dir) {
            case 'next' :
                this.current = this.$leftItm.index();

                // current item moves right
                this.$currentItm.removeClass(this.classList).addClass(this.rightClass);

                // left item moves to the center
                this.$leftItm.removeClass(this.classList).addClass(this.currentClass);

                // prev item moves to the left
                if (this.$prevItm) {
                    // right item moves out
                    this.$rightItm.removeClass(this.classList).addClass(this.rightOutClass);
                    this.$prevItm.removeClass(this.classList).addClass(this.leftClass);
                } else {
                    // right item moves left
                    this.$rightItm.removeClass(this.classList).addClass(this.leftClass);
                }
                break;

            case 'prev' :
                this.current = this.$rightItm.index();

                // current item moves left
                this.$currentItm.removeClass(this.classList).addClass(this.leftClass);

                // right item moves to the center
                this.$rightItm.removeClass(this.classList).addClass(this.currentClass);

                // next item moves to the right
                if (this.$nextItm) {
                    // left item moves out
                    this.$leftItm.removeClass(this.classList).addClass(this.leftOutClass);
                    this.$nextItm.removeClass(this.classList).addClass(this.rightClass);
                } else {
                    // left item moves right
                    this.$leftItm.removeClass(this.classList).addClass(this.rightClass);
                }
                break;
        }

        this._setItems();
    }
});
