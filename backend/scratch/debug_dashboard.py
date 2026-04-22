import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.append(str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.db import sync_db_call, to_dict
from models.application import Application
from models.job import Job
from shared_models.user import User

async def debug_data():
    all_users = await User.find_all().to_list()
    print(f"Total Users: {len(all_users)}")
    for u in all_users:
        print(f"User: {u.email}, Role: {u.role}, ID: {u.id}")

    all_jobs = await Job.find_all().to_list()
    print(f"\nTotal Jobs: {len(all_jobs)}")
    for j in all_jobs:
        print(f"Job: {j.title}, ID: {j.id}, CreatedBy: {j.created_by.id if hasattr(j.created_by, 'id') else j.created_by}")

    all_apps = await Application.find_all().to_list()
    print(f"\nTotal Applications: {len(all_apps)}")
    for a in all_apps:
        print(f"App: {a.id}, JobID: {a.job.id if hasattr(a.job, 'id') else a.job}, CandID: {a.candidate.id if hasattr(a.candidate, 'id') else a.candidate}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(debug_data())
