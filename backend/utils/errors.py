from flask import jsonify


def bad_request(message):
    return jsonify({"error": message}), 400


def unauthorized(message="Authentication required."):
    return jsonify({"error": message}), 401


def forbidden(message="Access denied."):
    return jsonify({"error": message}), 403


def not_found(message="Resource not found."):
    return jsonify({"error": message}), 404


def conflict(message):
    return jsonify({"error": message}), 409
