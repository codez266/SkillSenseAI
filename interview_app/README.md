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

### Database Initialization

To initialize the database locally for debugging, you can use the Flask command line interface. Run the following commands from the `interview_app` directory:

```bash
# Initialize the database (replace 'init-db' with your actual command if different)
flask --app skillsense_ai init-db
```

### Running locally
```bash
python run_app.py dev
```

Make sure you have all dependencies installed (see `requirements.txt`) and that your virtual environment is activated before running these commands.

