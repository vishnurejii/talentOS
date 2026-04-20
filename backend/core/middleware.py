"""
BeanieInitMiddleware — simplified to allow the per-request sync_db_call 
to handle initialization safely across different event loops.
"""

class BeanieInitMiddleware:
    """WSGI-compatible pass-through middleware."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # We now handle initialization lazily inside sync_db_call
        # to ensure the model -> loop mapping is always correct.
        return self.get_response(request)
