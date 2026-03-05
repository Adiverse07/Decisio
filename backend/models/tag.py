from extensions import db
from datetime import datetime, timezone


class Tag(db.Model):
    __tablename__ = "tags"
    __table_args__ = (
        db.Index("idx_tags_name", "name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Tag {self.name}>"
