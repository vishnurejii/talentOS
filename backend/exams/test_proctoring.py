import pytest
from django.test import Client
from rest_framework.test import APIClient
from shared_models.user import CustomUser, RoleEnum
from shared_models.job import Job
from shared_models.exam import ExamSession, ExamStatusEnum
from core.db import sync_db_call
from django.contrib.auth.hashers import make_password

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def hr_user():
    user = CustomUser(
        email="proctor_test@test.com",
        password=make_password("pass123"),
        full_name="Proctor Test",
        role=RoleEnum.HR
    )
    sync_db_call(user.insert())
    return user

def test_proctoring_violation(api_client, hr_user):
    # Setup job and session
    job = Job(title="Test Job", category="IT", hr_manager=hr_user)
    sync_db_call(job.insert())
    
    session = ExamSession(
        job=job,
        candidate=hr_user,
        status=ExamStatusEnum.ACTIVE
    )
    sync_db_call(session.insert())
    
    api_client.force_authenticate(user=hr_user)
    
    # Record violation
    response = api_client.post('/api/exams/violation/', {
        "session_id": str(session.id),
        "type": "TAB_SWITCH"
    })
    
    assert response.status_code == 200
    assert response.data['warning_count'] == 1
    
    # Record 2 more to trigger disqualification
    api_client.post('/api/exams/violation/', {"session_id": str(session.id), "type": "TAB_SWITCH"})
    resp = api_client.post('/api/exams/violation/', {"session_id": str(session.id), "type": "TAB_SWITCH"})
    
    assert resp.data['warning_count'] == 3
    assert resp.data['status'] == "COMPLETED"
