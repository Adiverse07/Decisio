"""Pytest fixtures shared across all test modules."""

import pytest
from app import create_app
from extensions import db as _db


@pytest.fixture(scope="session")
def app():
    """Create the Flask app once for the entire test session."""
    app = create_app("testing")
    yield app


@pytest.fixture(scope="session")
def setup_db(app):
    """Create all tables at the start; drop them at the end."""
    with app.app_context():
        _db.create_all()
    yield
    with app.app_context():
        _db.drop_all()


@pytest.fixture(autouse=True)
def db_session(app, setup_db):
    """Give each test a clean database by rolling back after every test."""
    with app.app_context():
        yield _db.session
        _db.session.rollback()
        # Truncate all tables so the next test starts fresh
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


@pytest.fixture()
def client(app):
    """Flask test client."""
    return app.test_client()


# ---------------------------------------------------------------------------
# Helper fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def admin_user(db_session):
    """Create and return an admin user."""
    from models.user import User

    user = User(name="Test Admin", email="testadmin@decisio.local", is_admin=True)
    user.set_password("admin123")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def member_user(db_session):
    """Create and return a regular member user."""
    from models.user import User

    user = User(name="Test Member", email="testmember@decisio.local", is_admin=False)
    user.set_password("member123")
    db_session.add(user)
    db_session.commit()
    return user


def _login(client, email, password):
    """Helper — log in and return the JWT token."""
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.get_json()["token"]


def _auth_header(token):
    """Return an Authorization header dict."""
    return {"Authorization": f"Bearer {token}"}
