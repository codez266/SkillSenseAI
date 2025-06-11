import pdb
import os
from logging.config import dictConfig

from adaptive_concept_selection.question_generation.question_generation_cg import SimulatedStudentExperiment
from db.config import CONFIG
from db.db_utils import tables
from db.db_utils import init_real_db, init_test_db, init_memory_db, refresh_db_proxy
from peewee import SqliteDatabase

from flask import Flask, request, jsonify, current_app, g, session, render_template
from flask_cors import CORS
from datetime import datetime
from db.models import Student, StudentInterviewRecord, database_proxy
from db.db_utils import get_db
from defaultsettings import config
from routes import interview, messages

dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.StreamHandler',
        'stream': 'ext://flask.logging.wsgi_errors_stream',
        'formatter': 'default'
    }},
    'root': {
        'level': 'INFO',
        'handlers': ['wsgi']
    }
})

def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Accept"],
            "supports_credentials": True
        }
    })

    #db_wrapper = FlaskDB(app, database)

    is_production = False
    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_object(config['production'])
        is_production = True
    else:
        # load the test config if passed in
        app.config.from_object(test_config)
    app.config["SESSION_COOKIE_SAMESITE"] = "None"
    app.config["SESSION_COOKIE_SECURE"] = True

    from db import db_utils
    db_utils.init_app(app)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    creds_file = "azure_auth.json"
    logger = app.logger

    if app.config['TESTING']:
        app.db = init_test_db()
    else:
        app.db = init_real_db(config=CONFIG)

    app.config["simulator"] = SimulatedStudentExperiment(logger=logger, db_config=CONFIG, simulation=False, llm_creds=creds_file, question_limit=int(CONFIG.get("app", "turns")), prod=is_production)

    # a simple page that says hello
    @app.route('/hello')
    def hello():
        return 'Hello, World!'

    # @app.before_request
    # def load_logged_in_user():
    #     uuid = session.get('sess_secret')
    #     db = get_db()
    #     if not uuid:
    #         g.user = None
    #     else:
    #         import pdb
    #         pdb.set_trace()
    #         g.user = CreateparticipantParticipant.select().where(CreateparticipantParticipant.uuid == uuid).get_or_none()


    # app.register_blueprint(auth.bp)
    # app.register_blueprint(pre_study.bp)
    # app.register_blueprint(main_study.bp)

    # Mock database for now - we'll replace this with a real database later
    # messages = [
    #     {
    #         "id": 1,
    #         "text": "Hey, how can I help?",
    #         "sender": "assistant",
    #         "timestamp": "1m"
    #     }
    # ]


    # Register blueprints
    app.register_blueprint(interview.bp)
    app.register_blueprint(messages.bp)

    @app.before_request
    def connect_db():
        try:
            refresh_db_proxy(app.db, database_proxy)
        except Exception as e:
            app.logger.error(
                f"Database connection error in before_request: {e}")
            # Don't fail the request, let the retry decorator handle it

    @app.teardown_appcontext
    def close_db(exception):
        # Don't close connections in production to maintain connection pool
        # Only close on exceptions or in development
        if exception or app.debug:
            try:
                if database_proxy.obj and not database_proxy.obj.is_closed():
                    database_proxy.obj.close()
            except Exception as e:
                app.logger.warning(f"Error closing database connection: {e}")

    @app.route('/health')
    def health_check():
        try:
            # Test database connection
            database_proxy.obj.execute_sql('SELECT 1')
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'timestamp': datetime.now().isoformat()
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }), 500

    return app