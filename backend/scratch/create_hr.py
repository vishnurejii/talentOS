import os
import sys
import django
from pathlib import Path
from django.contrib.auth.hashers import make_password

sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.db import sync_db_call
try:
    from models.user import CustomUser
except ImportError:
    from shared_models.user import CustomUser

def create_hr():
    async def _run():
        user = await CustomUser.find_one(CustomUser.email == "hr@talentos.com")
        if not user:
            user = CustomUser(
                email="hr@talentos.com",
                password=make_password("admin123"),
                role="HR",
                full_name="HR Administrator"
            )
            await user.insert()
            print("Created HR user: hr@talentos.com / admin123")
        else:
            user.password = make_password("admin123")
            await user.save()
            print("Updated HR user password: hr@talentos.com / admin123")

    sync_db_call(_run())

if __name__ == "__main__":
    create_hr()
