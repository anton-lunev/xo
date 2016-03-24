/**
 * Аглоритм работы AI
 * это всего лишь порт взятый с GitHub
 * Лучше ничего не трогать там, т.к. оно работает. Говнокод не переписывал, оставил исходный)
 *
 * @author aosipov
 * @url https://github.com/kenrick95/c4
 * @task #53
 * @extends Class
 * @class
 */
Array.prototype.clone = function() {
    var arr = [];
    for (var i = 0; i < this.length; i++) {
        arr[i] = this[i].slice();
    }
    return arr;
};

XO.game.GameAI = Class.extend({

    choice: null,

    rows: 7,

    cols: 7,

    aiMoveValue: -1,

    board: [],

    /** макимальная глубина погружения, чем выше число тем сильнее AI (но, > 5 уже будут лаги) */
    defaultAILevel: 4,

    installAI: function(game) {
        if (game) {
            this.game = game;
            //вторым параметром идет уровень сложности
            if (_.size(arguments) == 2) {
                this.defaultAILevel = arguments[1];
            }
        }
        this.buildBoard();
    },

    checkState: function(state) {
        var winVal = 0;
        var chainVal = 0;
        for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.cols; j++) {
                var temp_r = 0, temp_b = 0, temp_br = 0, temp_tr = 0;
                for (var k = 0; k <= 3; k++) {
                    //from (i,j) to right
                    if (j + k < this.cols) temp_r += state[i][j + k];

                    //from (i,j) to bottom
                    if (i + k < this.rows) temp_b += state[i + k][j];

                    //from (i,j) to bottom-right
                    if (i + k < this.rows && j + k < this.cols) temp_br += state[i + k][j + k];

                    //from (i,j) to top-right
                    if (i - k >= 0 && j + k < this.cols) temp_tr += state[i - k][j + k];
                }
                chainVal += temp_r * temp_r * temp_r;
                chainVal += temp_b * temp_b * temp_b;
                chainVal += temp_br * temp_br * temp_br;
                chainVal += temp_tr * temp_tr * temp_tr;

                if (Math.abs(temp_r) === 4) winVal = temp_r;
                else if (Math.abs(temp_b) === 4) winVal = temp_b;
                else if (Math.abs(temp_br) === 4) winVal = temp_br;
                else if (Math.abs(temp_tr) === 4) winVal = temp_tr;

            }
        }
        return [winVal, chainVal];
    },

    value: function(state, depth, alpha, beta) {
        if (depth >= this.defaultAILevel) { // if slow (or memory consumption is high), lower the value
            var retValue = 0;

            // if win, value = +inf
            var val = this.checkState(state);
            var winVal = val[0];
            var chainVal = val[1] * this.aiMoveValue;
            retValue = chainVal;

            // If it lead to winning, then do it
            if (winVal === 4 * this.aiMoveValue) { // AI win, AI wants to win of course
                retValue = 999999;
            } else if (winVal === 4 * this.aiMoveValue * -1) { // AI lose, AI hates losing
                retValue = 999999 * -1;
            }
            retValue -= depth * depth;

            return [retValue, -1];

        } else {
            var val = this.checkState(state);
            var win = val[0];
            // if already won, then return the value right away
            if (win === 4 * this.aiMoveValue) { // AI win, AI wants to win of course
                return [999999 - depth * depth, -1];
            } else if (win === 4 * this.aiMoveValue * -1) { // AI lose, AI hates losing
                return [999999 * -1 - depth * depth, -1];
            }

            if (depth % 2 === 0) {
                return this.minState(state, depth + 1, alpha, beta);
            } else {
                return this.maxState(state, depth + 1, alpha, beta);
            }
        }
    },

    fillMap: function(state, column, value) {
        var tempMap = state.clone();
        if (tempMap[0][column] !== 0 || column < 0 || column > 7) {
            return -1;
        } else {
            var done = false;
            var row = 0;
            for (var i = 0; i < 6; i++) {
                if (tempMap[i + 1][column] !== 0) {
                    done = true;
                    row = i;
                    break;
                }
            }
            if (!done) {
                row = 6;
            }
            tempMap[row][column] = value;
            return tempMap;
        }
    },

    maxState: function(state, depth, alpha, beta) {
        var v = -Infinity;
        var move = -1;
        var tempVal = null;
        var moveQueue = [];

        for (var j = 0; j < this.cols; j++) {
            var tempState = this.fillMap(state, j, this.aiMoveValue);
            if (tempState === -1) continue;

            tempVal = this.value(tempState, depth, alpha, beta);
            if (tempVal[0] > v) {
                v = tempVal[0];
                move = j;
                moveQueue = [];
                moveQueue.push(j);
            } else if (tempVal[0] === v) {
                moveQueue.push(j);
            }

            // alpha-beta pruning
            if (v > beta) {
                move = this.choose(moveQueue);
                return [v, move];
            }
            alpha = Math.max(alpha, v);

        }
        move = this.choose(moveQueue);

        return [v, move];
    },

    minState: function(state, depth, alpha, beta) {
        var v = Infinity;
        var move = -1;
        var tempVal = null;
        var tempState = null;
        var moveQueue = [];

        for (var j = 0; j < this.cols; j++) {
            tempState = this.fillMap(state, j, this.aiMoveValue * -1);
            if (tempState === -1) continue;

            tempVal = this.value(tempState, depth, alpha, beta);
            if (tempVal[0] < v) {
                v = tempVal[0];
                move = j;
                moveQueue = [];
                moveQueue.push(j);
            } else if (tempVal[0] === v) {
                moveQueue.push(j);
            }

            // alpha-beta pruning
            if (v < alpha) {
                move = this.choose(moveQueue);
                return [v, move];
            }
            beta = Math.min(beta, v);
        }
        move = this.choose(moveQueue);

        return [v, move];
    },

    choose: function(choice) {
        return choice[Math.floor(Math.random() * choice.length)];
    },

    makeEmptyBoard: function() {
        for (var i = 0; i < this.cols; i++) {
            this.board[i] = new Array(this.rows);
            for (var j = 0; j < this.rows; j++) {
                this.board[i][j] = 0;
            }
        }
    },

    buildBoard: function() {
        var i = 0;
        this.makeEmptyBoard();
        if (this.game && _.isArray(this.game.position)) {
            var positions = this.game.position[0];
            //тут ад, ибо надо было подогнать под автора
            for (i = 0; i < this.cols; i++) {
                for (var j = 0; j < this.rows; j++) {
                    if (positions[i * this.cols + j] != '') {
                        //а теперь мазавфака еще магия, я хз но почему-то нормальный ход он считает только за ноликов
                        if (positions[i * this.cols + j] == this.game.moveValue) {
                            this.board[i][j] = 1;
                        } else {
                            this.board[i][j] = this.aiMoveValue;
                        }
                    }
                }
            }
        }
    },

    getCellToMove: function(column) {
        return (this.getDropRow(column) * this.rows + column);
    },

    getDropRow: function(column) {
        var col = this.board[column],
            row = this.rows - 1;

        for (var i = 0; i < this.rows; i++) {
            if (this.board[i][column] != 0) {
                break;
            }
            row = i;

        }
        return row;
    },

    printState: function(state) {
        var msg = "\n";
        for (var i = 0; i < 7; i++) {
            for (var j = 0; j < 7; j++) {
                msg += " " + state[i][j];
            }
            msg += "\n";
        }
        log(msg);
    },

    makeMove: function(game) {
        var t = this;
        setTimeout(function() {
            t.installAI(game);
            if (game.bet >= 150 && game.bet < 1000) {
                //прокачиваем бота до анриальности)
                t.defaultAILevel = 5;
            } else if (game.bet >= 1000) {
                //полный ад =)
                t.defaultAILevel = 6;
            }
            var state = t.board;
            var choice_val = t.maxState(state, 0, -Infinity, Infinity);
            t.choice = choice_val[1];
            var cell = t.getCellToMove(t.choice);
            socket.post('/game/move', {gameId: t.game.id, cell: cell, value: "O", position: t.game.position, ai: true});
        }, 100);
    }
});

