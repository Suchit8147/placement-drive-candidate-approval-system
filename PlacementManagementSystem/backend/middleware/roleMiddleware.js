/**
 * Web Technology Engine - Implementation 2: Role-Based Access Control (RBAC) Middleware
 * Restricts route access to authorized user roles
 */

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource. Allowed roles: [${allowedRoles.join(', ')}]`,
        attemptedRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};
