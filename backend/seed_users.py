"""Seed script — adds sample users for development/testing."""

from app import create_app
from extensions import db
from models.user import User

USERS = [
    {"name": "Alice Chen",     "email": "alice@decisio.local",   "password": "password1", "is_admin": False},
    {"name": "Bob Martinez",   "email": "bob@decisio.local",     "password": "password1", "is_admin": False},
    {"name": "Carol Wright",   "email": "carol@decisio.local",   "password": "password1", "is_admin": False},
    {"name": "David Kim",      "email": "david@decisio.local",   "password": "password1", "is_admin": False},
    {"name": "Eva Novak",      "email": "eva@decisio.local",     "password": "password1", "is_admin": True},
]


def seed():
    app = create_app()
    with app.app_context():
        created = 0
        skipped = 0
        for u in USERS:
            if User.query.filter_by(email=u["email"]).first():
                print(f"  skip  {u['email']} (already exists)")
                skipped += 1
                continue
            user = User(name=u["name"], email=u["email"], is_admin=u["is_admin"])
            user.set_password(u["password"])
            db.session.add(user)
            created += 1
            print(f"  +     {u['email']}")
        db.session.commit()
        total = User.query.count()
        print(f"\nDone — created {created}, skipped {skipped}, total users in DB: {total}")


if __name__ == "__main__":
    seed()
