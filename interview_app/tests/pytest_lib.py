import pytest
from peewee import SqliteDatabase

from skillsense_ai import create_app
from db.db_utils import tables_alllocal, init_memory_db, init_test_db, populate_test_db
from db.models import database_proxy

from defaultsettings import config
# from db.db_utils import tables_alllocal, init_memory_db, init_test_db

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app(config['testing'])
    # Create tables in the test database
    with app.app_context():
        db = init_memory_db()  # This should create all the tables
        # db.bind(tables_alllocal)
        app.db = db
        app.config["simulator"].db = db
        yield app
    return app

@pytest.fixture
def app_local():
    """Create and configure a new app instance for each test."""
    app = create_app(config['DEBUG'])
    # Create tables in the test database
    with app.app_context():
        db = init_test_db()  # This should create all the tables
        db.bind(tables_alllocal)
        yield app
    return app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()