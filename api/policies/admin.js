/**
 * Полиси для амина
 *
 * @author aosipov
 */
module.exports = function (req, res, ok) {
    try {
        if (req.session && req.session.Admin && req.session.Admin.id) {
            return ok();
        } else {
            if (req.isSocket) {
                return res.forbidden();
            }
            return res.redirect('/admin/auth');
        }
    } catch (e) {
        sails.log.error('POLICY_ERROR admin:', e);
        return res.forbidden();
    }
};
