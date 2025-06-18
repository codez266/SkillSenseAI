# Interview Assessment App

The `interview_app` directory contains the backend implementation of the Interview Assessment App. It is built using Flask and Peewee, providing a robust and scalable solution for managing interview-related functionalities. Below is an overview of its structure:

### Setting Up a Python Virtual Environment

It is recommended to use a Python virtual environment to manage dependencies for the backend. Follow these steps from the `interview_app` directory:

```bash
# Create a virtual environment named .venv
python3 -m venv .venv

# Activate the virtual environment (macOS/Linux)
source .venv/bin/activate

# On Windows, use:
# .venv\Scripts\activate

# Upgrade pip (optional but recommended)
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### Database Initialization (only for local debugging)

To initialize the database locally for debugging, you can use the Flask command line interface. Run the following commands from the `interview_app` directory:

```bash
# Initialize the database (replace 'init-db' with your actual command if different).
flask --app skillsense_ai init-db
```

### Running locally
```bash
python run_app.py dev
```

Make sure you have all dependencies installed (see `requirements.txt`) and that your virtual environment is activated before running these commands.

### API Routes

The application provides several REST API endpoints for managing interviews and conversations. Below are the available routes and examples of how to use them with Python `requests`:

#### 1. Create Interview with Student Type

**GET** `/api/interview/<student_type>`

Creates an interview session for a student with a specified level (beginner, intermediate, advanced). This endpoint redirects to the interview record endpoint upon successful creation.

```python
import requests

# Create interview for a beginner student (will redirect)
response = requests.get('http://localhost:5000/api/interview/beginner', allow_redirects=True)
data = response.json()
```

**Example Response (after redirect):**
```json
{
    "interview_id": 5,
    "interview_student_id": 1,
    "interview_problem_id": 3,
    "interview_policy": 1,
    "interview_metadata": null,
    "interview_timestamp": "2025-06-16T14:30:00.123456",
    "interview_conversation_history": [],
    "interview_artifact": {
        "problem_id": 3,
        "problem_statement": "Write a function to find the maximum element in a list",
        "problem_solution": "def find_max(lst):\n    return max(lst)",
        "problem_level": "beginner"
    },
    "interview_student_data": {
        "student_id": 1,
        "student_level": "beginner",
        "student_k_cs": null
    }
}
```

#### 2. Create Interview with Submitted Code

**POST** `/api/interview`

Creates an interview session using student-submitted code. This endpoint also redirects to the interview record endpoint upon successful creation.

```python
import requests

# Submit code for interview
payload = {
    "submitted_code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    "submitted_problem": "Write a function to calculate fibonacci numbers",
    "submitted_code_level": "intermediate"
}

response = requests.post('http://localhost:5000/api/interview', json=payload, allow_redirects=True)
data = response.json()
```

**Example Response (after redirect):**
```json
{
    "interview_id": 6,
    "interview_student_id": 2,
    "interview_problem_id": 4,
    "interview_policy": 1,
    "interview_metadata": null,
    "interview_timestamp": "2025-06-16T14:35:00.654321",
    "interview_conversation_history": [],
    "interview_artifact": {
        "problem_id": 4,
        "problem_statement": "Write a function to calculate fibonacci numbers",
        "problem_solution": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
        "problem_level": "intermediate"
    },
    "interview_student_data": {
        "student_id": 2,
        "student_level": null,
        "student_k_cs": null
    }
}
```

#### 3. Get Interview Record

**GET** `/api/interview/record/<interview_id>`

Retrieves complete details about a specific interview, including conversation history, student data, and artifact information.

```python
import requests

interview_id = 123
response = requests.get(f'http://localhost:5000/api/interview/record/{interview_id}')
data = response.json()
```

**Example Response:**
```json
{
    "interview_id": 123,
    "interview_student_id": 1,
    "interview_problem_id": 5,
    "interview_policy": 1,
    "interview_metadata": null,
    "interview_timestamp": "2025-06-16T14:30:00.123456",
    "interview_conversation_history": [
        {
            "conversation_id": 1,
            "conversation_interview_id": 123,
            "conversation_turn_id": 0,
            "conversation_response": "Can you explain the time complexity of your solution?",
            "conversation_reference": "The time complexity should be O(log n)",
            "conversation_k_cs": {"algorithms": 0.8, "complexity_analysis": 0.9},
            "conversation_reference_kcs": {"time_complexity": 1.0},
            "conversation_metadata": {"question_type": "complexity_analysis"},
            "conversation_responded": 0,
            "conversation_timestamp": "2025-06-16T14:31:00.000000",
            "conversation_turn_number": 1
        }
    ],
    "interview_artifact": {
        "problem_id": 5,
        "problem_statement": "Implement a binary search algorithm",
        "problem_solution": "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1",
        "problem_level": "intermediate"
    },
    "interview_student_data": {
        "student_id": 1,
        "student_level": "intermediate",
        "student_k_cs": ["algorithms", "data_structures"]
    }
}
```

#### 4. Get Interviewer Questions

**GET** `/api/conversation/interviewer/<interview_id>`

Gets suggested conversation options from the AI interviewer for a specific interview. Returns multiple conversation suggestions with metadata.

```python
import requests

