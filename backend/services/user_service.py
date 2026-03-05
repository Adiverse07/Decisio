from extensions import db
from models.user import User


def list_users():
    """Return all users ordered by created_at desc."""
    return User.query.order_by(User.created_at.desc()).all()


def get_user(user_id):
    return db.session.get(User, user_id)


def create_user(name, email, password, is_admin=False):
    """Create a new user. Returns (user, None) or (None, error_msg)."""
    if User.query.filter_by(email=email).first():
        return None, "A user with this email already exists."

    user = User(name=name, email=email, is_admin=is_admin)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user, None


def update_user(user_id, **kwargs):
    """Update user fields. Returns (user, None) or (None, error_msg)."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    if "email" in kwargs and kwargs["email"] != user.email:
        existing = User.query.filter_by(email=kwargs["email"]).first()
        if existing:
            return None, "A user with this email already exists."

    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)

    db.session.commit()
    return user, None


def toggle_active(user_id):
    """Toggle is_active on a user. Returns (user, None) or (None, error_msg)."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    user.is_active = not user.is_active
    db.session.commit()
    return user, None
