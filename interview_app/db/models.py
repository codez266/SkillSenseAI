from peewee import *
from db.config import CONFIG

# database = MySQLDatabase('adaptive_learning_concepts', **{'charset': 'utf8', 'sql_mode':
#     'PIPES_AS_CONCAT', 'use_unicode': True, 'host': CONFIG.get('db', 'host'),
#     'user': CONFIG.get('db', 'user'), 'password': CONFIG.get('db', 'password')})

database_proxy = DatabaseProxy()

class UnknownField(object):
    def __init__(self, *_, **__): pass

class BaseModel(Model):
    class Meta:
        database = database_proxy
        # database = database

class Artifact(BaseModel):
    artifact_id = AutoField()
    artifact_level = CharField(null=True)
    artifact_metadata = UnknownField(null=True)  # json
    artifact_problem = CharField(null=True)
    artifact_valid = IntegerField(constraints=[SQL("DEFAULT 0")], null=True)
    artifact_value = TextField(null=True)
    created_at = DateTimeField(constraints=[SQL("DEFAULT CURRENT_TIMESTAMP")], null=True)
    updated_at = DateTimeField(constraints=[SQL("DEFAULT CURRENT_TIMESTAMP")], null=True)

    class Meta:
        table_name = 'Artifact'

class InterviewConversation(BaseModel):
    conversation_k_cs = CharField(column_name='conversation_KCs', null=True)
    conversation_id = AutoField()
    conversation_interview_id = IntegerField(null=True)
    conversation_metadata = TextField(null=True)
    conversation_reference = CharField(null=True)
    conversation_reference_kcs = CharField(null=True)
    conversation_response = CharField(null=True)
    conversation_responded = IntegerField(null=True)
    conversation_timestamp = DateTimeField(null=True)
    conversation_turn_id = IntegerField(null=True)
    conversation_turn_number = IntegerField(null=True)

    class Meta:
        table_name = 'interview_conversation'

class Policy(BaseModel):
    policy_desc = CharField(null=True)
    policy_id = AutoField()

    class Meta:
        table_name = 'policy'

class Prompt(BaseModel):
    prompt_id = AutoField()
    prompt_text = TextField(null=True)
    prompt_type = CharField(null=True)

    class Meta:
        table_name = 'prompt'

class Student(BaseModel):
    student_k_cs = CharField(column_name='student_KCs', null=True)
    student_level = CharField(null=True)
    student_type_id = AutoField()

    class Meta:
        table_name = 'student'

class StudentArtifact(BaseModel):
    artifact_id = IntegerField(null=True)
    created_at = DateTimeField(constraints=[SQL("DEFAULT CURRENT_TIMESTAMP")], null=True)
    extracted_kcs = CharField(null=True)
    problem_solution = TextField(null=True)
    problem_statement = CharField(null=True)
    student_artifact_id = AutoField()
    student_id = IntegerField(null=True)
    updated_at = DateTimeField(constraints=[SQL("DEFAULT CURRENT_TIMESTAMP")], null=True)

    class Meta:
        table_name = 'student_artifact'

class StudentInterviewRecord(BaseModel):
    interview_id = AutoField()
    interview_metadata = TextField(null=True)
    interview_problem_id = IntegerField(null=True)
    interview_student_type_id = IntegerField(null=True)
    interview_timestamp = DateTimeField(null=True)
    interview_policy = IntegerField(null=True)

    class Meta:
        table_name = 'student_interview_record'

