from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import sync_db_call, to_dict
from rest_framework import status
from datetime import timedelta
import requests
import os
import sys
from bson import ObjectId

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
        
        session = sync_db_call(lambda: ExamSession.get(session_id))
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
            
        sync_db_call(lambda: session.save())
        
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

        job = sync_db_call(lambda: Job.get(job_id))
        if not job:
            return Response({"error": "Job not found"}, status=404)

        # Check candidate has EXAM_PENDING status
        app_doc = sync_db_call(lambda: Application.find_one(
            Application.job.id == job.id, 
            Application.candidate.id == request.user.id
        ))

        # Find existing session
        existing = sync_db_call(lambda: ExamSession.find_one(
            ExamSession.job.id == job.id,
            ExamSession.candidate.id == request.user.id,
        ))

        if existing:
            if existing.status == "COMPLETED":
                # Ghost session: was marked COMPLETED without a real submission
                # (e.g. from a previous bug). Delete it and let the candidate retry.
                if existing.submitted_at is None:
                    sync_db_call(lambda: existing.delete())
                    # Fall through to create a new session below
                else:
                    return Response({"error": "Exam already completed"}, status=400)
            
            # Resumption Logic: If already active, return the existing state
            if existing.status == "ACTIVE":
                # Check if the session has already expired
                from datetime import timezone as _tz
                now = get_utc_now()
                ends_at = existing.ends_at
                if ends_at is not None:
                    if ends_at.tzinfo is None:
                        ends_at = ends_at.replace(tzinfo=_tz.utc)
                    if now > ends_at:
                        # Session expired — delete it and create a fresh one
                        sync_db_call(lambda: existing.delete())
                        # Fall through to create a new session below
                    else:
                        # Valid active session — resume it
                        questions = []
                        for q_link in existing.questions:
                            try:
                                q = sync_db_call(lambda: q_link.fetch())
                                if q: questions.append(q)
                            except:
                                pass

                        if not questions:
                            questions = sync_db_call(lambda: Question.find({"job.$id": job.id}).to_list())

                        q_data = self._format_questions(questions)
                        return Response(to_dict({
                            "session_id": str(existing.id),
                            "job_title": job.title,
                            "duration_mins": job.exam_duration_mins,
                            "started_at": str(existing.started_at),
                            "ends_at": str(existing.ends_at),
                            "questions": q_data,
                            "warning_count": existing.warning_count,
                            "answers": existing.answers,
                        }))

        # Fetch questions for this job - try both standard and link-specific query
        questions = sync_db_call(lambda: Question.find(
            {"job.$id": job.id}
        ).to_list())
        if not questions:
             questions = sync_db_call(lambda: Question.find(
                Question.job.id == job.id
            ).to_list())

        now = get_utc_now()
        session = ExamSession(
            job=job,
            candidate=request.user,
            questions=[q for q in questions],
            started_at=now,
            ends_at=now + timedelta(minutes=job.exam_duration_mins),
            status="ACTIVE",
        )
        sync_db_call(lambda: session.insert())

        # Build response with questions (no answers)
        q_data = self._format_questions(questions)

        return Response(to_dict({
            "session_id": str(session.id),
            "job_title": job.title,
            "duration_mins": job.exam_duration_mins,
            "started_at": str(session.started_at),
            "ends_at": str(session.ends_at),
            "questions": q_data,
        }))

    def _format_questions(self, questions):
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
        return q_data


