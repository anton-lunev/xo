/**
 * Крон для рассылки нотификации
 *
 * @author aosipov
 */

module.exports.crontab = {

    /*
     * The asterisks in the key are equivalent to the
     * schedule setting in crontab, i.e.
     * minute hour day month day-of-week year
     * so in the example below it will run every minute
     */

    '0 * * * *': function(){
        require('../crontab/vknotify.js').run();
    }
};
