/**
 * CohortController - статистика по когортам
 *
 * @task #33
 * @description :: Server-side logic for managing cohorts
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var moment = require('moment');

module.exports = {

    /**
     * Выводит дневную стастику
     * @param req
     * @param res
     */
    daily: function(req, res) {
        var timestamp = moment().format('YYYY.MM.DD'),
            sql = "select user_id, event, date(createdAt), count(value) value from cohort where date(createdAt) = '" + timestamp + "'  group by user_id, date(createdAt), event";
        Cohort.query(sql,function(err, results) {
            if (err) {
                return res.serverError(err);
            }
            return res.json(results);
        });
    },

    /**
     * Получаем всю инфу, сгруппированную
     *
     * @param req
     * @param res
     */
    all: function(req, res) {
        var sql = "" +
            "SELECT \
        x.timestamp,\
            CONCAT('{', x.events, ',', y.ret, '}') AS events \
        FROM \
        ((SELECT \
        timestamp, GROUP_CONCAT(event) AS events \
        FROM \
        (SELECT \
        DATE(createdAt) AS timestamp, \
            CONCAT('\"', event, '\"', ':', '\"', COUNT(value), '\"') AS event, \
            COUNT(value) \
        FROM \
        cohort \
        GROUP BY DATE(createdAt) , event) AS x \
        GROUP BY timestamp) AS x, (SELECT \
        r1.ts AS timestamp, \
            CONCAT('\"R2\":\"', r1.retention_r1, '%\"', ', \"R\":\"', r.retention_r, '%\"') AS ret \
        FROM \
        ((SELECT \
        DATE(reg.createdAt) AS ts, \
            COUNT(DISTINCT reg.user_id) AS registration, \
            COUNT(DISTINCT login.user_id) AS logins, \
            CASE \
        WHEN COUNT(DISTINCT reg.user_id) > 0 THEN COUNT(DISTINCT login.user_id) * 100 / COUNT(DISTINCT reg.user_id) \
        ELSE 0 \
        END AS retention_r1 \
        FROM \
        cohort AS reg \
        LEFT JOIN cohort AS login ON reg.user_id = login.user_id \
        AND login.event = 'login' \
        AND DATE(login.createdAt) = DATE_ADD(DATE(reg.createdAt), INTERVAL 1 DAY) \
        WHERE \
        reg.event = 'registration' \
        GROUP BY 1 \
        ORDER BY 1) AS r1, (SELECT \
        DATE(reg.createdAt) AS ts, \
            COUNT(DISTINCT reg.user_id) AS registration, \
            COUNT(DISTINCT login.user_id) AS logins, \
            CASE \
        WHEN COUNT(DISTINCT reg.user_id) > 0 THEN COUNT(DISTINCT login.user_id) * 100 / COUNT(DISTINCT reg.user_id) \
        ELSE 0 \
        END AS retention_r \
        FROM \
        cohort AS reg \
        LEFT JOIN cohort AS login ON reg.user_id = login.user_id \
        AND login.event = 'login' \
        AND DATE(login.createdAt) > DATE_ADD(DATE(reg.createdAt), INTERVAL 1 DAY) \
        WHERE \
        reg.event = 'registration' \
        GROUP BY 1 \
        ORDER BY 1) AS r) \
        WHERE \
        r1.ts = r.ts) AS y) \
        WHERE \
        y.timestamp = x.timestamp;";

        Cohort.query(sql, function(err, results) {
            if (err) {
                return res.serverError(err);
            }
            for (var i = 0; i < _.size(results); i++) {
                results[i].events = JSON.parse(results[i].events);
            }
            return res.json(results);
        });
    }
};

