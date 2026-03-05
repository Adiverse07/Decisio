from extensions import db
from datetime import datetime, timezone, date


# Enum values — used as VARCHAR, enforced in Python and via CHECK constraints
VALID_STATUSES = ("Draft", "Proposed", "Decided", "Superseded")

# Allowed transitions: from_status -> [to_statuses]
STATUS_TRANSITIONS = {
    "Draft": ["Proposed"],
    "Proposed": ["Decided"],
    "Decided": ["Superseded"],
    "Superseded": [],
}


# Many-to-many join table for decisions <-> tags
decision_tags = db.Table(
    "decision_tags",
    db.Column(
        "decision_id",
        db.Integer,
        db.ForeignKey("decisions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "tag_id",
        db.Integer,
        db.ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Decision(db.Model):
    __tablename__ = "decisions"
    __table_args__ = (
        # A decision cannot supersede itself
        db.CheckConstraint("superseded_by != id", name="no_self_supersede"),
        # If superseded_by is set, status must be 'Superseded'
        db.CheckConstraint(
            "(superseded_by IS NULL) OR (status = 'Superseded')",
            name="supersede_status_sync",
        ),
        # No two decisions can supersede the same original
        db.Index(
            "idx_decisions_superseded_by",
            "superseded_by",
            unique=True,
            postgresql_where=db.text("superseded_by IS NOT NULL"),
        ),
        db.Index("idx_decisions_project_id", "project_id"),
        db.Index("idx_decisions_status", "status"),
        db.Index("idx_decisions_created_by", "created_by"),
    )

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(
        db.Integer, db.ForeignKey("projects.id"), nullable=False
    )
    title = db.Column(db.String(255), nullable=False)
    context = db.Column(db.Text, nullable=False)
    final_summary = db.Column(db.Text, nullable=False, default="")
    status = db.Column(
        db.String(20), nullable=False, default="Draft"
    )
    created_by = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )
    decision_date = db.Column(db.Date, nullable=False, default=date.today)
    superseded_by = db.Column(
        db.Integer, db.ForeignKey("decisions.id"), nullable=True
    )
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    creator = db.relationship("User", foreign_keys=[created_by], lazy="joined")
    options = db.relationship(
        "Option",
        backref="decision",
        lazy="joined",
        cascade="all, delete-orphan",
        order_by="Option.position",
    )
    tags = db.relationship(
        "Tag", secondary=decision_tags, backref="decisions", lazy="joined"
    )
    audit_entries = db.relationship(
        "AuditLog", backref="decision", lazy="dynamic", order_by="AuditLog.created_at.desc()"
    )

    def to_dict(self, include_options=True, include_tags=True):
        data = {
            "id": self.id,
            "project_id": self.project_id,
            "project_name": self.project.name if self.project else None,
            "title": self.title,
            "context": self.context,
            "final_summary": self.final_summary,
            "status": self.status,
            "created_by": self.created_by,
            "creator_name": self.creator.name if self.creator else None,
            "decision_date": self.decision_date.isoformat() if self.decision_date else None,
            "superseded_by": self.superseded_by,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_options:
            data["options"] = [o.to_dict() for o in self.options]
        if include_tags:
            data["tags"] = [t.to_dict() for t in self.tags]
        return data

    def __repr__(self):
        return f"<Decision {self.id}: {self.title}>"
