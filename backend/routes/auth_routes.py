from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from schemas.user_schema import LoginSchema
from services.auth_service import authenticate
from middleware.auth_middleware import require_login

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

login_schema = LoginSchema()


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = login_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    user, token_or_error = authenticate(data["email"], data["password"])

    if user is None:
        return jsonify({"error": token_or_error}), 401

    return jsonify({
        "token": token_or_error,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@require_login
def me():
    return jsonify({"user": g.current_user.to_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
@require_login
def logout():
    # JWT is stateless — logout is handled client-side by discarding the token.
    # This endpoint exists so the frontend has a clean API to call.
    return jsonify({"message": "Logged out."}), 200
