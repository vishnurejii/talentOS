from django.urls import path
from .views import JobListCreateView, JobDetailView, ApplicationCreateView

urlpatterns = [
    path('', JobListCreateView.as_view(), name='job-list-create'),
    path('apply/', ApplicationCreateView.as_view(), name='application-create'),
    path('<str:pk>/', JobDetailView.as_view(), name='job-detail'),
]
