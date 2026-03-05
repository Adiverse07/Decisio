from flask import Blueprint, request, jsonify
from marshmallow import ValidationError

from middleware.auth_middleware import require_login
from schemas.tag_schema import CreateTagSchema
from extensions import db
from models.tag import Tag

tag_bp = Blueprint("tags", __name__, url_prefix="/api/tags")

create_schema = CreateTagSchema()


@tag_bp.route("", methods=["GET"])
@require_login
def index():
    tags = Tag.query.order_by(Tag.name).all()
    return jsonify({"tags": [t.to_dict() for t in tags]}), 200


@tag_bp.route("", methods=["POST"])
@require_login
def create():
    try:
        data = create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed.", "details": err.messages}), 400

    existing = Tag.query.filter_by(name=data["name"]).first()
    if existing:
        return jsonify({"error": "Tag already exists."}), 409

    tag = Tag(name=data["name"])
    db.session.add(tag)
    db.session.commit()

    return jsonify({"tag": tag.to_dict()}), 201
