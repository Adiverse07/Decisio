import jwt
from datetime import datetime, timedelta, timezone
from config import Config
from models.user import User


def authenticate(email, password):
    """Validate credentials and return (user, token) or (None, error_msg)."""
    user = User.query.filter_by(email=email).first()

    if user is None or not user.check_password(password):
        return None, "Invalid email or password."

    if not user.is_active:
        return None, "Account is deactivated."

    token = _generate_token(user)
    return user, token


def _generate_token(user):
    payload = {
        "user_id": user.id,
        "is_admin": user.is_admin,
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=Config.JWT_TOKEN_EXPIRES_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
