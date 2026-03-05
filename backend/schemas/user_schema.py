from marshmallow import Schema, fields, validate


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=1))


class CreateUserSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=128))
    is_admin = fields.Bool(load_default=False)


class UpdateUserSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=100))
    email = fields.Email()
    is_admin = fields.Bool()
    is_active = fields.Bool()