interview_id = 123
response = requests.get(f'http://localhost:5000/api/conversation/interviewer/{interview_id}')
data = response.json()
```

**Example Response:**
```json
{
    "suggested_conversations": [
        {
            "conversation_id": 15,
            "conversation_interview_id": 123,
            "conversation_turn_id": 0,
            "conversation_response": "Can you explain the time complexity of your fibonacci function?",
            "conversation_reference": "The time complexity is O(2^n) due to redundant recursive calls",
            "conversation_k_cs": {"algorithms": 0.8, "complexity_analysis": 0.9},
            "conversation_reference_kcs": {"time_complexity": 1.0},
            "conversation_metadata": {
                "question_type": "complexity_analysis",
                "difficulty": "intermediate",
                "concept": "time_complexity"
            },
            "conversation_responded": 0,
            "conversation_timestamp": "2025-06-16T14:32:00.000000",
            "conversation_turn_number": 2
        },
        {
            "conversation_id": 16,
            "conversation_interview_id": 123,
            "conversation_turn_id": 0,
            "conversation_response": "How would you optimize this recursive solution?",
            "conversation_reference": "Use memoization or dynamic programming to avoid redundant calculations",
            "conversation_k_cs": {"algorithms": 0.9, "optimization": 0.8},
            "conversation_reference_kcs": {"dynamic_programming": 1.0, "memoization": 0.9},
            "conversation_metadata": {
                "question_type": "optimization",
                "difficulty": "advanced",
                "concept": "dynamic_programming"
            },
            "conversation_responded": 0,
            "conversation_timestamp": "2025-06-16T14:32:00.000000",
            "conversation_turn_number": 2
        }
    ],
    "status": "success"
}
```

#### 5. Submit Student Response

**POST** `/api/conversation/student/<interview_id>`

Submits a student's response to the interviewer's question. Returns processed feedback and reference answers.

```python
import requests

interview_id = 123
payload = {
    "response": "I think the time complexity is O(n) because we iterate through the array once."
}

response = requests.post(f'http://localhost:5000/api/conversation/student/{interview_id}', json=payload)
data = response.json()
```

**Example Response:**
```json
{
    "processed_answer": "The student incorrectly identified the time complexity. The fibonacci function has exponential time complexity O(2^n) due to redundant recursive calls.",
    "reference_answer": "The time complexity is O(2^n) because each call spawns two more recursive calls, creating an exponential tree of computations.",
    "metadata": {
        "student_understanding": "incorrect",
        "reasoning_quality": "attempted",
        "concept_mastery": "needs_improvement",
        "follow_up_needed": true
    },
    "status": "success"
}
```

#### 6. End Interview

**GET** `/api/conversation/interview/end/<interview_id>`

Ends an interview session and returns statistics.

```python
import requests

interview_id = 123
response = requests.get(f'http://localhost:5000/api/conversation/interview/end/{interview_id}')
data = response.json()
```

**Example Response:**
```json
{
    "status": "Interview ended successfully",
    "total_conversation_turns": 8,
    "total_time_taken": "0:15:32",
    "interview_id": 123
}
```

#### Example Complete Interview Flow

```python
import requests

base_url = "http://localhost:5000/api"

# 1. Create interview (with redirect handling)
response = requests.get(f"{base_url}/interview/intermediate", allow_redirects=True)
interview_data = response.json()
interview_id = interview_data['interview_id']

# 2. Get interviewer conversation suggestions
response = requests.get(f"{base_url}/conversation/interviewer/{interview_id}")
conversation_data = response.json()
# Select the first suggested conversation
suggested_question = conversation_data['suggested_conversations'][0]['conversation_response']

# 3. Submit student answer
answer_payload = {"response": "The time complexity is O(log n) because we eliminate half the search space each iteration."}
response = requests.post(f"{base_url}/conversation/student/{interview_id}", json=answer_payload)
answer_data = response.json()

# 4. Get updated interview record
response = requests.get(f"{base_url}/interview/record/{interview_id}")
updated_interview = response.json()

# 5. End interview and get statistics
response = requests.get(f"{base_url}/conversation/interview/end/{interview_id}")
end_data = response.json()
```

**Example Flow Responses:**

1. **Create Interview Response (after redirect):**
```json
{
    "interview_id": 7,
    "interview_student_id": 3,
    "interview_problem_id": 8,
    "interview_policy": 1,
    "interview_metadata": null,
    "interview_timestamp": "2025-06-16T15:00:00.000000",
    "interview_conversation_history": [],
    "interview_artifact": {
        "problem_id": 8,
        "problem_statement": "Implement a binary search algorithm",
        "problem_solution": "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1",
        "problem_level": "intermediate"
    },
    "interview_student_data": {
        "student_id": 3,
        "student_level": "intermediate",
        "student_k_cs": null
    }
}
```

2. **Interviewer Suggestions Response:**
```json
{
    "suggested_conversations": [
        {
            "conversation_id": 20,
            "conversation_interview_id": 7,
            "conversation_turn_id": 0,
            "conversation_response": "What is the time complexity of your binary search implementation?",
            "conversation_reference": "The time complexity is O(log n)",
            "conversation_k_cs": {"algorithms": 0.9, "complexity_analysis": 0.8},
            "conversation_reference_kcs": {"time_complexity": 1.0},
            "conversation_metadata": {
                "question_type": "complexity_analysis",
                "difficulty": "intermediate"
            },
            "conversation_responded": 0,
            "conversation_timestamp": "2025-06-16T15:01:00.000000",
            "conversation_turn_number": 1
        }
    ],
    "status": "success"
}
```

3. **Submit Answer Response:**
```json
{
    "processed_answer": "The student correctly identified the logarithmic time complexity of binary search.",
    "reference_answer": "The time complexity is O(log n) because we eliminate half of the search space in each iteration.",
    "metadata": {
        "student_understanding": "correct",
        "reasoning_quality": "good",
        "concept_mastery": "satisfactory"
    },
    "status": "success"
}
```

4. **End Interview Response:**
```json
{
    "status": "Interview ended successfully",
    "total_conversation_turns": 6,
    "total_time_taken": "0:12:45",
    "interview_id": 7
}
```

