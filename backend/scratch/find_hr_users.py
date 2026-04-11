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

def find_hr_users():
    async def _run():
        users = await CustomUser.find(CustomUser.role == "HR").to_list()
        if not users:
            print("No HR users found.")
            return
        for u in users:
            print(f"Email: {u.email} | Name: {u.full_name} | Role: {u.role}")

    sync_db_call(_run())

if __name__ == "__main__":
    find_hr_users()
