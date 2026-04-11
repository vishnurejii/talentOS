cd c:\Users\vishn\OneDrive\Desktop\TalentOS\backend
python -m venv venv
.\venv\Scripts\activate
pip install django djangorestframework djangorestframework-simplejwt motor beanie celery redis django-cors-headers django-celery-results boto3 django-storages python-decouple
django-admin startproject core .
python manage.py startapp accounts
python manage.py startapp jobs
python manage.py startapp exams
python manage.py startapp rankings
python manage.py startapp notifications
pip freeze > requirements.txt
