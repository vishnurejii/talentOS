from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import sync_db_call, to_dict
from rest_framework import status
import sys
from bson import ObjectId

try:
    from models.application import Application
    from models.job import Job
    from models.exam import ExamSession
except ImportError:
    from shared_models.application import Application
    from shared_models.job import Job
    from shared_models.exam import ExamSession


class JobRankingsView(APIView):
    """HR sees all candidates for one of their jobs, ranked by final_score."""
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        if getattr(request.user, 'role', None) != "HR":
            return Response({"error": "Only HR can view rankings"}, status=status.HTTP_403_FORBIDDEN)

        job = sync_db_call(lambda: Job.get(job_id))
        if not job:
            return Response({"error": "Job not found"}, status=404)

        apps = sync_db_call(lambda: 
            Application.find(Application.job.id == ObjectId(job_id)).sort("-final_score").to_list()
        )

        ranked = []
        for rank, app in enumerate(apps, start=1):
            candidate = None
            try:
                candidate = sync_db_call(lambda: app.candidate.fetch()) if hasattr(app.candidate, 'fetch') else app.candidate
            except:
                pass

            # Find exam session for this candidate and job to get the session_id and warnings
            session = sync_db_call(lambda: ExamSession.find_one(
                ExamSession.job.id == job.id,
                ExamSession.candidate.id == (candidate.id if candidate else None)
            ))

            ranked.append({
                "rank": rank,
                "application_id": str(app.id),
                "candidate_name": getattr(candidate, 'full_name', 'Unknown'),
                "candidate_email": getattr(candidate, 'email', ''),
                "ats_score": app.ats_score,
                "exam_score": app.exam_score,
                "final_score": app.final_score,
                "status": app.status,
                "applied_at": str(app.applied_at),
                "exam_session_id": str(session.id) if session else None,
                "total_warnings": getattr(session, 'warning_count', 0) if session else 0
            })

        return Response(to_dict({
            "job_id": str(job.id),
            "job_title": job.title,
            "total_applicants": len(ranked),
            "rankings": ranked,
        }))


class HRDashboardView(APIView):
    """HR sees all their jobs with applicant counts and top scores."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', None) != "HR":
            return Response({"error": "Only HR can access dashboard"}, status=status.HTTP_403_FORBIDDEN)

        # Convert to ObjectId for raw query or use Beanie query builder correctly
        jobs = sync_db_call(lambda: 
            Job.find({"created_by.$id": ObjectId(request.user.id)}).to_list()
        )

        dashboard = []
        for job in jobs:
            apps = sync_db_call(lambda: 
                Application.find(Application.job.id == job.id).to_list()
            )

            scored = [a for a in apps if a.final_score is not None]
            top_score = max((a.final_score for a in scored), default=None)
            avg_score = (sum(a.final_score for a in scored) / len(scored)) if scored else None

            dashboard.append({
                "job_id": str(job.id),
                "title": job.title,
                "status": job.status,
                "total_applicants": len(apps),
                "scored_applicants": len(scored),
                "top_score": round(top_score, 2) if top_score else None,
                "avg_score": round(avg_score, 2) if avg_score else None,
                "created_at": str(job.created_at),
            })

        return Response(to_dict({"jobs": dashboard}))


class UpdateApplicationStatusView(APIView):
    """HR shortlists or rejects a candidate."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, app_id):
        if getattr(request.user, 'role', None) != "HR":
            return Response({"error": "Only HR can update status"}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get("status")
        if new_status not in ("SHORTLISTED", "REJECTED"):
            return Response({"error": "Status must be SHORTLISTED or REJECTED"}, status=400)

        app_doc = sync_db_call(lambda: Application.get(app_id))
        if not app_doc:
            return Response({"error": "Application not found"}, status=404)

        app_doc.status = new_status
        sync_db_call(lambda: app_doc.save())

        return Response(to_dict({"id": str(app_doc.id), "status": app_doc.status}))


class CandidateDashboardView(APIView):
    """Candidate sees all their applications & statuses."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', None) != "CANDIDATE":
            return Response({"error": "Only candidates can access this"}, status=status.HTTP_403_FORBIDDEN)

        apps = sync_db_call(lambda: 
            Application.find(Application.candidate.id == ObjectId(request.user.id)).to_list()
        )

        results = []
        for app in apps:
            job = None
            try:
                job = sync_db_call(lambda: app.job.fetch()) if hasattr(app.job, 'fetch') else app.job
            except:
                pass

            results.append({
                "application_id": str(app.id),
                "job_title": getattr(job, 'title', 'Unknown'),
                "job_id": str(job.id) if job else None,
                "ats_score": app.ats_score,
                "exam_score": app.exam_score,
                "final_score": app.final_score,
                "rank": app.rank,
                "status": app.status,
                "applied_at": str(app.applied_at),
            })

        return Response(to_dict({"applications": results}))
