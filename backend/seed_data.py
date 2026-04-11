import asyncio
import os
import django
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Link

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

async def seed():
    # Setup Beanie
    from django.conf import settings
    from shared_models.user import CustomUser, get_utc_now
    from shared_models.job import Job, JobTypeEnum
    from shared_models.exam import Question, QuestionTypeEnum, ExamSession
    from shared_models.application import Application

    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_uri)
    db = client.talentos_db
    await init_beanie(database=db, 
                      document_models=[CustomUser, Job, Application, Question, ExamSession])

    # 1. Ensure Superuser in Beanie
    admin = await CustomUser.find_one(CustomUser.email == "admin@example.com")
    if not admin:
        print("Admin user not found. Please create it first.")
        return

    # 2. Create a Test Job
    job = await Job.find_one(Job.title == "Full Stack Developer (Native Test)")
    if not job:
        job = Job(
            title="Full Stack Developer (Native Test)",
            description="Software engineer for the TalentOS platform. Must know React and Python.",
            skills_required=["python", "react", "django", "javascript"],
            job_type=JobTypeEnum.IT,
            exam_duration_mins=30,
            created_by=admin
        )
        await job.insert()
        print(f"Created Job: {job.title}")

    # 3. Create sample questions
    if await Question.find(Question.job.id == job.id).count() == 0:
        # MCQ
        q1 = Question(
            job=job,
            question_text="What is the default port for Django?",
            question_type=QuestionTypeEnum.MCQ,
            options=["8000", "5000", "3000", "27017"],
            correct_option_index=0,
            points=10
        )
        await q1.insert()

        # Coding
        q2 = Question(
            job=job,
            question_text="Write a function that returns the sum of two numbers.",
            question_type=QuestionTypeEnum.CODING,
            language="python",
            starter_code="def solution(a, b):\n    # write code here\n    pass",
            test_cases=[
                {"input": "1 2", "expected": "3"},
                {"input": "10 -5", "expected": "5"}
            ],
            points=20
        )
        await q2.insert()
        print("Created sample questions (MCQ & Coding)")

    print("--- Seeding Complete ---")

if __name__ == "__main__":
    asyncio.run(seed())
