#!/usr/bin/env bash
# Render build script for TalentOS Django backend
set -o errexit  # Exit on error

pip install -r requirements.txt

# Collect static files for WhiteNoise to serve
python manage.py collectstatic --no-input

echo "Build complete."
