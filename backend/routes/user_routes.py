from flask import Blueprint, request, jsonify
from marshmallow import ValidationError

from middleware.admin_middleware import require_admin
from schemas.user_schema import CreateUserSchema, UpdateUserSchema
from services.user_service import (
    list_users,
    get_user,
    create_user,
    update_user,
    toggle_active,
)

user_bp = Blueprint("users", __name__, url_prefix="/api/users")

create_schema = CreateUserSchema()
update_schema = UpdateUserSchema()


@user_bp.route("", methods=["GET"])
@require_admin
def index():
    users = list_users()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


@user_bp.route("/<int:user_id>", methods=["GET"])
@require_admin
def show(user_id):
    user = get_user(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": user.to_dict()}), 200


@user_bp.route("", methods=["POST"])
@require_admin
def create():
    try:
        data = create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    user, error = create_user(
        name=data["name"],
        email=data["email"],
        password=data["password"],
        is_admin=data.get("is_admin", False),
    )

    if error:
        return jsonify({"error": error}), 409

    return jsonify({"user": user.to_dict()}), 201


@user_bp.route("/<int:user_id>", methods=["PATCH"])
@require_admin
def edit(user_id):
    try:
        data = update_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    user, error = update_user(user_id, **data)
    if error:
        return jsonify({"error": error}), 404 if "not found" in error.lower() else 409

    return jsonify({"user": user.to_dict()}), 200


@user_bp.route("/<int:user_id>/toggle-active", methods=["PATCH"])
@require_admin
def toggle(user_id):
    user, error = toggle_active(user_id)
    if error:
        return jsonify({"error": error}), 404
    return jsonify({"user": user.to_dict()}), 200
