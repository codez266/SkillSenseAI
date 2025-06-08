from db.models import StudentArtifact, Student, InterviewConversation, StudentInterviewRecord
from datetime import datetime

def save_student_artifact(extracted_kcs, problem_id, problem_solution, problem_statement):
    """
    Saves the extracted KCs and related problem information to the StudentArtifact table.
    """
    # Convert KCs list to a comma-separated string
    kcs_str = ", ".join(extracted_kcs)
    
    # Create a new StudentArtifact record
    artifact = StudentArtifact.create(
        extracted_kcs=kcs_str,
        problem_id=problem_id,
        problem_solution=problem_solution,
        problem_statement=problem_statement
    )
    return artifact

def save_or_update_student_kcs(student_type_id, kcs):
    """
    Saves or updates a student's KCs in the Student table.
    """
    kcs_str = ", ".join(kcs)
    
    # Try to get the existing student record
    try:
        student = Student.get(Student.student_type_id == student_type_id)
        # Update the student's KCs
        student.student_k_cs = kcs_str
        student.save()
    except Student.DoesNotExist:
        # Create a new student record if it doesn't exist
        student = Student.create(
            student_k_cs=kcs_str,
            student_type_id=student_type_id
        )
    return student

def save_interview_conversation(kcs, interview_id, is_response_question, response, turn_id):
    """
    Saves a conversation's KCs and related data to the InterviewConversation table.
    """
    kcs_str = ", ".join(kcs)
    
    conversation = InterviewConversation.create(
        conversation_k_cs=kcs_str,
        conversation_interview_id=interview_id,
        conversation_is_response_question=int(is_response_question),
        conversation_response=response,
        conversation_turn_id=turn_id
    )
    return conversation

def save_student_interview_record(metadata, problem_id, student_type_id, timestamp=None):
    """
    Saves a student interview record to the StudentInterviewRecord table.
    """
    if timestamp is None:
        timestamp = datetime.now()
    
    record = StudentInterviewRecord.create(
        interview_metadata=metadata,
        interview_problem_id=problem_id,
        interview_student_type_id=student_type_id,
        interview_timestamp=timestamp
    )
    return record
