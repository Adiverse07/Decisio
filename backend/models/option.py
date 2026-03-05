from extensions import db
from datetime import datetime, timezone


class Option(db.Model):
    __tablename__ = "options"
    __table_args__ = (
        # Only one option per decision can be marked as chosen
        db.Index(
            "idx_one_chosen_option_per_decision",
            "decision_id",
            unique=True,
            postgresql_where=db.text("is_chosen = true"),
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    decision_id = db.Column(
        db.Integer,
        db.ForeignKey("decisions.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = db.Column(db.String(255), nullable=False)
    pros = db.Column(db.Text, default="")
    cons = db.Column(db.Text, default="")
    is_chosen = db.Column(db.Boolean, nullable=False, default=False)
    position = db.Column(db.SmallInteger, nullable=False, default=0)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "decision_id": self.decision_id,
            "title": self.title,
            "pros": self.pros,
            "cons": self.cons,
            "is_chosen": self.is_chosen,
            "position": self.position,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Option {self.id}: {self.title}>"
