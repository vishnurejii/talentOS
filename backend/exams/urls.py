from django.urls import path
from .views import StartExamView, SubmitAnswerView, FinishExamView, RunTestView, RecordViolationView

urlpatterns = [
    path('start/', StartExamView.as_view(), name='exam-start'),
    path('submit/', SubmitAnswerView.as_view(), name='exam-submit'),
    path('run-test/', RunTestView.as_view(), name='exam-run-test'),
    path('violation/', RecordViolationView.as_view(), name='exam-record-violation'),
    path('finish/', FinishExamView.as_view(), name='exam-finish'),
]
