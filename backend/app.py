import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

from config import config_by_name
from extensions import db, migrate, bcrypt
import models  # noqa: F401 — ensures models are registered for migrations


def create_app(config_name=None):
    """Application factory — creates and configures the Flask app."""

    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)

    # CORS — allow frontend dev server
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # Register blueprints
    from routes.auth_routes import auth_bp
    from routes.user_routes import user_bp
    from routes.project_routes import project_bp
    from routes.decision_routes import decision_bp
    from routes.tag_routes import tag_bp
    from routes.audit_routes import audit_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(project_bp)
    app.register_blueprint(decision_bp)
    app.register_blueprint(tag_bp)
    app.register_blueprint(audit_bp)

    # Health check
    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    # Global error handlers — always return JSON
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": str(e.description)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"Internal server error: {e}")
        return jsonify({"error": "Internal server error."}), 500

    @app.errorhandler(ValueError)
    def handle_value_error(e):
        return jsonify({"error": str(e)}), 400

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
