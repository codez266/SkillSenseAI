import pdb
from unittest.mock import MagicMock
from datetime import datetime
from db.models import Student, StudentInterviewRecord

from tests.pytest_lib import app, client, runner

def test_create_interview_existing_session(app, client):
    """Test creating an interview when session already exists."""
    # First request to create session
    response1 = client.get('/api/interview/beginner', follow_redirects=True)
    assert response1.status_code == 200
    data1 = response1.get_json()
    assert data1["interview_student_data"]["student_level"] == "beginner"

    # Second request should return same IDs
    response2 = client.get('/api/interview/record/{}'.format(data1['interview_id']), follow_redirects=True)
    assert response2.status_code == 200
    data2 = response2.get_json()

    assert data1['interview_student_id'] == data2['interview_student_id']
    assert data1['interview_id'] == data2['interview_id']

def test_create_interview_invalid_student_type(app, client):
    """Test creating an interview with an invalid student type."""
    response = client.get('/api/interview/invalid', follow_redirects=True)
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data
    assert data['error'] == "Invalid student type"

def test_create_interview_valid_student_type(app, client):
    """Test creating an interview with a valid student type."""

    app.config["simulator"].sample_student = MagicMock(
        return_value=Student.select(Student.student_type_id,
                        Student.student_k_cs, Student.student_level
                    ).where(Student.student_level == "beginner").limit(1).get()
    )
    response = client.get('/api/interview/beginner', follow_redirects=True)
    assert response.status_code == 200

    data = response.get_json()
    assert 'interview_student_id' in data
    assert 'interview_id' in data

    # Verify the student was created
    student = Student.get_by_id(data['interview_student_id'])
    assert student is not None
    assert student.student_level == "beginner"
    assert isinstance(student.student_k_cs, str)

    # Verify the interview record was created
    interview = StudentInterviewRecord.get_by_id(data['interview_id'])
    assert interview is not None
    assert interview.interview_student_type_id == student.student_type_id
    assert "knowledge_profile_original" in interview.interview_metadata

def test_create_interview_post_nocode(app, client, monkeypatch):
    """Test error handling when database operations fail."""
    # Mock the Student.create method to raise an exception
    response = client.post('/api/interview', json={
        'submitted_problem': 'Write a function to print "Hello, World!"',
        'submitted_code': 'print("Hello, World!")',
    }, follow_redirects=True)

    assert response.status_code == 200

    response = client.post('/api/interview', json={}, follow_redirects=True)
    assert response.status_code == 400