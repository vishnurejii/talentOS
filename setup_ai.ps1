cd c:\Users\vishn\OneDrive\Desktop\TalentOS\ai_services
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn motor beanie pydantic pytest httpx spacy sentence-transformers pdfplumber python-decouple
pip freeze > requirements.txt
