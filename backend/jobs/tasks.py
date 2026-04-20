"""
Background tasks for the jobs app (monolith native).
──────────────────────────────────────────────────
Pipeline:  apply → parse_cv_task → score_ats_task → update Application
"""
import os
import sys
import logging
from shared_models.user import get_utc_now
from core import ai_logic
from core.db import sync_db_call

try:
    from models.user import CustomUser
    from models.job import Job
    from models.application import Application
    from models.exam import Question, ExamSession, QuestionTypeEnum
except ImportError:
    from shared_models.user import CustomUser
    from shared_models.job import Job
    from shared_models.application import Application
    from shared_models.exam import Question, ExamSession, QuestionTypeEnum
    from shared_models.application import Application
    from shared_models.exam import Question, ExamSession

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# TASK 1: Parse CV
# ──────────────────────────────────────────────────────────────────────────────
def parse_cv_task(application_id: str):
    """
    1. Fetch Application from MongoDB
    2. Extract text and skills locally
    3. Chain into ATS scoring
    """
    async def _run():
        app_doc = await Application.get(application_id)
        if not app_doc:
            logger.error(f"Application {application_id} not found")
            return None

        # Mark as processing
        app_doc.status = "ATS_PROCESSING"
        await app_doc.save()

        # Local CV parser
        try:
            import os
            if os.path.exists(app_doc.cv_url):
                with open(app_doc.cv_url, "rb") as f:
                    pdf_bytes = f.read()
            else:
                # Fallback
                pdf_bytes = ai_logic.download_cv_from_minio(app_doc.cv_url)
                
            raw_text = ai_logic.extract_text_from_pdf(pdf_bytes)
            parsed = {
                "raw_text": raw_text[:5000],
                "extracted_skills": ai_logic.extract_skills(raw_text),
                "experience_years": ai_logic.extract_experience(raw_text),
                "education": ai_logic.extract_education(raw_text),
            }
            return parsed
        except Exception as exc:
            logger.error(f"CV parse failed locally for {application_id}: {exc}")
            app_doc.status = "FAILED"
            await app_doc.save()
            return None

    parsed = sync_db_call(_run)

    if parsed:
        # Chain to ATS scoring directly
        score_ats_task(application_id, parsed)

    return {"application_id": application_id, "parsed": bool(parsed)}


# ──────────────────────────────────────────────────────────────────────────────
# TASK 2: Score CV against Job
# ──────────────────────────────────────────────────────────────────────────────
def score_ats_task(application_id: str, parsed_data: dict):
    """
    1. Fetch Application + linked Job
    2. Calculate ATS score locally
    3. Update application with ats_score and advance status
    """
    async def _run():
        app_doc = await Application.get(application_id)
        if not app_doc:
            return

        # Fetch the linked job
        job_id = app_doc.job.ref.id if hasattr(app_doc.job, 'ref') else app_doc.job
        job = await Job.get(job_id)
        if not job:
            return

        # Local ATS scoring
        try:
            ats_score, matched = ai_logic.calculate_ats_score(
                parsed_data.get("extracted_skills", []),
                parsed_data.get("experience_years"),
                parsed_data.get("education", []),
                parsed_data.get("raw_text", ""),
                job.skills_required,
                job.description
            )
            
            # Persist the score
            app_doc.ats_score = ats_score
            app_doc.status = "EXAM_PENDING"
            await app_doc.save()
            
            logger.info(f"App {application_id} scored {ats_score:.1f}")
        except Exception as exc:
            logger.error(f"ATS scoring failed: {exc}")
            app_doc.status = "FAILED"
            await app_doc.save()

    sync_db_call(_run)
    return {"application_id": application_id, "status": "scored"}


# ──────────────────────────────────────────────────────────────────────────────
# TASK 3: Generate Exam Questions for a Job
# ──────────────────────────────────────────────────────────────────────────────
def generate_exam_task(job_id: str):
    """
    1. Fetch Job
    2. Pick relevant questions from ai_logic bank
    3. Save them to 'questions' collection and link to job_id
    """
    async def _run():
        job = await Job.get(job_id)
        if not job:
            logger.error(f"Job {job_id} not found for exam generation")
            return

        # Get questions from Generative AI (Cloud-based)
        skills = job.skills_required or []
        logger.info(f"Generating questions for job {job_id} with skills: {skills}")
        
        # Check if questions already exist to avoid duplication
        existing_count = await Question.find(Question.job.id == job.id).count()
        if existing_count >= 5:
            logger.info(f"Job {job_id} already has {existing_count} questions. Skipping.")
            return

        library = ai_logic.gemini_generate_questions(job.title, skills)
        
        # Handle different key names from AI response vs local bank
        mcqs = library.get("mcqs") or library.get("MCQ") or []
        coding_probs = library.get("coding") or library.get("CODING") or []

        # Insert MCQs
        for q in mcqs:
            doc = Question(
                job=job,
                question_text=q.get("question") or q.get("text"),
                question_type=QuestionTypeEnum.MCQ,
                options=q.get("options"),
                correct_option_index=q.get("correct_index") or q.get("correct"),
                points=q.get("points", 5)
            )
            await doc.insert()
            
        # Insert Coding Problems
        for q in coding_probs:
            doc = Question(
                job=job,
                question_text=q.get("question") or q.get("text"),
                question_type=QuestionTypeEnum.CODING,
                starter_code=q.get("starter_code") or q.get("starter"),
                language=q.get("language", "python"),
                test_cases=q.get("test_cases", []),
                points=q.get("points", 20)
            )
            await doc.insert()
            
        logger.info(f"Generated {len(mcqs)} MCQs and {len(coding_probs)} Coding questions for job {job_id}")
        
        # Double check if any questions were created. If not, force a generic fallback.
        final_count = await Question.find(Question.job.id == job.id).count()
        if final_count == 0:
            logger.warning(f"Failed to generate questions for {job_id}. Forcing generic bank.")
            fallback = ai_logic.get_questions_for_skills(["python", "general"])
            for q in (fallback.get("MCQ") or []):
                await Question(job=job, question_text=q.get("text"), question_type=QuestionTypeEnum.MCQ, options=q.get("options"), correct_option_index=q.get("correct"), points=5).insert()
            for q in (fallback.get("CODING") or []):
                await Question(job=job, question_text=q.get("text"), question_type=QuestionTypeEnum.CODING, starter_code=q.get("starter"), language=q.get("language", "python"), test_cases=q.get("test_cases", []), points=20).insert()

    sync_db_call(_run)
    return {"job_id": job_id, "status": "generated"}


# ──────────────────────────────────────────────────────────────────────────────
# TASK 4: Recompute rankings
# ──────────────────────────────────────────────────────────────────────────────
def recompute_rankings_task(job_id: str):
    """
    Fetch all applications for a job, sort by final_score desc, update ranks.
    """
    async def _run():
        apps = await Application.find(
            Application.job.id == job_id,
            Application.final_score != None,
        ).sort("-final_score").to_list()

        for rank, app_doc in enumerate(apps, start=1):
            app_doc.rank = rank
            await app_doc.save()

        logger.info(f"Ranked {len(apps)} applications for job {job_id}")

    sync_db_call(_run)
