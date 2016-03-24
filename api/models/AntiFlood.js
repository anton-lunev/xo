/**
 * AntiFlood.js
 *
 * @docs        :: http://sailsjs.org/#!documentation/models
 */
var Q = require('q');

module.exports = {

    attributes: {

        badPatterns: {
            type: 'array',
            defaultsTo: []
        },
        goodPatterns: {
            type: 'array',
            defaultsTo: []
        },
        goodWords: {
            type: 'array',
            defaultsTo: []
        }
    },

    config: {
        badPatterns: [],
        goodPatterns: [],
        goodWords: []
    },

    letters: {
        "a": "а",
        "b": "в",
        "c": "с",
        "e": "е",
        "f": "ф",
        "g": "д",
        "h": "н",
        "i": "и",
        "k": "к",
        "l": "л",
        "m": "м",
        "n": "н",
        "o": "о",
        "p": "р",
        "r": "р",
        "s": "с",
        "t": "т",
        "u": "у",
        "v": "в",
        "x": "х",
        "y": "у",
        "w": "ш",
        "z": "з",
        "ё": "е",
        "6": "б",
        "9": "д"
    },

    checkFlood: function (text) {
        var def = Q.defer(),
            t = this;
        sails.config.antiFlood.getConfig().then(function (config) {
            t.config = config;

            text = t.cleanBadSymbols(text.toLowerCase());
            var words = text.split(" ");

            for (var i = 0; i < words.length; i++) {
                var word = t.convertEngToRus(words[i]);

                if (t.isInGoodWords(word) && t.isInGoodPatterns(word)) {
                    continue;
                }

                if (t.isInBadPatterns(word)) {
                    def.resolve(false);
                    return;
                }
            }

            def.resolve(t.containsMatInSpaceWords(words));
        });

        return def.promise;
    },

    convertEngToRus: function (word) {
        for (var j = 0; j < word.length; j++) {
            for (var key in this.letters) {
                if (word.charAt(j) == key)
                    word = word.substring(0, j) + this.letters[key] + word.substring(j + 1, word.length)
            }
        }

        return word;
    },
    cleanBadSymbols: function (text) {
        return text.replace(/[^a-zA-Zа-яА-Яё0-9\s]/g, "");
    },
    isInGoodWords: function (word) {
        for (var i = 0; i < this.config.goodWords.length; i++) {
            if (word == this.config.goodWords[i])
                return true;
        }

        return false;
    },
    isInGoodPatterns: function (word) {
        for (var i = 0; i < this.config.goodPatterns.length; i++) {
            var pattern = new RegExp(this.config.goodPatterns[i]);
            if (pattern.test(word))
                return true;
        }

        return false;
    },
    isInBadPatterns: function (word) {
        for (var i = 0; i < this.config.badPatterns.length; i++) {
            var pattern = new RegExp(this.config.badPatterns[i]);
            if (pattern.test(word))
                return true;
        }

        return false;
    },
    containsMatInSpaceWords: function (words) {
        var spaceWords = this.findSpaceWords(words);

        for (var i = 0; i < spaceWords.length; i++) {
            var word = this.convertEngToRus(spaceWords[i]);
            if (this.isInBadPatterns(word)) {
                return false;
            }
        }

        return true;
    },
    findSpaceWords: function (words) {

        var out = [];
        var spaceWord = "";

        for(var i=0; i < words.length; i++ ){
            var word = words[i];

            if(word.length <= 3){
                spaceWord += word;
                continue;
            }

            if(spaceWord.length >= 3){
                out.push(spaceWord);
                spaceWord = "";
            }
        }

        return out;
    }

};

