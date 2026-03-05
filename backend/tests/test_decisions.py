"""Tests for decision lifecycle — CRUD, status transitions, supersede, audit."""

from tests.conftest import _login, _auth_header


def _create_project(client, token, name="Decision Test Project"):
    resp = client.post("/api/projects", headers=_auth_header(token), json={
        "name": name,
    })
    return resp.get_json()["project"]["id"]


def _create_decision(client, token, project_id, title="Test Decision"):
    resp = client.post("/api/decisions", headers=_auth_header(token), json={
        "project_id": project_id,
        "title": title,
        "context": "Why we need this decision.",
        "options": [
            {"title": "Option A", "pros": "Fast", "cons": "Expensive", "is_chosen": True},
            {"title": "Option B", "pros": "Cheap", "cons": "Slow"},
        ],
    })
    return resp.get_json()["decision"]


class TestDecisionCRUD:
    def test_create_decision(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "CRUD Project")
        decision = _create_decision(client, token, pid)
        assert decision["status"] == "Draft"
        assert len(decision["options"]) == 2
        assert decision["options"][0]["is_chosen"] is True

    def test_update_decision(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Update Dec Project")
        decision = _create_decision(client, token, pid)
        resp = client.patch(
            f"/api/decisions/{decision['id']}",
            headers=_auth_header(token),
            json={"title": "Updated Title"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["decision"]["title"] == "Updated Title"

    def test_list_decisions_by_project(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "List Dec Project")
        _create_decision(client, token, pid, "Dec 1")
        _create_decision(client, token, pid, "Dec 2")
        resp = client.get(f"/api/decisions?project_id={pid}", headers=_auth_header(token))
        assert resp.status_code == 200
        assert len(resp.get_json()["decisions"]) == 2


class TestStatusTransitions:
    def test_draft_to_proposed(self, client, member_user):
        token = _login(client, "testmember@decisio.local", "member123")
        pid = _create_project(client, token, "Status Project 1")
        decision = _create_decision(client, token, pid)
        resp = client.patch(
            f"/api/decisions/{decision['id']}/status",
            headers=_auth_header(token),
            json={"new_status": "Proposed"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["decision"]["status"] == "Proposed"

    def test_proposed_to_decided_requires_admin(self, client, member_user, admin_user):
        # Create as member
        member_token = _login(client, "testmember@decisio.local", "member123")
        pid = _create_project(client, member_token, "Status Project 2")
        decision = _create_decision(client, member_token, pid)
        # Propose as member
        client.patch(
            f"/api/decisions/{decision['id']}/status",
            headers=_auth_header(member_token),
            json={"new_status": "Proposed"},
        )
        # Try to decide as member — should fail
        resp = client.patch(
            f"/api/decisions/{decision['id']}/status",
            headers=_auth_header(member_token),
            json={"new_status": "Decided"},
        )
        assert resp.status_code == 403

        # Decide as admin — should succeed
        admin_token = _login(client, "testadmin@decisio.local", "admin123")
        resp = client.patch(
            f"/api/decisions/{decision['id']}/status",
            headers=_auth_header(admin_token),
            json={"new_status": "Decided"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["decision"]["status"] == "Decided"

    def test_cannot_skip_status(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Skip Status Project")
        decision = _create_decision(client, token, pid)
        # Try Draft -> Decided (skipping Proposed)
        resp = client.patch(
            f"/api/decisions/{decision['id']}/status",
            headers=_auth_header(token),
            json={"new_status": "Decided"},
        )
        assert resp.status_code == 400
        assert "Cannot transition" in resp.get_json()["error"]

    def test_cannot_reverse_status(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Reverse Status Project")
        decision = _create_decision(client, token, pid)
        # Draft -> Proposed
        client.patch(
            f"/api/decisions/{decision['id']}/status",
            headers=_auth_header(token),
            json={"new_status": "Proposed"},
        )
        # Try Proposed -> Draft (going backward)
        resp = client.patch(
            f"/api/decisions/{decision['id']}/status",
            headers=_auth_header(token),
            json={"new_status": "Draft"},
        )
        assert resp.status_code == 400


class TestImmutability:
    def test_decided_cannot_be_edited(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Immut Project")
        decision = _create_decision(client, token, pid)
        # Advance to Decided
        client.patch(f"/api/decisions/{decision['id']}/status",
                     headers=_auth_header(token), json={"new_status": "Proposed"})
        client.patch(f"/api/decisions/{decision['id']}/status",
                     headers=_auth_header(token), json={"new_status": "Decided"})
        # Try to edit
        resp = client.patch(
            f"/api/decisions/{decision['id']}",
            headers=_auth_header(token),
            json={"title": "Sneaky edit"},
        )
        assert resp.status_code == 400
        assert "immutable" in resp.get_json()["error"].lower()


class TestSupersede:
    def test_supersede_decided_decision(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Supersede Project")
        decision = _create_decision(client, token, pid, "Original")
        # Advance to Decided
        client.patch(f"/api/decisions/{decision['id']}/status",
                     headers=_auth_header(token), json={"new_status": "Proposed"})
        client.patch(f"/api/decisions/{decision['id']}/status",
                     headers=_auth_header(token), json={"new_status": "Decided"})
        # Supersede
        resp = client.post(
            f"/api/decisions/{decision['id']}/supersede",
            headers=_auth_header(token),
            json={
                "title": "Replacement Decision",
                "context": "New requirements emerged.",
            },
        )
        assert resp.status_code == 201
        new_dec = resp.get_json()["decision"]
        assert new_dec["status"] == "Draft"

        # Old decision should now be Superseded
        old_resp = client.get(
            f"/api/decisions/{decision['id']}",
            headers=_auth_header(token),
        )
        old_dec = old_resp.get_json()["decision"]
        assert old_dec["status"] == "Superseded"
        assert old_dec["superseded_by"] == new_dec["id"]

    def test_cannot_supersede_draft(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "No Supersede Draft")
        decision = _create_decision(client, token, pid)
        resp = client.post(
            f"/api/decisions/{decision['id']}/supersede",
            headers=_auth_header(token),
            json={"title": "Nope", "context": "This should fail."},
        )
        assert resp.status_code == 400
        assert "Decided" in resp.get_json()["error"]


class TestAuditTrail:
    def test_audit_created_on_decision_create(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Audit Project")
        decision = _create_decision(client, token, pid)
        resp = client.get(
            f"/api/decisions/{decision['id']}/audit",
            headers=_auth_header(token),
        )
        assert resp.status_code == 200
        entries = resp.get_json()["audit"]
        assert len(entries) == 1
        assert entries[0]["action"] == "created"

    def test_audit_tracks_status_changes(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Audit Status Project")
        decision = _create_decision(client, token, pid)
        client.patch(f"/api/decisions/{decision['id']}/status",
                     headers=_auth_header(token), json={"new_status": "Proposed"})
        client.patch(f"/api/decisions/{decision['id']}/status",
                     headers=_auth_header(token), json={"new_status": "Decided"})
        resp = client.get(
            f"/api/decisions/{decision['id']}/audit",
            headers=_auth_header(token),
        )
        entries = resp.get_json()["audit"]
        assert len(entries) == 3  # created + 2 status changes
        actions = [e["action"] for e in entries]
        assert "created" in actions
        assert actions.count("status_change") == 2


class TestSoftDelete:
    def test_admin_can_soft_delete(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Delete Project")
        decision = _create_decision(client, token, pid)
        resp = client.delete(
            f"/api/decisions/{decision['id']}",
            headers=_auth_header(token),
        )
        assert resp.status_code == 200
        assert resp.get_json()["message"] == "Decision deleted."

        # Should no longer appear in list
        list_resp = client.get("/api/decisions", headers=_auth_header(token))
        ids = [d["id"] for d in list_resp.get_json()["decisions"]]
        assert decision["id"] not in ids

    def test_deleted_decision_returns_404(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Delete 404 Project")
        decision = _create_decision(client, token, pid)
        client.delete(f"/api/decisions/{decision['id']}", headers=_auth_header(token))
        resp = client.get(
            f"/api/decisions/{decision['id']}",
            headers=_auth_header(token),
        )
        assert resp.status_code == 404

    def test_non_admin_cannot_delete(self, client, member_user):
        token = _login(client, "testmember@decisio.local", "member123")
        pid = _create_project(client, token, "No Delete Project")
        decision = _create_decision(client, token, pid)
        resp = client.delete(
            f"/api/decisions/{decision['id']}",
            headers=_auth_header(token),
        )
        assert resp.status_code == 403

    def test_cannot_delete_already_deleted(self, client, admin_user):
        token = _login(client, "testadmin@decisio.local", "admin123")
        pid = _create_project(client, token, "Double Delete Project")
        decision = _create_decision(client, token, pid)
        client.delete(f"/api/decisions/{decision['id']}", headers=_auth_header(token))
        resp = client.delete(
            f"/api/decisions/{decision['id']}",
            headers=_auth_header(token),
        )
        assert resp.status_code == 400
        assert "already deleted" in resp.get_json()["error"].lower()
