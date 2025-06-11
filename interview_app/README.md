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

Creates an interview session for a student with a specified level (beginner, intermediate, advanced).

```python
import requests

# Create interview for a beginner student
response = requests.get('http://localhost:5000/api/interview/beginner')
data = response.json()
```

**Example Response:**
```json
{
    "student_id": 1,
    "interview_id": 5,
    "problem_statement": "Write a function to find the maximum element in a list",
    "student_artifact": "def find_max(lst):\n    return max(lst)"
}
```

#### 2. Create Interview with Submitted Code

**POST** `/api/interview`

Creates an interview session using student-submitted code.

```python
import requests

# Submit code for interview
payload = {
    "submitted_code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    "submitted_problem": "Write a function to calculate fibonacci numbers",
    "submitted_code_level": "intermediate"
}

response = requests.post('http://localhost:5000/api/interview', json=payload)
data = response.json()
```

**Example Response:**
```json
{
    "student_id": 2,
    "interview_id": 6,
    "problem_statement": "Write a function to calculate fibonacci numbers",
    "student_artifact": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)"
}
```

#### 3. Get Interview Record

**GET** `/api/interview/record/<interview_id>`

Retrieves details about a specific interview.

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
    "student_id": 1,
    "problem_id": 5,
    "timestamp": "2025-06-11T14:30:00.123456",
    "metadata": null,
    "policy": 1
}
```

#### 4. Get Interviewer Question

**GET** `/api/conversation/interviewer/<interview_id>`

Gets the next question from the interviewer for a specific interview.

```python
import requests

interview_id = 123
response = requests.get(f'http://localhost:5000/api/conversation/interviewer/{interview_id}')
data = response.json()
```

**Example Response:**
```json
{
    "question": "Can you explain the time complexity of your fibonacci function?",
    "metadata": {
        "question_type": "complexity_analysis",
        "difficulty": "intermediate",
        "student_artifact": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)"
    },
    "status": "success"
}
```

#### 5. Submit Student Response

**POST** `/api/conversation/student/<interview_id>`

Submits a student's response to the interviewer's question.

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
        "correctness": "incorrect",
        "reasoning_quality": "attempted",
        "concept": "time_complexity"
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

# 1. Create interview
response = requests.get(f"{base_url}/interview/intermediate")
interview_data = response.json()
interview_id = interview_data['interview_id']

# 2. Get first question
response = requests.get(f"{base_url}/conversation/interviewer/{interview_id}")
question_data = response.json()

# 3. Submit answer
answer_payload = {"response": "Your answer here"}
response = requests.post(f"{base_url}/conversation/student/{interview_id}", json=answer_payload)
answer_data = response.json()

# 4. Continue conversation or end interview
response = requests.get(f"{base_url}/conversation/interview/end/{interview_id}")
end_data = response.json()
```

**Example Flow Responses:**

1. **Create Interview Response:**
```json
{
    "student_id": 3,
    "interview_id": 7,
    "problem_statement": "Implement a binary search algorithm",
    "student_artifact": "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1"
}
```

2. **First Question Response:**
```json
{
    "question": "What is the time complexity of your binary search implementation?",
    "metadata": {
        "question_type": "complexity_analysis",
        "difficulty": "intermediate"
    },
    "status": "success"
}
```

3. **Submit Answer Response:**
```json
{
    "processed_answer": "The student correctly identified the logarithmic time complexity of binary search.",
    "reference_answer": "The time complexity is O(log n) because we eliminate half of the search space in each iteration.",
    "metadata": {
        "correctness": "correct",
        "concept": "time_complexity"
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

