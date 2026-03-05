from models.audit_log import AuditLog


def get_audit_for_decision(decision_id):
    """Return all audit entries for a single decision, newest first."""
    return (
        AuditLog.query
        .filter_by(decision_id=decision_id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )


def get_system_audit(limit=100):
    """Return recent audit entries system-wide (admin view)."""
    return (
        AuditLog.query
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
