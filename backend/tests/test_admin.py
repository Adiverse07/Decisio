"""Tests for admin-only user management routes."""

from tests.conftest import _login, _auth_header


class TestAdminAccess:
    def test_member_cannot_access_users(self, client, member_user):
        token = _login(client, "testmember@decisio.local", "member123")
        resp = client.get("/api/users", headers=_auth_header(token))
        assert resp.status_code == 403

    def test_admin_can_list_users(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        resp = client.get("/api/users", headers=_auth_header(token))
        assert resp.status_code == 200

    def test_admin_can_create_user(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        resp = client.post("/api/users", headers=_auth_header(token), json={
            "name": "New Person",
            "email": "newperson@decisio.local",
            "password": "password123",
        })
        assert resp.status_code == 201

    def test_member_cannot_create_user(self, client, member_user):
        token = _login(client, "testmember@decisio.local", "member123")
        resp = client.post("/api/users", headers=_auth_header(token), json={
            "name": "Sneaky",
            "email": "sneaky@decisio.local",
            "password": "password123",
        })
        assert resp.status_code == 403

    def test_system_audit_admin_only(self, client, member_user, admin_user):
        member_token = _login(client, "testmember@decisio.local", "member123")
        resp = client.get("/api/audit", headers=_auth_header(member_token))
        assert resp.status_code == 403

        admin_token = _login(client, "testadmin@decisio.local", "admin123")
        resp = client.get("/api/audit", headers=_auth_header(admin_token))
        assert resp.status_code == 200
