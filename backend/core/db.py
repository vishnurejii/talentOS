import asyncio
import threading
import time
import enum
import datetime
from bson import ObjectId
from beanie import Document, Link, init_beanie
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from django.conf import settings

def to_dict(obj):
    """
    Recursively converts Beanie documents, Pydantic objects, ObjectIDs,
    and Links into JSON-serializable dictionaries/strings.
    """
    if isinstance(obj, list):
        return [to_dict(item) for item in obj]
    if isinstance(obj, dict):
        return {k: to_dict(v) for k, v in obj.items()}
    if isinstance(obj, enum.Enum):
        return obj.value
    if isinstance(obj, Document):
        data = obj.model_dump()
        data['id'] = str(obj.id)
        return to_dict(data)
    if isinstance(obj, Link):
        return str(obj.ref.id) if hasattr(obj, 'ref') else str(obj)
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    if isinstance(obj, BaseModel):
        return to_dict(obj.model_dump())
    
    return obj

# ── Atomic Database Worker ───────────────────────────────────────────────────
# This is the industry-standard architecture for using Beanie (Async) inside 
# Sync Django on Windows. We maintain a single persistent background thread 
# with its own event loop and connection.

_db_loop = None
_db_thread = None
_initialized = False
_lock = threading.Lock()

def _run_event_loop():
    """Background thread target function."""
    global _db_loop
    _db_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_db_loop)
    _db_loop.run_forever()

def _ensure_worker_ready():
    """Starts the background DB thread and initializes Beanie exactly once."""
    global _db_thread, _db_loop, _initialized
    
    with _lock:
        if _db_thread is None:
            _db_thread = threading.Thread(target=_run_event_loop, daemon=True, name="TalentOS-DB-Atomic-Worker")
            _db_thread.start()
            
            # Wait for loop to start
            while _db_loop is None:
                time.sleep(0.01)

        if not _initialized:
            # Dispatch initialization to the background loop
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

            async def _init():
                client = AsyncIOMotorClient(settings.MONGO_URI)
                # Force specific database name from URI if present, else 'talentos_db'
                db_name = client.get_database().name
                if db_name == 'test': db_name = 'talentos_db'
                
                await init_beanie(
                    database=client[db_name],
                    document_models=[CustomUser, Job, Application, Question, ExamSession]
                )

            future = asyncio.run_coroutine_threadsafe(_init(), _db_loop)
            future.result(timeout=30) # Block until init is done
            _initialized = True

def sync_db_call(func):
    """
    Safely executes an asynchronous Mongo operation in the atomic worker thread.
    Input MUST be a lambda or a function that returns an awaitable (coroutine or Beanie query).
    Example: sync_db_call(lambda: CustomUser.find_one(email=email))
    """
    _ensure_worker_ready()
    
    if asyncio.iscoroutine(func):
        raise ValueError("sync_db_call now requires a FUNCTION or LAMBDA.")

    async def _eval_wrapper():
        res = func()
        # Beanie queries are awaitable but not technically coroutines
        if hasattr(res, "__await__"):
            return await res
        return res

    future = asyncio.run_coroutine_threadsafe(_eval_wrapper(), _db_loop)
    return future.result()
