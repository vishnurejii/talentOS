import os
import sys
import django
from pathlib import Path

# Setup Django environment
sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.db import sync_db_call
try:
    from models.user import CustomUser, hash_password
except ImportError:
    from shared_models.user import CustomUser, hash_password

def reset_hr_passwords():
    async def _run():
        users = await CustomUser.find(CustomUser.role == "HR").to_list()
        for u in users:
            u.password = hash_password("admin123")
            await u.save()
            print(f"Reset password for HR user: {u.email}")

    sync_db_call(_run())

if __name__ == "__main__":
    reset_hr_passwords()
