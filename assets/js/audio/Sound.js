/**
 * Управление звуками в игре
 *
 * @author aosipov
 */

$(document).ready(function() {
    window.Sounds = {canPlay: false};

    Sounds["move"] = '/audio/move.mp3';
    Sounds["connected"] = '/audio/connected.mp3';
    Sounds["timer"] = '/audio/timer.mp3';
    $("#jplayer").jPlayer({
        ready: function() {
            $(this).jPlayer("setMedia", {
                mp3: Sounds["move"]
            }).load();
            $(this).jPlayer("load");

            $(this).jPlayer("setMedia", {
                mp3: Sounds["connected"]
            });
            $(this).jPlayer("load");

            $(this).jPlayer("setMedia", {
                mp3: Sounds["timer"]
            });
            $(this).jPlayer("load");
        },
        swfPath: "/js/vendor/jplayer",
        supplied: "mp3, oga"
    });

    Sounds.play = function(sound) {
        if (Sounds.hasOwnProperty(sound)) {
            $("#jplayer").jPlayer("setMedia", {
                mp3: Sounds[sound]
            });
            $("#jplayer").jPlayer("play");
        }
    };

    Sounds.stop = function() {
        $("#jplayer").jPlayer("stop");
    };

    Sounds.sound = function (bool) {
        $("#jplayer").jPlayer("unmute", bool);
    }
});
