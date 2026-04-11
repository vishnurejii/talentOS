from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import sync_db_call, to_dict
from rest_framework import status
from datetime import timedelta
import requests
import os
import sys

try:
    from models.exam import Question, ExamSession
    from models.job import Job
    from models.application import Application
except ImportError:
    from shared_models.exam import Question, ExamSession
    from shared_models.job import Job
    from shared_models.application import Application

from shared_models.user import get_utc_now

JUDGE0_URL = os.getenv("JUDGE0_URL", "http://judge0:2358")

class RecordViolationView(APIView):
    """Log a proctoring violation (e.g. tab switching)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")
        violation_type = request.data.get("type", "UNKNOWN")
        
        session = sync_db_call(ExamSession.get(session_id))
        if not session or session.status != "ACTIVE":
            return Response({"error": "Invalid session"}, status=400)
            
        violation = {
            "type": violation_type,
            "timestamp": str(get_utc_now()),
            "description": f"Candidate left the exam tab ({violation_type})"
        }
        session.proctoring_violations.append(violation)
        session.warning_count += 1
        
        # Auto-complete if too many violations
        if session.warning_count >= 3:
            session.status = "COMPLETED"
            
        sync_db_call(session.save())
        
        return Response(to_dict({
            "recorded": True, 
            "warning_count": session.warning_count,
            "status": session.status
        }))


class StartExamView(APIView):
    """Candidate starts an exam for a job they applied to."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        job_id = request.data.get("job_id")
        if not job_id:
            return Response({"error": "job_id is required"}, status=400)

        job = sync_db_call(Job.get(job_id))
        if not job:
            return Response({"error": "Job not found"}, status=404)

        # Check candidate has EXAM_PENDING status
        app_doc = sync_db_call(Application.find_one(
            Application.job.id == job.id, 
            Application.candidate.id == request.user.id
        ))

        # Find or create exam session
        existing = sync_db_call(ExamSession.find_one(
            ExamSession.job.id == job.id,
            ExamSession.candidate.id == request.user.id,
        ))
        if existing and existing.status != "GENERATED":
            return Response({"error": "Exam already started or completed"}, status=400)

        # Fetch questions for this job
        questions = sync_db_call(Question.find(Question.job.id == job.id).to_list())

        now = get_utc_now()
        session = ExamSession(
            job=job,
            candidate=request.user,
            questions=[q for q in questions],
            started_at=now,
            ends_at=now + timedelta(minutes=job.exam_duration_mins),
            status="ACTIVE",
        )
        sync_db_call(session.insert())

        # Build response with questions (no answers)
        q_data = []
        for q in questions:
            qd = {
                "id": str(q.id),
                "question_text": q.question_text,
                "question_type": str(q.question_type.value if hasattr(q.question_type, 'value') else q.question_type),
                "points": q.points,
            }
            if qd["question_type"] == "MCQ":
                qd["options"] = q.options
            elif qd["question_type"] == "CODING":
                qd["starter_code"] = q.starter_code
                qd["language"] = q.language
            q_data.append(qd)

        return Response(to_dict({
            "session_id": str(session.id),
            "job_title": job.title,
            "duration_mins": job.exam_duration_mins,
            "started_at": str(session.started_at),
            "ends_at": str(session.ends_at),
            "questions": q_data,
        }))


