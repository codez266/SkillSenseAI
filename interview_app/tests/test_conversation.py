import pdb
import pytest
from datetime import datetime
import random
from unittest.mock import patch, MagicMock

from peewee import SqliteDatabase
from adaptive_concept_selection.question_generation.question_generation_cg import SimulatedStudentExperiment
from adaptive_concept_selection.knowledge_graph.knowledge_profile import Question, ResponseData
from adaptive_concept_selection.knowledge_graph.structured_knowledge_profiles import KCsKnowledgeProfile, FixedKnowledgeProfile

from db.models import Student, StudentInterviewRecord
from tests.pytest_lib import app, client
from app import create_app
from adaptive_concept_selection.db.db_utils import tables_alllocal, init_memory_db, init_test_db
from defaultsettings import config

def mock_conversation_helper(app):
    """Sets up the mock knowledge profiles in the simulator for simulating mock responses."""
    simulator = app.config["simulator"]
    knowledge_profile = FixedKnowledgeProfile(simulator.kc_list, simulator.llm, simulator.logger)
    KCs = list(knowledge_profile.current_knowledge_state.keys())
    random_two_kcs = random.sample(KCs, 2)
    # Take one KC from the response and one randomly for reference KCs.
    reference_kcs = random_two_kcs[:1]+[KCs[1]]
    mock_question = "What is lists in Python?"
    mock_answer = "Lists are a data structure in Python that allows you to store multiple items in a single variable."
    reference_answer = "A list is a python data structure that allows you to store multiple items in a single variable."

    knowledge_profile.get_next_interaction = MagicMock(
        return_value=ResponseData(
            questions=[Question(
                question_text=mock_question,
                question_rationale="rationale1"
            )], metadata={})
    )

    knowledge_profile.get_kcs_from_answer = MagicMock(
        return_value=(random_two_kcs, reference_kcs, reference_answer)
    )

    simulator.initialize_knowledge_profile = MagicMock(
        return_value=knowledge_profile
    )

    simulator.get_random_interview_policy = MagicMock(
        name="get_fixed_interview_policy",
        return_value=0
    )

    return mock_question, mock_answer, reference_answer, reference_kcs

def test_interview_conversation(app, client):
    response = client.get("/api/interview/beginner")
    assert response.status_code == 201
    data = response.get_json()
    assert "student_type_id" in data
    assert "interview_id" in data

    mock_question, mock_answer, reference_answer, reference_kcs = mock_conversation_helper(app)

    with client.session_transaction() as session:
        session['student_type_id'] = data['student_type_id']
        session['interview_id'] = data['interview_id']


    response = client.get("/api/conversation/interviewer")
    assert response.status_code == 200
    data = response.get_json()
    assert data["question"] == mock_question
    assert data["metadata"] == {'concepts': {'name': '', 'score': 0.0}, 'rationale': 'rationale1'}

    response  = client.post("/api/conversation/student", json={
        "response": mock_answer
    })
    data = response.get_json()
    assert "answer" in data
    assert data["answer"] == mock_answer
    assert data["reference_answer"] == reference_answer
