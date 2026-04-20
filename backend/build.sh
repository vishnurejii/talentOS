#!/usr/bin/env bash
# Render build script for TalentOS Django backend
set -o errexit

pip install -r requirements.txt

# Collect static files only if STATIC_ROOT is writable (non-fatal)
python manage.py collectstatic --no-input 2>/dev/null || echo "collectstatic skipped (non-fatal)"

echo "Build complete."
