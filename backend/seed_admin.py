"""
One-time script to create the first admin user.
Run with: python seed_admin.py
"""

from app import create_app
from extensions import db
from models.user import User


def seed():
    app = create_app()
    with app.app_context():
        existing = User.query.filter_by(email="admin@decisio.local").first()
        if existing:
            print("Admin user already exists — skipping.")
            return

        admin = User(
            name="Admin",
            email="admin@decisio.local",
            is_admin=True,
            is_active=True,
        )
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
        print(f"Admin user created — email: admin@decisio.local / password: admin123")


if __name__ == "__main__":
    seed()
