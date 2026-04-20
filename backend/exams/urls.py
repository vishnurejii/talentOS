from django.urls import path
from .views import StartExamView, SubmitAnswerView, FinishExamView, RunTestView, RecordViolationView, AdminViolationLogView, AdminSessionDetailView

urlpatterns = [
    path('start/', StartExamView.as_view(), name='exam-start'),
    path('submit/', SubmitAnswerView.as_view(), name='exam-submit'),
    path('run-test/', RunTestView.as_view(), name='exam-run-test'),
    path('violation/', RecordViolationView.as_view(), name='exam-record-violation'),
    path('admin/violations/', AdminViolationLogView.as_view(), name='exam-admin-violations'),
    path('admin/sessions/<str:pk>/', AdminSessionDetailView.as_view(), name='exam-admin-session-detail'),
    path('finish/', FinishExamView.as_view(), name='exam-finish'),
]
