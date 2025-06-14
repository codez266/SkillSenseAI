import logging

from config import CONFIG

def inject_ini_config(cls):
    # For each section and key in config.ini, add as class attribute
    for section in CONFIG.sections():
        for key, value in CONFIG.items(section):
            attr_name = f"{section.upper()}_{key.upper()}"
            setattr(cls, attr_name, value)
    return cls

class AppConfig:
    SECRET_KEY = CONFIG.get('app', 'secret_key')
    CACHE_TYPE = CONFIG.get('app', 'cache_type')
    CACHE_DEFAULT_TIMEOUT = CONFIG.get('app', 'cache_default_timeout')

@inject_ini_config
class DevelopmentConfig(AppConfig):
    DEBUG = True
    TESTING = True
    DATABASE = 'agent.db'
    TEMPLATES_AUTO_RELOAD = True
    LOG_LEVEL = logging.DEBUG

@inject_ini_config
class TestingConfig(AppConfig):
    #DEBUG = True
    TESTING = True
    DATABASE = ':memory:'
    SECRET_KEY = 'test_key'
    LOG_LEVEL = logging.DEBUG

@inject_ini_config
class ProductionConfig(AppConfig):
    TEMPLATES_AUTO_RELOAD = True
    LOG_LEVEL = logging.INFO

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}