class RunTestView(APIView):
    """Run code against test cases without saving progress (LeetCode-style feedback)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question_id = request.data.get("question_id")
        code = request.data.get("code")

        question = sync_db_call(Question.get(question_id))
        if not question:
            return Response({"error": "Question not found"}, status=404)

        results = _evaluate_code(code, question)
        return Response(to_dict(results))


class SubmitAnswerView(APIView):
    """Submit a single answer and record the score."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")
        question_id = request.data.get("question_id")
        answer = request.data.get("answer")

        session = sync_db_call(ExamSession.get(session_id))
        if not session or session.status != "ACTIVE":
            return Response({"error": "Invalid or inactive session"}, status=400)

        # Check time
        now = get_utc_now()
        if session.ends_at and now > session.ends_at:
            session.status = "COMPLETED"
            sync_db_call(session.save())
            return Response({"error": "Exam time expired"}, status=400)

        question = sync_db_call(Question.get(question_id))
        if not question:
            return Response({"error": "Question not found"}, status=404)

        score = 0
        evaluation = None
        q_type = str(question.question_type.value if hasattr(question.question_type, 'value') else question.question_type)
        if q_type == "MCQ":
            if answer is not None and int(answer) == question.correct_option_index:
                score = question.points
        elif q_type == "CODING":
            evaluation = _evaluate_code(answer, question)
            score = evaluation.get("score", 0)

        # Update answers array
        session.answers = [a for a in session.answers if a.get("question_id") != question_id]
        session.answers.append({
            "question_id": question_id, 
            "answer": str(answer), 
            "score": score,
            "test_results": evaluation
        })
        sync_db_call(session.save())

        return Response(to_dict({
            "question_id": question_id, 
            "score": score, 
            "evaluation": evaluation,
            "recorded": True
        }))


class FinishExamView(APIView):
    """Candidate finishes the exam — calculates total score."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")
        session = sync_db_call(ExamSession.get(session_id))
        if not session:
            return Response({"error": "Session not found"}, status=404)

        session.submitted_at = get_utc_now()
        session.total_score = sum(a.get("score", 0) for a in session.answers)
        session.status = "COMPLETED"
        sync_db_call(session.save())

        # Update the Application with exam_score
        job_id = session.job.id if hasattr(session.job, 'id') else session.job
        cand_id = session.candidate.id if hasattr(session.candidate, 'id') else session.candidate

        app_doc = sync_db_call(Application.find_one(
            Application.job.id == job_id,
            Application.candidate.id == cand_id,
        ))
        if app_doc:
            app_doc.exam_score = session.total_score
            # Calculate final score using job weights
            job_obj = sync_db_call(Job.get(job_id))
            if job_obj and app_doc.ats_score is not None:
                app_doc.final_score = (app_doc.ats_score * job_obj.ats_weight) + (session.total_score * job_obj.exam_weight)
            app_doc.status = "EXAM_DONE"
            sync_db_call(app_doc.save())

        return Response(to_dict({
            "session_id": str(session.id),
            "total_score": session.total_score,
            "status": "COMPLETED",
        }))


def _evaluate_code(code: str, question) -> dict:
    """Submit code to Judge0 and return detailed results."""
    if not question.test_cases:
        return {"passed": 0, "total": 0, "score": 0, "results": []}

    lang_ids = {"python": 71, "javascript": 63, "java": 62, "c++": 54}
    lang_id = lang_ids.get(question.language, 71)
    
    cases_passed = 0
    test_results = []

    for tc in question.test_cases:
        case_info = {"input": tc.get("input"), "expected": tc.get("expected"), "passed": False}
        try:
            resp = requests.post(f"{JUDGE0_URL}/submissions?wait=true", json={
                "source_code": code,
                "language_id": lang_id,
                "stdin": tc.get("input", ""),
                "expected_output": tc.get("expected", ""),
            }, timeout=30)
            result = resp.json()
            
            case_info["stdout"] = result.get("stdout")
            case_info["stderr"] = result.get("stderr")
            case_info["compile_output"] = result.get("compile_output")
            case_info["status"] = result.get("status", {}).get("description")
            
            if result.get("status", {}).get("id") == 3:  # Accepted
                case_info["passed"] = True
                cases_passed += 1
        except Exception as e:
            case_info["error"] = str(e)
            
        test_results.append(case_info)

    score = round((cases_passed / len(question.test_cases)) * question.points, 2)
    return {
        "passed": cases_passed,
        "total": len(question.test_cases),
        "score": score,
        "test_results": test_results
    }
