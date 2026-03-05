from extensions import db
from datetime import datetime, timezone


class AuditLog(db.Model):
    __tablename__ = "audit_log"
    __table_args__ = (
        db.Index("idx_audit_log_decision_id", "decision_id"),
        db.Index("idx_audit_log_actor_id", "actor_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    decision_id = db.Column(
        db.Integer, db.ForeignKey("decisions.id"), nullable=False
    )
    actor_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )
    action = db.Column(db.String(100), nullable=False)
    old_status = db.Column(db.String(20), nullable=True)
    new_status = db.Column(db.String(20), nullable=True)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    actor = db.relationship("User", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "decision_id": self.decision_id,
            "actor_id": self.actor_id,
            "actor_name": self.actor.name if self.actor else None,
            "action": self.action,
            "old_status": self.old_status,
            "new_status": self.new_status,
            "note": self.note,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<AuditLog {self.action} on Decision {self.decision_id}>"
