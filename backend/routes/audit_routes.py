from flask import Blueprint, request, jsonify

from extensions import db
from middleware.auth_middleware import require_login
from middleware.admin_middleware import require_admin
from services.audit_service import get_audit_for_decision, get_system_audit
from models.decision import Decision

audit_bp = Blueprint("audit", __name__, url_prefix="/api")


@audit_bp.route("/decisions/<int:decision_id>/audit", methods=["GET"])
@require_login
def decision_audit(decision_id):
    """Audit trail for a single decision — visible to all authenticated users."""
    decision = db.session.get(Decision, decision_id)
    if not decision:
        return jsonify({"error": "Decision not found."}), 404

    entries = get_audit_for_decision(decision_id)
    return jsonify({"audit": [e.to_dict() for e in entries]}), 200


@audit_bp.route("/audit", methods=["GET"])
@require_admin
def system_audit():
    """System-wide audit log — admin only."""
    limit = request.args.get("limit", 100, type=int)
    entries = get_system_audit(limit=min(limit, 500))
    return jsonify({"audit": [e.to_dict() for e in entries]}), 200
