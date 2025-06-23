import json
import os
import importlib.resources
from html import escape

from peewee import *
from db.models import Experiment, StudentArtifact, StudentInterviewRecord, Student, InterviewConversation, Artifact, database_proxy
from db.config import CONFIG
from adaptive_concept_selection.utils.data_extraction_utilities import get_kcs
# from db.connection_pool import ReconnectMySQLDatabase

from flask import current_app, g

import click

tables_alllocal = [Experiment, StudentArtifact, StudentInterviewRecord, Student, InterviewConversation, Artifact]
tables = tables_alllocal

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def refresh_db_proxy(db, db_proxy):
    """Refresh the database proxy to ensure it uses the latest database connection."""
    # Initialize database proxy if not already done
    if db_proxy.obj is None:
        db_proxy.initialize(db)

    # Check if connection is usable (for ReconnectMySQLDatabase)
    if hasattr(db_proxy.obj, 'is_connection_usable'):
        if not db_proxy.obj.is_connection_usable():
            db_proxy.obj.connect()
    elif db_proxy.obj.is_closed():
        db_proxy.obj.connect()

def create_tables(db, reset=False):
    created = False
    if reset:
        db.drop_tables(tables_alllocal)
        db.create_tables(tables_alllocal)
        created = True
    elif not db.get_tables():
        db.create_tables(tables_alllocal)
        created = True
    return created

def init_real_db(config=None):
    db = MySQLDatabase('adaptive_learning_concepts', **{'charset': 'utf8', 'sql_mode':
    'PIPES_AS_CONCAT', 'use_unicode': True, 'host': config.get('db', 'host'),
    'user': config.get('db', 'user'), 'password': config.get('db', 'password')})
    database_proxy.initialize(db)
    # db = ReconnectMySQLDatabase('adaptive_learning_concepts', **{
    #     'charset': 'utf8',
    #     'sql_mode': 'PIPES_AS_CONCAT',
    #     'use_unicode': True,
    #     'host': config.get('db', 'host'),
    #     'user': config.get('db', 'user'),
    #     'password': config.get('db', 'password'),
    #     # Connection pool and timeout settings
    #     'max_connections': 20,
    #     'stale_timeout': 300,  # 5 minutes
    #     'timeout': 10,
    #     'connect_timeout': 10,
    #     'read_timeout': 10,
    #     'write_timeout': 10,
    #     'autocommit': True,
    #     'autoconnect': True,
    #     # Custom retry settings
    #     'max_retries': 3,
    #     'retry_delay': 1
    # })
    return db

def init_test_db(reset=False):
    db = SqliteDatabase('agent.db')
    # db.bind(tables)
    database_proxy.initialize(db)
    created = create_tables(db, reset)
    if created:
        populate_test_db()
    return db

def init_memory_db(reset=False):
    # db = SqliteDatabase(':memory:')
    db = SqliteDatabase("file:memdb1?mode=memory&cache=shared", uri=True)
    # db.bind(tables)
    database_proxy.initialize(db)
    created = create_tables(db, reset)
    if created:
        populate_test_db()
    return db

def format_problem_html(problem):
    title_html = f"<h4>{escape(problem['title'])}</h4>"
    description_html = f"<p>{escape(problem['description'])}</p>"
    question_html = f"<p>Q. {escape(problem['question'])}</p>"
    return f"{title_html}\n{description_html}\n{question_html}"

def write_student_artifact():
    problem_records = []
    data = json.loads((importlib.resources.files("adaptive_concept_selection.resources.json") / "output_all.json").read_text())
    levels = ["beginner", "intermediate", "expert"]
    artifacts = []
    for problem in data["problem"]:
        problem_id = problem["problem_id"]
        problem_statement = problem["problem_statement"]
        for level in levels:
            problem_solution = problem[level][0]["problem_solution"]
            problem_kcs = ",".join(problem[level][0]["kcs"])
            student = Student.get_or_none(Student.student_level==level)
            student_id = student.student_type_id
            problem_records.append((problem_statement, problem_solution, problem_kcs, student_id))
            # artifacts.append((level, problem_statement, problem_solution))
    StudentArtifact.insert_many(problem_records, fields=[
        StudentArtifact.problem_statement, StudentArtifact.problem_solution,
        StudentArtifact.extracted_kcs,
        StudentArtifact.student_id]).execute()

    ds_data = json.loads((importlib.resources.files(
        "adaptive_concept_selection.resources.json") / "ds_problems.json").read_text())
    for problem in ds_data["problems"]:
        problem_statement = format_problem_html(problem)
        problem_solution = problem["solution"]
        level = problem["level"]
        artifacts.append((level, problem_statement, problem_solution))
    Artifact.insert_many(artifacts, fields=[
        Artifact.artifact_level, Artifact.artifact_problem, Artifact.artifact_value]).execute()

def write_student_profile():
    kcs = get_kcs()
    student_data = []
    for level in ["beginner", "intermediate", "expert"]:
        kcs_level = kcs[kcs[level] == 1]["concepts"].tolist()
        student_data.append((json.dumps(kcs_level), level))
    recs = Student.insert_many(student_data, fields = [Student.student_k_cs, Student.student_level]).execute()

def populate_test_db():
    write_student_profile()
    write_student_artifact()

def get_db():
    if 'db' in g:
        return g.db
    if current_app.config['DEBUG']:
        g.db = init_test_db()
        # g.db.bind(tables)
    elif current_app.config['TESTING']:
        g.db = init_memory_db()
    else:
        g.db = init_real_db()
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

@click.command('init-db')
def init_db_command():
    """Clear the existing data and create new tables."""
    init_real_db()
    click.echo('Initialized the database.')

@click.command('init-test-db')
def init_test_db_command():
    """Clear the existing data and create new tables."""
    init_test_db()
    click.echo('Initialized the test database.')

def init_app(app):
    #app.teardown_appcontext(close_db)
    app.teardown_request(close_db)
    app.cli.add_command(init_db_command)
    app.cli.add_command(init_test_db_command)

# def db_retry(max_retries=3):
#     """Decorator to retry database operations on connection failures"""
#     def decorator(func):
#         @wraps(func)
#         def wrapper(*args, **kwargs):
#             for attempt in range(max_retries):
#                 try:
#                     return func(*args, **kwargs)
#                 except (OperationalError, InterfaceError) as e:
#                     if "gone away" in str(e).lower() or "broken pipe" in str(e).lower():
#                         if attempt < max_retries - 1:
#                             # Try to reconnect
#                             try:
#                                 if database_proxy.obj and not database_proxy.obj.is_closed():
#                                     database_proxy.obj.close()
#                                 database_proxy.obj.connect()
#                             except Exception:
#                                 pass  # Will retry on next attempt
#                         else:
#                             raise e
#                     else:
#                         raise e
#             return func(*args, **kwargs)
#         return wrapper
#     return decorator