/**
 * Полиси для простых смертных
 *
 * @author aosipov
 */
module.exports = function (req, res, ok) {

    // User is allowed, proceed to controller
    try {
        if (req.session && req.session.Admin && req.session.Admin.id) {
            return ok();
        } else {
            if (req.isSocket) {
                return res.forbidden();
            }
            return res.redirect('/error/404');
        }
    } catch (e) {
        sails.log.error('POLICY_ERROR forbidden:', e);
        return res.forbidden();
    }

};
