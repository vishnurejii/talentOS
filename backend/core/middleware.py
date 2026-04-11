"""
BeanieInitMiddleware — initializes Beanie/MongoDB once at startup.
Works correctly with Django's sync WSGI server (runserver).
"""
import os
import sys
import asyncio
import threading
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Ensure shared_models is importable
root_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_path not in sys.path:
    sys.path.insert(0, root_path)

try:
    from models.user import CustomUser
    from models.job import Job
    from models.application import Application
    from models.exam import Question, ExamSession
except ImportError:
    from shared_models.user import CustomUser
    from shared_models.job import Job
    from shared_models.application import Application
    from shared_models.exam import Question, ExamSession

_beanie_initialized = False
_lock = threading.Lock()


def _run_beanie_init():
    """Run Beanie init in a new event loop (for sync WSGI context)."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def _init():
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/talentos_db")
        client = AsyncIOMotorClient(mongo_uri)
        await init_beanie(
            database=client.get_database(),
            document_models=[CustomUser, Job, Application, Question, ExamSession],
        )

    loop.run_until_complete(_init())
    # Keep loop alive for motor async operations
    asyncio.set_event_loop(loop)


class BeanieInitMiddleware:
    """WSGI-compatible middleware that ensures Beanie is initialized once."""

    def __init__(self, get_response):
        self.get_response = get_response
        global _beanie_initialized
        with _lock:
            if not _beanie_initialized:
                _run_beanie_init()
                _beanie_initialized = True

    def __call__(self, request):
        return self.get_response(request)
