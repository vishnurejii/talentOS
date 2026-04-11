import os
import sys
import django
from pathlib import Path

# Setup Django environment
sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

try:
    from models.job import Job
except ImportError:
    from shared_models.job import Job
    
from jobs.tasks import generate_exam_task
from core.db import sync_db_call

def migrate():
    print("Starting migration to fix empty job exams...")
    
    async def _fetch():
        return await Job.find_all().to_list()
        
    jobs = sync_db_call(_fetch())
    
    for job in jobs:
        print(f"Checking Job: {job.title} ({job.id})")
        # Trigger generation for each job
        res = generate_exam_task(str(job.id))
        print(f"Result: {res}")

    print("Migration completed.")

if __name__ == "__main__":
    migrate()
