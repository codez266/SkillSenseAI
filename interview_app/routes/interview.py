import ast
import logging
import json
import traceback
import random
from peewee import fn, OperationalError, InterfaceError
from adaptive_concept_selection.db.db_utils import init_test_db
from adaptive_concept_selection.question_generation.question_generation_cg import SimulatedStudentExperiment, StudentArtifactData
from adaptive_concept_selection.db.models import database_proxy as acs_db_proxy

from flask import Blueprint, jsonify, session, request, current_app, redirect, url_for
from datetime import datetime
from db.models import Student, StudentArtifact, StudentInterviewRecord, InterviewConversation, Artifact, database_proxy
from db.config import CONFIG

bp = Blueprint('interview', __name__, url_prefix='/api')

@bp.route('/interview', defaults={'student_type': None}, methods=['POST'])
@bp.route('/interview/<string:student_type>', methods=['GET'])
@bp.route('/interview/<string:student_type>/<int:interview_policy>', methods=['GET'])
@bp.route('/interview/<string:student_type>/<int:interview_policy>/<int:artifact_id>', methods=['GET'])
def interview(student_type, interview_policy=None, artifact_id=None):
    rand_fn = fn.Rand
    if current_app.config['TESTING']:
        rand_fn = fn.Random
    types = ['beginner', 'intermediate', 'expert']
    # If student type is provided in a route, it should be one of the types.
    # If not provided, a student with a None type is created to be estimated later.
    # TODO: populate problem from the request, or load from a random sample of # problems from the db.
    # TODO: Have a post method that also submits a problem to the interview.
    if student_type and student_type not in types:
        return jsonify({
            'error': 'Invalid student type'
        }), 400

    if student_type and request.method == 'POST':
        return jsonify({
            'error': 'POST method does not support student type'
        }), 400

    try:
        # Handle POST request with submitted code when no student type is provided
        artifact = None
        student_artifact_data = None
        args = {}
        if request.method == 'POST':
            submitted_data = request.get_json()
            if not submitted_data or 'submitted_code' not in submitted_data:
                return jsonify({'error': 'Submitted code is required'}), 400

            submitted_problem = submitted_data.get('submitted_problem')
            submitted_code = submitted_data['submitted_code']
            submitted_code_level = submitted_data.get(
                'submitted_code_level', None)
            if submitted_code_level not in types:
                submitted_code_level = None
            student_artifact_data = StudentArtifactData(
                problem_level=submitted_code_level,
                problem_statement=submitted_problem,
                problem_solution=submitted_code
            )
            args["provided_artifact"] = student_artifact_data

            # Get interview_policy from POST request body if provided
            if 'interview_policy' in submitted_data:
                interview_policy = submitted_data['interview_policy']
        elif student_type:
            student_level = student_type
            args["student_level"] = student_level
        else:
            return jsonify({
                'error': 'Either student type is required or artifact data needs to be posted.'
            }), 400

        if artifact_id is not None:
            args["artifact_id"] = artifact_id

        # Use provided interview_policy or randomly select one if not provided
        if interview_policy is None:
            interview_policy = random.choice(current_app.config["ALLOWED_POLICIES"])
        args["interview_policy"] = interview_policy
        simulator = current_app.config["simulator"]
        simulator.initialize_db_proxy(current_app.db)
        interview_record, current_knowledge_state, knowledge_profile, G, student, artifact = simulator.create_and_initialize_interview(**args)
        return redirect(url_for("interview.get_interview_record", interview_id=interview_record.interview_id))
        # return jsonify({
        #     'student_id': student.student_type_id,
        #     'interview_id': interview_record.interview_id,
        #     'problem_statement': artifact.problem_statement,
        #     'student_artifact': artifact.problem_solution
        # }), 201

    except Exception as e:
        current_app.logger.error(f"Error creating interview: {traceback.format_exc()}")
        return jsonify({
            'error': str(e)
        }), 500

@bp.route('/interview/record/<int:interview_id>', methods=['GET'])
def get_interview_record(interview_id):
    try:
        simulator = current_app.config["simulator"]
        simulator.initialize_db_proxy(current_app.db)
        obs, _ = simulator.reset(interview_id)
        interview_data = obs["interview_data"]

        if not interview_data:
            return jsonify({'error': 'Interview not found'}), 404
    except (OperationalError, InterfaceError) as e:
        current_app.logger.error(f"Database connection error retrieving interview {interview_id}: {str(e)}")
        return jsonify({'error': 'Database connection error, please try again'}), 503
    except Exception as e:
        current_app.logger.error(f"Error retrieving interview {interview_id}: {str(e)}")
        return jsonify({'error': 'Interview not found'}), 404

    return jsonify(interview_data.model_dump()), 200

