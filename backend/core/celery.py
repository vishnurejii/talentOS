"""
Celery app configuration for TalentOS.
Uses Redis as broker; autodiscovers tasks from all Django apps.
"""
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("talentos")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
