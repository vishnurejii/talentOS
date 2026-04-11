import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from django.conf import settings

def to_dict(obj):
    """
    Recursively converts Beanie documents, Pydantic objects, ObjectIDs,
    and Links into JSON-serializable dictionaries/strings.
    """
    import datetime
    import enum
    from bson import ObjectId
    from beanie import Document, Link
    from pydantic import BaseModel

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


def sync_db_call(coro):
    """
    Safely executes an asynchronous Mongo/Beanie operation in a strictly
    isolated event loop. This perfectly prevents RuntimeErrors associated
    with PyMongo locking to cross-thread boundaries.
    """
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    from beanie import init_beanie
    from django.conf import settings
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Delay import to avoid circular dependencies
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
        
    async def wrapper():
        client = AsyncIOMotorClient(settings.MONGO_URI)
        await init_beanie(
            database=client.talentos_db, 
            document_models=[CustomUser, Job, Application, Question, ExamSession]
        )
        return await coro
        
    try:
        return loop.run_until_complete(wrapper())
    finally:
        loop.close()