@bp.route('/conversation/interview/end/<int:interview_id>', methods=['GET'])
def end_interview(interview_id):
    """End the current interview session."""
    interview_record = None
    try:
        interview_record = StudentInterviewRecord.select().where(StudentInterviewRecord.interview_id==interview_id).get_or_none()
        if not interview_record:
            return jsonify({'error': 'Interview not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Error retrieving interview: {str(e)}")
        return jsonify({'error': 'Interview not found'}), 404

    # End the interview by updating the record
    try:
        simulator = current_app.config["simulator"]
        simulator.initialize_db_proxy(current_app.db)
        obs, _ = simulator.reset(interview_id)
        total_conversation_turns = len(obs["conversation_history_data"])
        turn_start = obs["conversation_history_data"][0].conversation_timestamp if total_conversation_turns > 0 else None
        turn_end = obs["conversation_history_data"
        ][-1].conversation_timestamp if total_conversation_turns > 0 else None
        interview_duration = str(turn_end - turn_start) if turn_start and turn_end else None
        # Convert interview duration into a human-readable format

        return jsonify({
            'status': 'Interview ended successfully',
            'total_conversation_turns': total_conversation_turns,
            'total_time_taken': interview_duration,
            'interview_id': interview_id
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error ending interview: {str(e)}")
        return jsonify({'error': 'Failed to end interview'}), 500

@bp.route('/conversation/interviewer/select_suggested_conversation/<int:interview_id>/<int:conv_index>', methods=['GET'])
def mark_as_responded(interview_id, conv_index):
    try:
        simulator = current_app.config["simulator"]
        simulator.initialize_db_proxy(current_app.db)
        obs, _ = simulator.reset(interview_id)
        last_turn_number = simulator.get_last_turn_number(interview_id)
        simulator.mark_selected_conversation_as_responded(interview_id, last_turn_number, conv_index)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        current_app.logger.error(f"Error marking as responded: {str(e)}")
        return jsonify({'error': 'Failed to mark as responded'}), 500

@bp.route('/conversation/student/select_reference_concepts/<int:interview_id>/<int:turn_number>', methods=['GET'])
def select_reference_concepts(interview_id, turn_number):
    try:
        concepts = request.args.getlist("concepts")
        simulator = current_app.config["simulator"]
        simulator.initialize_db_proxy(current_app.db)
        obs, _ = simulator.reset(interview_id)
        last_turn_number = simulator.get_last_turn_number(interview_id)
        simulator.select_reference_concepts_for_conversation(interview_id, turn_number, concepts)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        current_app.logger.error(f"Error selecting reference concepts: {str(e)}")
        return jsonify({'error': 'Failed to select reference concepts'}), 500


@bp.route('/conversation/interviewer/<int:interview_id>', methods=['GET'])
def conversation_interviewer(interview_id):
    try:
        interview_record = StudentInterviewRecord.select().where(StudentInterviewRecord.interview_id==interview_id).get_or_none()
        if not interview_record:
            return jsonify({'error': 'Interview not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Error retrieving interview: {str(e)}")
        return jsonify({'error': 'Interview not found'}), 404
    # Get the conversation
    # conversations = InterviewConversation.select().where(
    #     InterviewConversation.conversation_interview_id == interview_id
    # ).order_by(InterviewConversation.conversation_turn_id)

    # Now we have the interview_id, the student problem, and the conversation so far.
    # We need to generate a question for the interviewer.
    # Pass this data to a model that generates a question for the interviewer, records the question, and returns the question.
    # TODO: question = generate_question(interview_id, student_problem, conversation)

    # This will resume the experiment with the given interview_id
    #simulator = current_app.config["simulator"]
    creds_file = "azure_auth.json"
    simulator = current_app.config["simulator"]
    simulator.initialize_db_proxy(current_app.db)
    obs, _ = simulator.reset(interview_id)
    last_turn_number = simulator.get_last_turn_number(interview_id)
    obs, _, done, _, _ = simulator.step(turn_id=0)

    turn_number = simulator.get_last_turn_number(interview_id)
    # simulator.mark_selected_conversation_as_responded(interview_id, turn_number, 0)

    # If the interview is done, we need to redirect to the end of the interview.
    if done:
        return redirect(url_for("interview.end_interview", interview_id=interview_id))

    conversations = obs["conversation_history_data"]
    suggested_conversations = [conv.model_dump() for conv in conversations if conv.conversation_turn_number == turn_number]

    return jsonify({
        "suggested_conversations": suggested_conversations,
        "status": "success"
    }), 200

@bp.route('/conversation/student/<int:interview_id>', methods=['POST'])
@bp.route('/conversation/student/<int:interview_id>', methods=['GET'])
def conversation_student(interview_id):
    try:
        interview_record = StudentInterviewRecord.select().where(StudentInterviewRecord.interview_id==interview_id).get_or_none()
        if not interview_record:
            return jsonify({'error': 'Interview not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Error retrieving interview: {str(e)}")
        return jsonify({'error': 'Interview not found'}), 404

    student_answer = None
    if "response" in request.args:
        student_answer = request.args.get("response")
    elif request.method == 'POST':
        student_answer = request.json.get("response")
    simulator = current_app.config["simulator"]
    simulator.initialize_db_proxy(current_app.db)
    # This will resume the experiment with the given interview_id
    obs, _ = simulator.reset(interview_id)
    obs, _, done, _, _ = simulator.step(action=student_answer, turn_id=1)
    turn_number = simulator.get_last_turn_number(interview_id)
    conversations = obs["conversation_history_data"]
    conversations = [conv for conv in conversations if conv.conversation_turn_number == turn_number]

    # conversations = obs["conversation_history_data"]

    last_response = conversations[-1] if conversations else None

    response = {"status": "success"}
    response.update(last_response.model_dump())

    # Return the question
    return jsonify(response), 200

