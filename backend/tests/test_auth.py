"""Tests for authentication routes and middleware."""

from tests.conftest import _login, _auth_header


class TestLogin:
    def test_login_success(self, client, admin_user):
        resp = client.post("/api/auth/login", json={
            "email": "testadmin@decisio.local",
            "password": "admin123",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "token" in data
        assert data["user"]["email"] == "testadmin@decisio.local"

    def test_login_wrong_password(self, client, admin_user):
        resp = client.post("/api/auth/login", json={
            "email": "testadmin@decisio.local",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401
        assert "Invalid" in resp.get_json()["error"]

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "nobody@decisio.local",
            "password": "whatever",
        })
        assert resp.status_code == 401

    def test_login_deactivated_user(self, client, db_session, member_user):
        member_user.is_active = False
        db_session.flush()
        resp = client.post("/api/auth/login", json={
            "email": "testmember@decisio.local",
            "password": "member123",
        })
        assert resp.status_code == 401
        assert "deactivated" in resp.get_json()["error"].lower()

    def test_login_validation_missing_fields(self, client):
        resp = client.post("/api/auth/login", json={})
        assert resp.status_code == 400


class TestMe:
    def test_me_authenticated(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        resp = client.get("/api/auth/me", headers=_auth_header(token))
        assert resp.status_code == 200
        assert resp.get_json()["user"]["email"] == "testadmin@decisio.local"

    def test_me_no_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401
