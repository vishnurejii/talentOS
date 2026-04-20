"""
Django Production Settings for Render.com deployment.
Extends the base settings with production-specific overrides.
"""
from .settings import *
import os

# ── Security ─────────────────────────────────────────────────────────────────
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)

# Allow Render domains + your custom domain
ALLOWED_HOSTS = [
    '.onrender.com',
    'localhost',
    '127.0.0.1',
]

# Allow CORS from Render frontend domain
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', 'https://talentos-frontend.onrender.com').split(',')
    if origin.strip()
]
CORS_ALLOW_ALL_ORIGINS = False  # Override base setting  

# ── Static Files (WhiteNoise for serving without a CDN) ─────────────────────
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGO_URI = os.environ['MONGO_URI']  # Must be set — fail fast if missing

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}
