import json
import os
import importlib.resources

from peewee import *
from db.models import StudentArtifact, StudentInterviewRecord, Student, InterviewConversation, Artifact, database_proxy
from db.config import CONFIG

from flask import current_app, g

import click

tables_alllocal = [StudentArtifact, StudentInterviewRecord, Student, InterviewConversation, Artifact]
tables = tables_alllocal

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

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
            artifacts.append((level, problem_statement, problem_solution))
    StudentArtifact.insert_many(problem_records, fields=[
        StudentArtifact.problem_statement, StudentArtifact.problem_solution,
        StudentArtifact.extracted_kcs,
        StudentArtifact.student_id]).execute()
    Artifact.insert_many(artifacts, fields=[
        Artifact.artifact_level, Artifact.artifact_problem, Artifact.artifact_value]).execute()

def write_student_profile():
    john = json.loads((importlib.resources.files("adaptive_concept_selection.resources.json") / "knowledge_john.json").read_text())
    steve = json.loads((importlib.resources.files("adaptive_concept_selection.resources.json") / "knowledge_steve.json").read_text())
    emma = json.loads((importlib.resources.files("adaptive_concept_selection.resources.json") / "knowledge_emma.json").read_text())
    # john beginner, steve intermediate, emma advanced
    student_data = [(", ".join(john["mastered_concepts"]), "beginner"),
                    (", ".join(steve["mastered_concepts"]), "intermediate"),
                    (", ".join(emma["mastered_concepts"]), "expert"),]
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