class RunTestView(APIView):
    """Run code against test cases without saving progress (LeetCode-style feedback)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question_id = request.data.get("question_id")
        code = request.data.get("code")

        question = sync_db_call(lambda: Question.get(question_id))
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

        async def _atomic_submit():
            try:
                sid = ObjectId(session_id)
                qid = ObjectId(question_id)
            except Exception:
                return {"error": "Invalid session_id or question_id", "code": 400}

            session = await ExamSession.get(sid)
            if not session or session.status != "ACTIVE":
                return {"error": "Invalid or inactive session", "code": 400}

            # Check time — normalize to UTC-aware before comparing
            now = get_utc_now()
            ends_at = session.ends_at
            if ends_at is not None:
                from datetime import timezone as _tz
                if ends_at.tzinfo is None:
                    ends_at = ends_at.replace(tzinfo=_tz.utc)
                if now > ends_at:
                    session.status = "COMPLETED"
                    await session.save()
                    return {"error": "Exam time expired", "code": 400}


            question = await Question.get(qid)
            if not question:
                return {"error": "Question not found", "code": 404}

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
            session.answers = [a for a in session.answers if a.get("question_id") != str(qid)]
            session.answers.append({
                "question_id": str(qid),
                "answer": str(answer),
                "score": score,
                "test_results": evaluation
            })
            await session.save()
            return {
                "question_id": str(qid),
                "score": score,
                "evaluation": evaluation,
                "recorded": True
            }

        try:
            result = sync_db_call(_atomic_submit)
        except Exception as e:
            import traceback
            print("[SubmitAnswer ERROR]", traceback.format_exc())
            return Response({"error": str(e)}, status=500)

        if isinstance(result, dict) and "error" in result:
            return Response({"error": result["error"]}, status=result.get("code", 400))

        return Response(to_dict(result))


class FinishExamView(APIView):
    """Candidate finishes the exam — calculates total score."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")

        async def _atomic_finish():
            try:
                sid = ObjectId(session_id)
            except Exception:
                return {"error": "Invalid session_id", "code": 400}

            session = await ExamSession.get(sid)
            if not session:
                return {"error": "Session not found", "code": 404}

            session.submitted_at = get_utc_now()
            session.total_score = sum(a.get("score", 0) for a in session.answers)
            session.status = "COMPLETED"
            await session.save()

            # Extract IDs correctly from Beanie Link objects (unfetched links use .ref.id)
            def _extract_id(field):
                # Fetched document: has .id directly
                if hasattr(field, 'id') and not hasattr(field, 'ref'):
                    return str(field.id)
                # Unfetched Link: has .ref.id
                if hasattr(field, 'ref') and field.ref is not None:
                    return str(field.ref.id)
                # Fallback: stringify whatever we have
                return str(field)

            job_id = _extract_id(session.job)
            cand_id = _extract_id(session.candidate)

            app_doc = await Application.find_one({
                "job.$id": ObjectId(job_id),
                "candidate.$id": ObjectId(cand_id),
            })
            if app_doc:
                app_doc.exam_score = session.total_score
                job_obj = await Job.get(ObjectId(job_id))
                if job_obj:
                    ats_val = app_doc.ats_score or 0
                    exam_val = session.total_score or 0
                    app_doc.final_score = (ats_val * job_obj.ats_weight) + (exam_val * job_obj.exam_weight)

                app_doc.status = "EXAM_DONE"
                await app_doc.save()

            return {
                "session_id": str(session.id),
                "total_score": session.total_score,
                "status": "COMPLETED",
            }

        try:
            result = sync_db_call(_atomic_finish)
        except Exception as e:
            import traceback
            print("[FinishExam ERROR]", traceback.format_exc())
            return Response({"error": str(e)}, status=500)

        if isinstance(result, dict) and "error" in result:
            return Response({"error": result["error"]}, status=result.get("code", 400))

        return Response(to_dict(result))


class AdminViolationLogView(APIView):
    """HR only: list all sessions with proctoring violations."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', None) != "HR":
            return Response({"error": "Unauthorized"}, status=403)
        
        # Find all sessions that have at least one violation or were completed
        sessions = sync_db_call(lambda: ExamSession.find(
            ExamSession.warning_count > 0
        ).sort(-ExamSession.submitted_at).to_list())
        
        return Response(to_dict(sessions))


class AdminSessionDetailView(APIView):
    """HR only: get full details of a specific exam session."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if getattr(request.user, 'role', None) != "HR":
            return Response({"error": "Unauthorized"}, status=403)
        
        session = sync_db_call(lambda: ExamSession.get(pk))
        if not session:
            return Response({"error": "Session not found"}, status=404)
        
        return Response(to_dict(session))


def _evaluate_code(code: str, question) -> dict:
    """Submit code to Judge0 and return detailed results."""
    if not question.test_cases:
        return {"passed": 0, "total": 0, "score": 0, "test_results": []}

    lang_ids = {"python": 71, "javascript": 63, "java": 62, "c++": 54}
    lang_id = lang_ids.get(question.language, 71)
    
    # ── Wrap code with a driver if it's a function-based question ─────────────
    wrapped_code = code
    if question.language == "python" and "def solution" in code:
        # We use json.dumps to ensure output matches JSON-encoded expected values (e.g. strings get quotes)
        driver = "\n\nimport sys, json\ntry:\n    inp = sys.stdin.read().strip()\n    try: args = json.loads(inp)\n    except: args = inp\n    res = solution(args)\n    print(json.dumps(res))\nexcept Exception as e: sys.stderr.write(str(e))\n"
        wrapped_code = code + driver
    elif question.language == "javascript" and "function solution" in code:
        driver = "\n\nconst fs = require('fs');\ntry {\n  const inp = fs.readFileSync(0, 'utf8').trim();\n  let args; try { args = JSON.parse(inp); } catch(e) { args = inp; }\n  console.log(JSON.stringify(solution(args)));\n} catch(e) { console.error(e.message); }\n"
        wrapped_code = code + driver

    cases_passed = 0
    test_results = []

    for tc in question.test_cases:
        expected = str(tc.get("expected", "")).strip()
        case_info = {"input": tc.get("input"), "expected": expected, "passed": False}
        try:
            resp = requests.post(f"{JUDGE0_URL}/submissions?wait=true", json={
                "source_code": wrapped_code,
                "language_id": lang_id,
                "stdin": str(tc.get("input", "")),
            }, timeout=30)
            result = resp.json()
            
            # Note: stdout now contains JSON-serialized result
            actual = str(result.get("stdout") or "").strip()
            case_info["stdout"] = actual
            case_info["stderr"] = result.get("stderr")
            case_info["compile_output"] = result.get("compile_output")
            case_info["status"] = result.get("status", {}).get("description")
            
            # Direct comparison with JSON strings
            if actual == expected or actual.lower() == expected.lower(): 
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
