from extensions import db
from models.decision import Decision, STATUS_TRANSITIONS, decision_tags
from models.option import Option
from models.tag import Tag
from models.audit_log import AuditLog
from models.project import Project


def list_decisions(project_id=None, status=None, tag_id=None, include_deleted=False):
    """Return decisions with optional filters."""
    query = Decision.query

    if not include_deleted:
        query = query.filter_by(is_deleted=False)
    if project_id:
        query = query.filter_by(project_id=project_id)
    if status:
        query = query.filter_by(status=status)
    if tag_id:
        query = query.filter(Decision.tags.any(Tag.id == tag_id))

    return query.order_by(Decision.updated_at.desc()).all()


def get_decision(decision_id):
    return db.session.get(Decision, decision_id)


def create_decision(data, created_by):
    """Create a decision with options and tags. Returns (decision, None) or (None, error)."""
    # Verify project exists
    project = db.session.get(Project, data["project_id"])
    if not project:
        return None, "Project not found."
    if project.is_archived:
        return None, "Cannot add decisions to an archived project."

    decision = Decision(
        project_id=data["project_id"],
        title=data["title"],
        context=data["context"],
        final_summary=data.get("final_summary", ""),
        created_by=created_by,
        decision_date=data.get("decision_date"),
        status="Draft",
    )
    db.session.add(decision)
    db.session.flush()  # get decision.id

    # Add options
    _sync_options(decision, data.get("options", []))

    # Add tags
    _sync_tags(decision, data.get("tag_ids", []))

    # Audit: created
    audit = AuditLog(
        decision_id=decision.id,
        actor_id=created_by,
        action="created",
        old_status=None,
        new_status="Draft",
    )
    db.session.add(audit)
    db.session.commit()

    return decision, None


def update_decision(decision_id, data, actor_id):
    """Update a decision's editable fields. Returns (decision, None) or (None, error)."""
    decision = db.session.get(Decision, decision_id)
    if not decision:
        return None, "Decision not found."

    if decision.status == "Decided":
        return None, "Decided decisions are immutable. Supersede instead."

    if decision.status == "Superseded":
        return None, "Superseded decisions cannot be edited."

    # Update scalar fields
    for field in ("title", "context", "final_summary", "decision_date"):
        if field in data:
            setattr(decision, field, data[field])

    # Sync options if provided
    if "options" in data:
        _sync_options(decision, data["options"])

    # Sync tags if provided
    if "tag_ids" in data:
        _sync_tags(decision, data["tag_ids"])

    # Audit: edited
    audit = AuditLog(
        decision_id=decision.id,
        actor_id=actor_id,
        action="edited",
    )
    db.session.add(audit)
    db.session.commit()

    return decision, None


def transition_status(decision_id, new_status, actor_id):
    """Advance a decision through the status workflow.
    Returns (decision, None) or (None, error).
    """
    decision = db.session.get(Decision, decision_id)
    if not decision:
        return None, "Decision not found."

    old_status = decision.status
    allowed = STATUS_TRANSITIONS.get(old_status, [])

    if new_status not in allowed:
        return None, f"Cannot transition from {old_status} to {new_status}."

    decision.status = new_status
    audit = AuditLog(
        decision_id=decision.id,
        actor_id=actor_id,
        action="status_change",
        old_status=old_status,
        new_status=new_status,
    )
    db.session.add(audit)
    db.session.commit()

    return decision, None


def supersede_decision(old_decision_id, data, actor_id):
    """Create a new decision that supersedes an existing Decided one.
    Returns (new_decision, None) or (None, error).
    """
    old = db.session.get(Decision, old_decision_id)
    if not old:
        return None, "Original decision not found."
    if old.status != "Decided":
        return None, "Only Decided decisions can be superseded."
    if old.superseded_by is not None:
        return None, "This decision has already been superseded."

    # Create the new decision in the same project
    new_decision = Decision(
        project_id=old.project_id,
        title=data["title"],
        context=data["context"],
        final_summary=data.get("final_summary", ""),
        created_by=actor_id,
        decision_date=data.get("decision_date"),
        status="Draft",
    )
    db.session.add(new_decision)
    db.session.flush()

    # Add options and tags to new decision
    _sync_options(new_decision, data.get("options", []))
    _sync_tags(new_decision, data.get("tag_ids", []))

    # Mark old decision as superseded
    old.status = "Superseded"
    old.superseded_by = new_decision.id

    # Audit entries for both
    reason = data.get("reason", "")
    supersede_note = f"Superseded by decision #{new_decision.id}"
    if reason:
        supersede_note += f" — {reason}"
    db.session.add(AuditLog(
        decision_id=old.id,
        actor_id=actor_id,
        action="superseded",
        old_status="Decided",
        new_status="Superseded",
        note=supersede_note,
    ))
    db.session.add(AuditLog(
        decision_id=new_decision.id,
        actor_id=actor_id,
        action="created",
        old_status=None,
        new_status="Draft",
        note=f"Supersedes decision #{old.id}",
    ))

    db.session.commit()
    return new_decision, None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sync_options(decision, options_data):
    """Replace all options on a decision with the provided list."""
    # Remove existing options
    Option.query.filter_by(decision_id=decision.id).delete()

    chosen_count = sum(1 for o in options_data if o.get("is_chosen"))
    if chosen_count > 1:
        raise ValueError("Only one option can be marked as chosen.")

    for i, opt in enumerate(options_data):
        option = Option(
            decision_id=decision.id,
            title=opt["title"],
            pros=opt.get("pros", ""),
            cons=opt.get("cons", ""),
            is_chosen=opt.get("is_chosen", False),
            position=opt.get("position", i),
        )
        db.session.add(option)


def _sync_tags(decision, tag_ids):
    """Replace all tags on a decision with the provided IDs."""
    decision.tags = []
    if tag_ids:
        tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()
        decision.tags = tags


def soft_delete_decision(decision_id, actor_id):
    """Soft-delete a decision (admin-only). Returns (decision, None) or (None, error)."""
    decision = db.session.get(Decision, decision_id)
    if not decision:
        return None, "Decision not found."
    if decision.is_deleted:
        return None, "Decision is already deleted."

    decision.is_deleted = True

    audit = AuditLog(
        decision_id=decision.id,
        actor_id=actor_id,
        action="deleted",
        old_status=decision.status,
        new_status=decision.status,
        note="Soft-deleted by admin",
    )
    db.session.add(audit)
    db.session.commit()

    return decision, None
