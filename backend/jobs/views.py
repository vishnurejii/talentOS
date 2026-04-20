import os
import uuid
import sys
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from core.db import sync_db_call, to_dict
from rest_framework import status
from django.core.files.uploadedfile import UploadedFile
from django.conf import settings

try:
    from models.job import Job
    from models.application import Application
    from models.exam import Question
except ImportError:
    from shared_models.job import Job
    from shared_models.application import Application
    from shared_models.exam import Question

from jobs.tasks import parse_cv_task, generate_exam_task


def upload_cv_locally(file_obj: UploadedFile, filename: str) -> str:
    """Save CV to local media directory and return a file:// path."""
    upload_dir = Path(settings.BASE_DIR) / "media" / "cvs"
    upload_dir.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4()}_{filename}"
    dest_path = upload_dir / unique_name
    with open(dest_path, "wb") as f:
        for chunk in file_obj.chunks():
            f.write(chunk)
    return str(dest_path)

class JobListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        jobs = sync_db_call(lambda: Job.find_all().to_list())
        return Response(to_dict(jobs))

    def post(self, request):
        if getattr(request.user, 'role', None) != "HR":
            return Response({"error": "Only HR can create jobs"}, status=status.HTTP_403_FORBIDDEN)
        
        job_data = request.data
        job = Job(**job_data, created_by=request.user)
        sync_db_call(lambda: job.insert())
        
        # 🚀 Trigger automated exam generation
        import threading
        threading.Thread(target=generate_exam_task, args=(str(job.id),)).start()
        
        return Response(to_dict(job), status=status.HTTP_201_CREATED)

class JobDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        job = sync_db_call(lambda: Job.get(pk))
        if not job:
            return Response(status=404)
        return Response(to_dict(job))

class ApplicationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, 'role', None) != "CANDIDATE":
            return Response({"error": "Only candidates can apply"}, status=status.HTTP_403_FORBIDDEN)
            
        job_id = request.data.get("job_id")
        cv_file = request.FILES.get("cv_file")
        
        if not job_id or not cv_file:
            return Response({"error": "job_id and cv_file are required"}, status=400)
            
        job = sync_db_call(lambda: Job.get(job_id))
        if not job:
            return Response({"error": "Job not found"}, status=404)
            
        cv_url = upload_cv_locally(cv_file, cv_file.name)
        
        app_doc = Application(
            job=job,
            candidate=request.user,
            cv_url=cv_url
        )
        sync_db_call(lambda: app_doc.insert())
        
        # 🚀 Fire the AI pipeline directly via a local background thread
        import threading
        threading.Thread(target=parse_cv_task, args=(str(app_doc.id),)).start()

        return Response(to_dict(app_doc), status=status.HTTP_201_CREATED)


class JobQuestionListView(APIView):
    """HR only: list all questions for a specific job."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if getattr(request.user, 'role', None) != "HR":
            return Response({"error": "Admin access required"}, status=403)
        
        questions = sync_db_call(lambda: Question.find(
            Question.job_id == pk
        ).to_list())
        
        return Response(to_dict(questions))

