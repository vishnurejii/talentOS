import os
import sys
import logging
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Setup path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, ".."))

from shared_models.job import Job
from shared_models.exam import Question, ExamSession
from jobs.tasks import generate_exam_task
from core.db import sync_db_call

async def _run():
    # Setup Mongo
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    database = client.talentos_db
    await init_beanie(database, document_models=[Job, Question, ExamSession])
    
    print("Clearing old questions and exam sessions to force re-generation...")
    await Question.find_all().delete()
    # Note: We keep sessions if they are ACTIVE but for a "refresh" we might want to clear them too?
    # Let's just clear questions. generate_exam_task creates questions.
    
    jobs = await Job.find_all().to_list()
    print(f"Refreshing {len(jobs)} jobs...")
    
    for job in jobs:
        print(f"Generating for: {job.title}")
        # Note: generate_exam_task is synchronous wrapper around async, but here we are in async.
        # So we just manually call the logic or call the task.
        # Since the task calls sync_db_call internally, we shouldn't call it here easily.
        # I'll just call the task from outside async.
        pass

if __name__ == "__main__":
    import asyncio
    
    # Run cleanup
    asyncio.run(_run())
    
    # Run generation
    import core.db
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.talentos_db
    sync_db_call(init_beanie(db, document_models=[Job, Question, ExamSession]))
    
    jobs = sync_db_call(Job.find_all().to_list())
    for job in jobs:
        print(f"Re-generating questions for: {job.title}")
        generate_exam_task(str(job.id))
        
    print("Done! All jobs now have fresh MCQs and Coding questions.")
