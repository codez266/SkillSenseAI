from datetime import datetime
from db.models import Student, StudentInterviewRecord

from tests.pytest_lib import app, client, runner

def test_create_interview_existing_session(app, client):
    """Test creating an interview when session already exists."""
    # First request to create session
    response1 = client.get('/api/interview/beginner')
    assert response1.status_code == 201
    data1 = response1.get_json()

    # Second request should return same IDs
    response2 = client.get('/api/interview/record/{}'.format(data1['interview_id']))
    assert response2.status_code == 200
    data2 = response2.get_json()

    assert data1['student_type_id'] == data2['student_type_id']
    assert data1['interview_id'] == data2['interview_id']

def test_create_interview_invalid_student_type(app, client):
    """Test creating an interview with an invalid student type."""
    response = client.get('/api/interview/invalid')
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data
    assert data['error'] == "Invalid student type"

def test_create_interview_valid_student_type(app, client):
    """Test creating an interview with a valid student type."""
    response = client.get('/api/interview/beginner')
    assert response.status_code == 201

    data = response.get_json()
    assert 'student_type_id' in data
    assert 'interview_id' in data

    # Verify the student was created
    student = Student.get_by_id(data['student_type_id'])
    assert student is not None
    assert student.student_level == "beginner"
    assert student.student_k_cs is None

    # Verify the interview record was created
    interview = StudentInterviewRecord.get_by_id(data['interview_id'])
    assert interview is not None
    assert interview.interview_student_type_id == student.student_type_id
    assert interview.interview_metadata is None

def test_create_interview_error_handling(app, client, monkeypatch):
    """Test error handling when database operations fail."""
    # Mock the Student.create method to raise an exception
    def mock_create(*args, **kwargs):
        raise Exception("Database error")

    monkeypatch.setattr(Student, 'create', mock_create)

    response = client.get('/api/interview')
    assert response.status_code == 500

    data = response.get_json()
    assert 'error' in data
    assert data['error'] == "Database error"