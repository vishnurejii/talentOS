from django.urls import path
from .views import JobRankingsView, HRDashboardView, UpdateApplicationStatusView, CandidateDashboardView

urlpatterns = [
    path('hr/dashboard/', HRDashboardView.as_view(), name='hr-dashboard'),
    path('hr/jobs/<str:job_id>/rankings/', JobRankingsView.as_view(), name='job-rankings'),
    path('hr/applications/<str:app_id>/status/', UpdateApplicationStatusView.as_view(), name='update-app-status'),
    path('candidate/dashboard/', CandidateDashboardView.as_view(), name='candidate-dashboard'),
]
