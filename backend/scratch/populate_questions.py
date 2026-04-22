import os
import sys
import asyncio
from bson import ObjectId

# Setup Django path
sys.path.append('.')
sys.path.append('..')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from core.db import sync_db_call
from shared_models.job import Job
from shared_models.exam import Question
from jobs.tasks import generate_exam_task

def main():
    print("TalentOS Question Recovery Tool")
    
    # 1. Find the target job
    job_id = "69e66d4243d59d5a7771e5d4" # Currently failing job
    job = sync_db_call(lambda: Job.get(job_id))
    
    if not job:
        print(f"X Job {job_id} not found.")
        return

    print(f"Found Job: {job.title}")
    
    # 2. Check current questions
    current = sync_db_call(lambda: Question.find({"job.$id": job.id}).to_list())
    print(f"Current Questions: {len(current)}")
    
    if len(current) == 0:
        print("Triggering robust question generation...")
        generate_exam_task(job_id)
        
        # Verify
        after = sync_db_call(lambda: Question.find({"job.$id": job.id}).to_list())
        print(f"Recovery Complete. New Questions: {len(after)}")
    else:
        print("Questions already exist. No action needed.")

if __name__ == "__main__":
    main()
