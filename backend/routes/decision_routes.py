from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from middleware.auth_middleware import require_login
from middleware.admin_middleware import require_admin
from schemas.decision_schema import (
    CreateDecisionSchema,
    UpdateDecisionSchema,
    StatusTransitionSchema,
    SupersedeDecisionSchema,
)
from services.decision_service import (
    list_decisions,
    get_decision,
    create_decision,
    update_decision,
    transition_status,
    supersede_decision,
    soft_delete_decision,
)

decision_bp = Blueprint("decisions", __name__, url_prefix="/api/decisions")

create_schema = CreateDecisionSchema()
update_schema = UpdateDecisionSchema()
status_schema = StatusTransitionSchema()
supersede_schema = SupersedeDecisionSchema()


@decision_bp.route("", methods=["GET"])
@require_login
def index():
    project_id = request.args.get("project_id", type=int)
    status = request.args.get("status")
    tag_id = request.args.get("tag_id", type=int)

    decisions = list_decisions(
        project_id=project_id, status=status, tag_id=tag_id
    )
    return jsonify({
        "decisions": [d.to_dict() for d in decisions]
    }), 200


@decision_bp.route("/<int:decision_id>", methods=["GET"])
@require_login
def show(decision_id):
    decision = get_decision(decision_id)
    if not decision or decision.is_deleted:
        return jsonify({"error": "Decision not found."}), 404
    return jsonify({"decision": decision.to_dict()}), 200


@decision_bp.route("", methods=["POST"])
@require_login
def create():
    try:
        data = create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    decision, error = create_decision(data, created_by=g.current_user.id)

    if error:
        return jsonify({"error": error}), 400

    return jsonify({"decision": decision.to_dict()}), 201


@decision_bp.route("/<int:decision_id>", methods=["PATCH"])
@require_login
def update(decision_id):
    try:
        data = update_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    decision, error = update_decision(
        decision_id, data, actor_id=g.current_user.id
    )

    if error:
        status_code = 404 if "not found" in error.lower() else 400
        return jsonify({"error": error}), status_code

    return jsonify({"decision": decision.to_dict()}), 200


@decision_bp.route("/<int:decision_id>/status", methods=["PATCH"])
@require_login
def change_status(decision_id):
    """Advance the status of a decision through the workflow.
    Draft → Proposed (any member), Proposed → Decided (admin only).
    """
    try:
        data = status_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    new_status = data["new_status"]

    # Proposed → Decided requires admin
    if new_status == "Decided" and not g.current_user.is_admin:
        return jsonify({"error": "Only admins can approve decisions."}), 403

    decision, error = transition_status(
        decision_id, new_status, actor_id=g.current_user.id
    )

    if error:
        status_code = 404 if "not found" in error.lower() else 400
        return jsonify({"error": error}), status_code

    return jsonify({"decision": decision.to_dict()}), 200


@decision_bp.route("/<int:decision_id>/supersede", methods=["POST"])
@require_login
def supersede(decision_id):
    """Create a new decision that supersedes an existing Decided one."""
    try:
        data = supersede_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    new_decision, error = supersede_decision(
        decision_id, data, actor_id=g.current_user.id
    )

    if error:
        status_code = 404 if "not found" in error.lower() else 400
        return jsonify({"error": error}), status_code

    return jsonify({"decision": new_decision.to_dict()}), 201


@decision_bp.route("/<int:decision_id>", methods=["DELETE"])
@require_admin
def delete(decision_id):
    """Soft-delete a decision. Admin only."""
    decision, error = soft_delete_decision(
        decision_id, actor_id=g.current_user.id
    )

    if error:
        status_code = 404 if "not found" in error.lower() else 400
        return jsonify({"error": error}), status_code

    return jsonify({"message": "Decision deleted."}), 200
