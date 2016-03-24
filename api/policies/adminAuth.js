module.exports = function (req, res, ok) {
    try {
        return ok();
    } catch (e) {
        sails.log.error('POLICY_ERROR adminAuth:', e);
        return res.forbidden();
    }
};
