from marshmallow import Schema, fields, validate


class CreateTagSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
