from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from middleware.auth_middleware import require_login
from schemas.project_schema import CreateProjectSchema, UpdateProjectSchema
from services.project_service import list_projects, get_project, create_project, update_project

project_bp = Blueprint("projects", __name__, url_prefix="/api/projects")

create_schema = CreateProjectSchema()
update_schema = UpdateProjectSchema()


@project_bp.route("", methods=["GET"])
@require_login
def index():
    include_archived = request.args.get("include_archived", "false").lower() == "true"
    projects = list_projects(include_archived=include_archived)
    return jsonify({"projects": [p.to_dict() for p in projects]}), 200


@project_bp.route("/<int:project_id>", methods=["GET"])
@require_login
def show(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Project not found."}), 404
    return jsonify({"project": project.to_dict()}), 200


@project_bp.route("", methods=["POST"])
@require_login
def create():
    try:
        data = create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    project, error = create_project(
        name=data["name"],
        description=data.get("description", ""),
        created_by=g.current_user.id,
    )

    if error:
        return jsonify({"error": error}), 409

    return jsonify({"project": project.to_dict()}), 201


@project_bp.route("/<int:project_id>", methods=["PATCH"])
@require_login
def update(project_id):
    try:
        data = update_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    project, error = update_project(project_id, **data)

    if error:
        status = 404 if "not found" in error.lower() else 409
        return jsonify({"error": error}), status

    return jsonify({"project": project.to_dict()}), 200
