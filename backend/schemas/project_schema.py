from marshmallow import Schema, fields, validate


class CreateProjectSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    description = fields.Str(load_default="")


class UpdateProjectSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=150))
    description = fields.Str()
    is_archived = fields.Bool()
