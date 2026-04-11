from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from core.db import sync_db_call

try:
    from models.user import CustomUser
except ImportError:
    from shared_models.user import CustomUser


class BeanieJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        from rest_framework_simplejwt.settings import api_settings
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise AuthenticationFailed(
                'Token contained no recognizable user identification',
                code='token_not_valid'
            )

        try:
            user = sync_db_call(CustomUser.get(user_id))
        except Exception:
            raise AuthenticationFailed('User lookup failed', code='user_not_found')

        if not user:
            raise AuthenticationFailed('User not found', code='user_not_found')
        return user
