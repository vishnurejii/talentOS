"""
Django Production Settings for Render.com deployment.
Extends the base settings with production-specific overrides.
"""
from .settings import *
import os

# ── Security ─────────────────────────────────────────────────────────────────
DEBUG = os.environ.get('DEBUG', 'False') != 'True'
SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)

# Allow Render + Vercel domains
ALLOWED_HOSTS = ['*']  # Wide open — Django auth handles security

# ── CORS: Allow everything (JWT-based auth, no cookies) ──────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization',
    'content-type', 'dnt', 'origin', 'user-agent',
    'x-csrftoken', 'x-requested-with',
]

# ── Static Files ──────────────────────────────────────────────────────────────
# Only add whitenoise if it's installed (graceful fallback)
try:
    import whitenoise  # noqa
    if 'whitenoise.middleware.WhiteNoiseMiddleware' not in MIDDLEWARE:
        MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STATIC_ROOT = BASE_DIR / 'staticfiles'
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
except ImportError:
    pass

# ── MongoDB ───────────────────────────────────────────────────────────────────
# Fallback to the value already set in base settings if env var missing
MONGO_URI = os.environ.get('MONGO_URI', MONGO_URI)

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}
