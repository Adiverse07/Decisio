from marshmallow import Schema, fields, validate


class OptionInputSchema(Schema):
    """Used inside decision create/update — not a standalone endpoint."""
    title = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    pros = fields.Str(load_default="")
    cons = fields.Str(load_default="")
    is_chosen = fields.Bool(load_default=False)
    position = fields.Int(load_default=0)
