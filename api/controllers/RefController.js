/**
 * RefController
 *
 * @description :: Server-side logic for managing Refs
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

    /**
     * Выводит список рефов
     * @param req
     * @param res
     */
    list: function(req, res) {
        var sql = 'SELECT \
        create_date, \
            (SELECT \
        GROUP_CONCAT(DISTINCT (ref)) AS headers \
        FROM \
        refs) AS headers, \
            CONCAT(\'{\', GROUP_CONCAT(ref_info), \'}\') AS referals \
        FROM \
        (SELECT \
        DATE(createdAt) AS create_date, \
            CONCAT(\'"\', ref, \'":"\', COUNT(*), \'"\') AS ref_info \
        FROM \
        refs \
        GROUP BY ref , create_date) AS t \
        GROUP BY create_date';

        Ref.query(sql, function(err, results) {
            if (err) {
                return res.serverError(err);
            }
            for (var i = 0; i < _.size(results); i++) {
                results[i].refs = JSON.parse(results[i].referals);
            }
            return res.json(results);
        });
    }
};

