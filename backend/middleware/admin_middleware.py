from functools import wraps
from flask import jsonify, g
from middleware.auth_middleware import require_login


def require_admin(f):
    """Decorator — requires login AND is_admin = True."""

    @wraps(f)
    @require_login
    def decorated(*args, **kwargs):
        if not g.current_user.is_admin:
            return jsonify({"error": "Admin access required."}), 403
        return f(*args, **kwargs)

    return decorated
