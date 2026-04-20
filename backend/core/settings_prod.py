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

# Allow all origins — JWT auth is stateless so CORS restrictions add no security here.
# Update this to a specific list if you want tighter control in future.
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

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
