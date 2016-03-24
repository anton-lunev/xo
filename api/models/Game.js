/**
 * Game.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    //autosubscribe: ['destroy', 'update', 'add:users', 'remove:users', 'create'],

    connection: 'redis',

    attributes: {
        /*name: 'string',*/
        bet: {
            type: 'integer',
            defaultsTo: 100
        },
        position: {
            type: 'json',
            defaultsTo: [
                {"0": "", "1": "", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "", "8": "", "9": "", "10": "", "11": "", "12": "", "13": "", "14": "", "15": "", "16": "", "17": "", "18": "", "19": "", "20": "", "21": "", "22": "", "23": "", "24": "", "25": "", "26": "", "27": "", "28": "", "29": "", "30": "", "31": "", "32": "", "33": "", "34": "", "35": "", "36": "", "37": "", "38": "", "39": "", "40": "", "41": "", "42": "", "43": "", "44": "", "45": "", "46": "", "47": "", "48": ""}
            ]
        },
        move: {
            type: 'string'
        },

        whoMove: {
            type: 'string'
        },

        isOver: {
            type: 'boolean',
            defaultsTo: false
        },

        winPosition: {
            type: 'array'
        },

        hasFirstMove: {
            type: 'boolean',
            defaultsTo: false
        },

        withFriend: {
            type: 'boolean',
            defaultsTo: false
        },

        isFull: {
            type: 'boolean',
            defaultsTo: false
        },

        users: {
            type: 'array',
            defaultsTo: []
        }
    },

    /**
     * Создаем очередь активных игр
     * @param rec
     * @param cb
     */
    afterCreate: function(rec, cb) {
        if (rec.withFriend) {
            cb();
        } else {
            Game.native(function (err, collection) {
                if (err) {
                    sails.log.info('Game queue redis err\n: ', err);
                    cb();
                } else {
                    var key = "active:game:" + rec.bet;
                    collection.sadd(key, rec.id, function(err, result) {
                        if (err) {
                            sails.log.info('Game add queue redis err\n: ', err);
                        }
                        cb();
                    });
                }
            });
        }
    },

    /**
     * Если юзер не дождался и удалил игру, ремувим ее
     * @param rec
     * @param cb
     */
    beforeDestroy: function(rec, cb) {
        if (rec.withFriend) {
            cb();
        } else {
            if (_.isObject(rec) && rec.where && rec.where.id) {
                var id = rec.where.id;
                Game.native(function (err, collection) {
                    if (err) {
                        sails.log.info('Game remove redis err\n: ', err);
                        cb();
                    } else {
                        //к сожалению, мы знаем только id игры, поэтому придется пройтись по всем ключам
                        var prefix = "active:game:";
                        var keys = ["25", "50", "150", "400", "1000", "5000"];
                        _.each(keys, function(key) {
                            collection.SREM(prefix + key, id, function(err, result) {
                                if (err) {
                                    sails.log.info('Game remove queue redis err\n: ', err);
                                }
                                sails.log.info('Remove from active game:', key, id);
                            });
                        });
                        // не будем думать о том когда все выполнится в редисе, пошлем колбек товарищу
                        cb();
                    }
                });
            } else {
                cb();
            }
        }
    },

    /**
     * Делаем массив из позиций элеметнов
     * @param json
     */
    makeArray: function(json) {
        var arr = [];
        for (var v in json) {
            arr.push(json[v]);
        }
        return arr;
    },

    /**
     * Заполяем пустые ячейки символами для проверки (изменяем исходный массив)
     * @param arr
     */
    fillEmptyCells: function(arr) {
        _.each(arr, function(v, i, a) {
            if (v == '') {
                a[i] = 'u';
            }
        });
        return arr;
    },

    /**
     * Проверяет есть ли еще ходы
     */
    checkPosibleMoves: function(positions) {
        return _.some(positions, function(v) {
            return v == '';
        })
    },

    checkWin: function(positions, moveSymbol, cell) {
        var checkLine = new Array(5).join(moveSymbol),
            lineSize = 7,
            re = new RegExp(checkLine),
            row = Math.floor(cell / lineSize),
            winnerPosition = [],
            winnerLength = 4,
            retObj = {isWin: false, winPosition: []};

        //ничья
        if (!this.checkPosibleMoves(positions)) {
            retObj = {isWin: true, winPosition: []};
        }
        //по горизонтали
        var line = this.fillEmptyCells(positions.slice(row * lineSize, row * lineSize + lineSize)).join("");

        if (re.test(line)) {
            for (var j = row * lineSize; j < row * lineSize + lineSize; j++) {
                winnerPosition.push(j);
            }
            winnerPosition = winnerPosition.slice(line.indexOf(checkLine), winnerLength + line.indexOf(checkLine));
            sails.log.info('win hor: test line ', line, winnerPosition);
            return {isWin: true, winPosition: winnerPosition};
        }
        // по вертикали
        var lineArr = [];
        row = cell % lineSize;
        winnerPosition.length = 0;
        for (var i = row; i < lineSize * lineSize; i += lineSize) {
            winnerPosition.push(i);
            lineArr.push(positions[i]);
        }

        line = this.fillEmptyCells(lineArr).join("");

        if (re.test(line)) {
            winnerPosition = winnerPosition.slice(line.indexOf(checkLine), winnerLength + line.indexOf(checkLine));
            sails.log.info('win vert: test line ', line, winnerPosition);
            return {isWin: true, winPosition: winnerPosition};
        }

        // по диагонали c верхнего правого угла в нижний левый угол
        lineArr.length = 0;
        winnerPosition.length = 0;
        var rowX = cell % lineSize,
            rowY = Math.floor(cell / lineSize),
            startX = (rowX + rowY > lineSize - 1) ? lineSize - 1 : rowX + rowY,
            y = rowY - (startX - rowX) ;
        for (var x = startX; x >= 0 && y < lineSize; x--) {
            winnerPosition.push(y * lineSize + x);
            lineArr.push(positions[y * lineSize + x]);
            y++;
        }

        line = this.fillEmptyCells(lineArr).join("");

        if (re.test(line)) {
            winnerPosition = winnerPosition.slice(line.indexOf(checkLine), winnerLength + line.indexOf(checkLine));
            sails.log.info('win from up rigth to down left : test line ', line, winnerPosition);
            return {isWin: true, winPosition: winnerPosition};
        }

        // по диагонали с вехреного левого угла в нижний правый
        lineArr.length = 0;
        winnerPosition.length = 0;
        startX = (rowX - rowY > 0) ? rowX - rowY : 0;

        y = (rowY - rowX > 0) ? rowY - rowX : 0;
        for (x = startX; x < lineSize && y < lineSize; x++) {
            winnerPosition.push(y * lineSize + x);
            lineArr.push(positions[y * lineSize + x]);
            y++;
        }

        line = this.fillEmptyCells(lineArr).join("");

        if (re.test(lineArr.join(""))) {
            winnerPosition = winnerPosition.slice(line.indexOf(checkLine), winnerLength + line.indexOf(checkLine));
            sails.log.info('win from up left to down rigth : test line ', line, winnerPosition);
            return {isWin: true, winPosition: winnerPosition};
        }

        return retObj;
    },

    isInjected: function(newPosition, oldPosition) {
        return (_.size(_.difference(newPosition, oldPosition)) > 0)
    },

    /**
     * Проверяет походил ли игрок, который реально в игре, а не наблюдатель
     * @param users
     * @param userId
     * @returns {Boolean|boolean}
     */
    isGamePlayer: function(users, userId) {
        return (_.isArray(users) && _.size(users) == 2 && (users[0].id == userId || users[1].id == userId));
    },

    /**
     * Броадкастим инфу об окочании игры/времени
     * @param to
     * @param msg
     */
    broadcastTimeover: function(to, msg) {
        if (to && msg) {
            sails.sockets.broadcast(to, 'timeover', msg);
        }
    },


    /** далее будет идти набор json ответов */

    errorMessage: function(msg, code) {
        return {
            error: {
                error_msg: msg,
                error_code: code
            }
        };
    },

    responseMessage: function(msg) {
        return {
            response: {
                message: msg
            }
        };
    },

    responseJSON: function(json) {
        var response = {};
        response['response'] = json;
        return response;
    }
};

