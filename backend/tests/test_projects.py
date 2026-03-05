"""Tests for project CRUD routes."""

from tests.conftest import _login, _auth_header


class TestProjectCRUD:
    def test_create_project(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        resp = client.post("/api/projects", headers=_auth_header(token), json={
            "name": "Test Project",
            "description": "A test project",
        })
        assert resp.status_code == 201
        data = resp.get_json()["project"]
        assert data["name"] == "Test Project"
        assert data["creator_name"] == "Test Admin"

    def test_create_duplicate_project(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        client.post("/api/projects", headers=_auth_header(token), json={
            "name": "Duplicate Project",
        })
        resp = client.post("/api/projects", headers=_auth_header(token), json={
            "name": "Duplicate Project",
        })
        assert resp.status_code == 409

    def test_list_projects(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        client.post("/api/projects", headers=_auth_header(token), json={
            "name": "Project Alpha",
        })
        resp = client.get("/api/projects", headers=_auth_header(token))
        assert resp.status_code == 200
        assert len(resp.get_json()["projects"]) >= 1

    def test_get_project(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        create_resp = client.post("/api/projects", headers=_auth_header(token), json={
            "name": "Get Me Project",
        })
        pid = create_resp.get_json()["project"]["id"]
        resp = client.get(f"/api/projects/{pid}", headers=_auth_header(token))
        assert resp.status_code == 200
        assert resp.get_json()["project"]["name"] == "Get Me Project"

    def test_update_project(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        create_resp = client.post("/api/projects", headers=_auth_header(token), json={
            "name": "Update Me",
        })
        pid = create_resp.get_json()["project"]["id"]
        resp = client.patch(
            f"/api/projects/{pid}",
            headers=_auth_header(token),
            json={"description": "Updated description"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["project"]["description"] == "Updated description"

    def test_archive_project(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        create_resp = client.post("/api/projects", headers=_auth_header(token), json={
            "name": "Archive Me",
        })
        pid = create_resp.get_json()["project"]["id"]
        resp = client.patch(
            f"/api/projects/{pid}",
            headers=_auth_header(token),
            json={"is_archived": True},
        )
        assert resp.status_code == 200
        assert resp.get_json()["project"]["is_archived"] is True

    def test_unauthenticated_access(self, client):
        resp = client.get("/api/projects")
        assert resp.status_code == 401
