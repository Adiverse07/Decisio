"""Seed realistic demo data for the Decisio MVP.

Run: python seed_demo.py
"""
from app import create_app
from extensions import db
from models import User, Project, Decision, Option, Tag, AuditLog, decision_tags
from datetime import date, datetime, timezone, timedelta

app = create_app()

def utcnow(offset_days=0):
    return datetime.now(timezone.utc) - timedelta(days=-offset_days)

with app.app_context():
    # Grab existing users
    admin = User.query.filter_by(email="admin@decisio.local").first()
    alice = User.query.filter_by(email="alice@example.com").first()
    bob = User.query.filter_by(email="bob@example.com").first()
    carol = User.query.filter_by(email="carol@example.com").first()

    if not admin:
        print("Run seed_admin.py and seed_users.py first!")
        exit(1)

    # ── Tags ──
    tag_names = ["architecture", "frontend", "backend", "security", "devops",
                 "database", "performance", "testing", "ux"]
    tag_map = {}
    for name in tag_names:
        t = Tag.query.filter_by(name=name).first()
        if not t:
            t = Tag(name=name)
            db.session.add(t)
            db.session.flush()
        tag_map[name] = t

    # ── Projects ──
    def get_or_create_project(name, desc, creator):
        p = Project.query.filter_by(name=name).first()
        if not p:
            p = Project(name=name, description=desc, created_by=creator.id)
            db.session.add(p)
            db.session.flush()
        return p

    p_auth  = get_or_create_project("Auth Service", "Authentication and authorization service for the platform.", admin)
    p_plat  = get_or_create_project("Platform Rewrite", "Rewriting the monolith into microservices.", admin)
    p_dash  = get_or_create_project("Dashboard v2", "Next-gen analytics dashboard for enterprise customers.", alice or admin)
    p_infra = get_or_create_project("Infrastructure", "Cloud infrastructure, CI/CD, and DevOps tooling decisions.", bob or admin)

    # ── Decisions ──
    def create_decision(project, title, context, summary, status, creator, tags, options, days_ago=0):
        """Create a decision with options, tags, and audit - skip if title already exists."""
        existing = Decision.query.filter_by(title=title, project_id=project.id).first()
        if existing:
            return existing

        d = Decision(
            project_id=project.id,
            title=title,
            context=context,
            final_summary=summary,
            status="Draft",
            created_by=creator.id,
            decision_date=date.today() - timedelta(days=days_ago),
        )
        db.session.add(d)
        db.session.flush()

        # Options
        for i, opt in enumerate(options):
            o = Option(
                decision_id=d.id,
                title=opt["title"],
                pros=opt.get("pros", ""),
                cons=opt.get("cons", ""),
                is_chosen=opt.get("chosen", False),
                position=i,
            )
            db.session.add(o)

        # Tags
        for tag_name in tags:
            if tag_name in tag_map:
                d.tags.append(tag_map[tag_name])

        # Audit
        db.session.add(AuditLog(
            decision_id=d.id, actor_id=creator.id,
            action="created", new_status="Draft",
        ))
        db.session.flush()

        # Advance status
        if status in ("Proposed", "Decided"):
            d.status = "Proposed"
            db.session.add(AuditLog(
                decision_id=d.id, actor_id=creator.id,
                action="status_change", old_status="Draft", new_status="Proposed",
            ))
            db.session.flush()

        if status == "Decided":
            d.status = "Decided"
            db.session.add(AuditLog(
                decision_id=d.id, actor_id=admin.id,
                action="status_change", old_status="Proposed", new_status="Decided",
            ))
            db.session.flush()

        return d

    # Platform Rewrite decisions
    create_decision(
        p_plat,
        "API Framework Selection",
        "We need to choose a web framework for the new microservices. The team has experience with Flask and FastAPI. We need good async support and OpenAPI docs.",
        "Going with FastAPI for its async-first design, automatic OpenAPI generation, and Pydantic validation.",
        "Decided", admin, ["architecture", "backend"],
        [
            {"title": "Flask", "pros": "Mature ecosystem\nTeam familiarity\nExtensive plugin library", "cons": "No native async\nManual OpenAPI setup\nSchema validation is separate", "chosen": False},
            {"title": "FastAPI", "pros": "Native async/await\nAutomatic OpenAPI docs\nBuilt-in Pydantic validation\nHigh performance", "cons": "Younger ecosystem\nSmaller community\nLearning curve for team", "chosen": True},
            {"title": "Django REST Framework", "pros": "Batteries included\nExcellent admin interface\nMature ORM", "cons": "Heavy for microservices\nSync by default\nToo opinionated for our needs", "chosen": False},
        ],
        days_ago=14,
    )

    create_decision(
        p_plat,
        "Database Strategy",
        "With the move to microservices, we need to decide on the data layer. Options range from keeping a shared PostgreSQL to per-service databases.",
        "Each service gets its own PostgreSQL schema. Shared database, separate schemas gives us isolation without operational overhead.",
        "Decided", bob or admin, ["architecture", "database"],
        [
            {"title": "Shared DB, shared schema", "pros": "Simple setup\nEasy joins across services", "cons": "Tight coupling\nMigration conflicts\nNo isolation", "chosen": False},
            {"title": "Shared DB, separate schemas", "pros": "Logical isolation\nSingle DB to manage\nCross-schema queries possible", "cons": "Still one failure point\nSchema naming conventions needed", "chosen": True},
            {"title": "Separate databases per service", "pros": "Full isolation\nIndependent scaling\nTechnology freedom", "cons": "Operational complexity\nDistributed transactions\nData consistency challenges", "chosen": False},
        ],
        days_ago=12,
    )

    create_decision(
        p_plat,
        "Message Queue Selection",
        "We need async communication between microservices for event-driven workflows like user registration, order processing, and notifications.",
        "",
        "Proposed", carol or admin, ["architecture", "backend", "devops"],
        [
            {"title": "RabbitMQ", "pros": "Mature and battle-tested\nFlexible routing\nManagement UI", "cons": "Erlang dependency\nComplex clustering", "chosen": False},
            {"title": "Apache Kafka", "pros": "High throughput\nEvent replay\nGreat for event sourcing", "cons": "Complex setup\nJVM dependency\nOverkill for our scale", "chosen": False},
            {"title": "Redis Streams", "pros": "Already using Redis\nSimple setup\nLow latency", "cons": "Limited durability guarantees\nNo advanced routing", "chosen": False},
        ],
        days_ago=5,
    )

    # Dashboard v2 decisions
    create_decision(
        p_dash,
        "Charting Library",
        "The new dashboard needs interactive charts — bar, line, pie, heat maps. Must support real-time updates and be accessible.",
        "Recharts selected for its React-native API, good defaults, and accessibility features.",
        "Decided", alice or admin, ["frontend", "ux"],
        [
            {"title": "Recharts", "pros": "React-native composable API\nGood accessibility\nCustomizable", "cons": "Limited chart types\nPerformance with 10k+ points", "chosen": True},
            {"title": "Chart.js via react-chartjs-2", "pros": "Many chart types\nSmall bundle\nActive maintainers", "cons": "Canvas-based (not SVG)\nLess React-idiomatic\nAccessibility concerns", "chosen": False},
            {"title": "D3.js", "pros": "Maximum flexibility\nSVG-based\nIndustry standard", "cons": "Steep learning curve\nNot React-friendly\nHigh dev effort", "chosen": False},
        ],
        days_ago=8,
    )

    create_decision(
        p_dash,
        "State Management Approach",
        "The dashboard has complex client-side state: filters, cached API responses, user preferences, and real-time WebSocket data.",
        "",
        "Draft", alice or admin, ["frontend", "architecture"],
        [
            {"title": "React Query + Zustand", "pros": "Server state separated from UI state\nAutomatic caching/revalidation\nSmall bundle", "cons": "Two libraries to learn\nMore boilerplate for simple cases", "chosen": False},
            {"title": "Redux Toolkit", "pros": "Industry standard\nExcellent DevTools\nRTK Query for API", "cons": "Boilerplate-heavy\nOverkill for this app size\nSteep learning curve", "chosen": False},
            {"title": "Context + SWR", "pros": "Minimal dependencies\nSimple mental model\nBuilt into React", "cons": "Context performance issues at scale\nNo DevTools\nManual cache management", "chosen": False},
        ],
        days_ago=2,
    )

    # Infrastructure decisions
    create_decision(
        p_infra,
        "Container Orchestration",
        "We need to deploy and manage our microservices. Currently using docker-compose on EC2. Need auto-scaling and zero-downtime deployments.",
        "ECS Fargate chosen for balance of simplicity and power. Avoids Kubernetes complexity while giving us auto-scaling.",
        "Decided", bob or admin, ["devops", "architecture"],
        [
            {"title": "AWS ECS Fargate", "pros": "Serverless containers\nAWS-native integration\nSimpler than K8s\nAuto-scaling built-in", "cons": "AWS vendor lock-in\nLess portable\nFewer community tools", "chosen": True},
            {"title": "Kubernetes (EKS)", "pros": "Industry standard\nHuge ecosystem\nPortable across clouds", "cons": "Operational complexity\nKubernetes expertise needed\nCostly for small teams", "chosen": False},
            {"title": "AWS Lambda", "pros": "Zero infrastructure\nPay per invocation\nAuto-scaling", "cons": "Cold starts\nVendor lock-in\n15-min execution limit\nNot suitable for all workloads", "chosen": False},
        ],
        days_ago=10,
    )

    create_decision(
        p_infra,
        "CI/CD Pipeline Tooling",
        "Need to set up continuous integration and deployment. Currently using manual deployments. Require automated testing, staging, and production deployments.",
        "",
        "Draft", carol or admin, ["devops", "testing"],
        [
            {"title": "GitHub Actions", "pros": "GitHub-native\nGreat marketplace\nFree for public repos\nYAML-based", "cons": "Limited caching\nRunner limitations\nComplex matrix builds", "chosen": False},
            {"title": "GitLab CI/CD", "pros": "Tightly integrated with GitLab\nBuilt-in container registry\nAuto DevOps", "cons": "Requires GitLab\nYAML complexity\nRunner management", "chosen": False},
            {"title": "CircleCI", "pros": "Fast builds\nDocker-native\nGood parallelism", "cons": "Pricing model\nLimited free tier\nAnother vendor to manage", "chosen": False},
        ],
        days_ago=1,
    )

    db.session.commit()
    print("Demo data seeded successfully!")
    print(f"  Projects: {Project.query.count()}")
    print(f"  Decisions: {Decision.query.count()}")
    print(f"  Tags: {Tag.query.count()}")
    print(f"  Audit entries: {AuditLog.query.count()}")
