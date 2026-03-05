from extensions import db
from models.project import Project


def list_projects(include_archived=False):
    """Return all projects, optionally including archived ones."""
    query = Project.query.order_by(Project.created_at.desc())
    if not include_archived:
        query = query.filter_by(is_archived=False)
    return query.all()


def get_project(project_id):
    return db.session.get(Project, project_id)


def create_project(name, description, created_by):
    """Create a project. Returns (project, None) or (None, error_msg)."""
    if Project.query.filter_by(name=name).first():
        return None, "A project with this name already exists."

    project = Project(name=name, description=description, created_by=created_by)
    db.session.add(project)
    db.session.commit()
    return project, None


def update_project(project_id, **kwargs):
    """Update project fields. Returns (project, None) or (None, error_msg)."""
    project = db.session.get(Project, project_id)
    if not project:
        return None, "Project not found."

    if "name" in kwargs and kwargs["name"] != project.name:
        existing = Project.query.filter_by(name=kwargs["name"]).first()
        if existing:
            return None, "A project with this name already exists."

    for key, value in kwargs.items():
        if hasattr(project, key):
            setattr(project, key, value)

    db.session.commit()
    return project, None
