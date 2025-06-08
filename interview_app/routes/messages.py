from flask import Blueprint, jsonify, request

bp = Blueprint('messages', __name__, url_prefix='/api')

# Mock database for now
messages = [
    {
        "id": 1,
        "text": "Hey, how can I help?",
        "sender": "assistant",
        "timestamp": "1m"
    }
]

@bp.route('/messages', methods=['GET'])
def get_messages():
    return jsonify(messages)

@bp.route('/messages', methods=['POST'])
def create_message():
    data = request.json
    new_message = {
        "id": len(messages) + 1,
        "text": data.get('text'),
        "sender": data.get('sender'),
        "timestamp": "now"
    }
    messages.append(new_message)
    return jsonify(new_message), 201

@bp.route('/code', methods=['POST'])
def evaluate_code():
    data = request.json
    code = data.get('code')
    return jsonify({
        "status": "success",
        "message": "Code received successfully",
        "code": code
    })