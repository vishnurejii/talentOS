import os
import sys
import django
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.db import sync_db_call
try:
    from models.user import CustomUser
except ImportError:
    from shared_models.user import CustomUser

def list_users():
    users = sync_db_call(CustomUser.find_all().to_list())
    for u in users:
        print(f"User: {u.username} | Role: {u.role}")

if __name__ == "__main__":
    list_users()
