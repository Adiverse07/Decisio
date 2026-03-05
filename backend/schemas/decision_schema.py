from marshmallow import Schema, fields, validate, validates, ValidationError

from models.decision import VALID_STATUSES
from schemas.option_schema import OptionInputSchema


class CreateDecisionSchema(Schema):
    project_id = fields.Int(required=True)
    title = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    context = fields.Str(required=True, validate=validate.Length(min=1))
    final_summary = fields.Str(load_default="")
    decision_date = fields.Date(load_default=None)
    tag_ids = fields.List(fields.Int(), load_default=[])
    options = fields.List(fields.Nested(OptionInputSchema), load_default=[])


class UpdateDecisionSchema(Schema):
    title = fields.Str(validate=validate.Length(min=1, max=255))
    context = fields.Str(validate=validate.Length(min=1))
    final_summary = fields.Str()
    decision_date = fields.Date()
    tag_ids = fields.List(fields.Int())
    options = fields.List(fields.Nested(OptionInputSchema))


class StatusTransitionSchema(Schema):
    new_status = fields.Str(
        required=True,
        validate=validate.OneOf(VALID_STATUSES),
    )

    @validates("new_status")
    def validate_not_draft(self, value):
        """Draft is the initial state — you can't transition *to* Draft."""
        if value == "Draft":
            raise ValidationError("Cannot transition to Draft.")


class SupersedeDecisionSchema(Schema):
    """Body for POST /api/decisions/:id/supersede — creates a NEW decision
    that supersedes the one identified by :id."""
    title = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    context = fields.Str(required=True, validate=validate.Length(min=1))
    final_summary = fields.Str(load_default="")
    decision_date = fields.Date(load_default=None)
    tag_ids = fields.List(fields.Int(), load_default=[])
    options = fields.List(fields.Nested(OptionInputSchema), load_default=[])
    reason = fields.Str(load_default="")
