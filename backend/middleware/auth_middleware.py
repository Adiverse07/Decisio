from functools import wraps
from flask import request, jsonify, g
import jwt
from config import Config
from extensions import db
from models.user import User


def require_login(f):
    """Decorator — rejects request if no valid JWT is present."""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"error": "Authentication required."}), 401

        try:
            payload = jwt.decode(
                token, Config.JWT_SECRET_KEY, algorithms=["HS256"]
            )
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token."}), 401

        user = db.session.get(User, payload.get("user_id"))

        if user is None:
            return jsonify({"error": "User not found."}), 401

        if not user.is_active:
            return jsonify({"error": "Account is deactivated."}), 403

        # Attach user to request context so routes can access it
        g.current_user = user
        return f(*args, **kwargs)

    return decorated
