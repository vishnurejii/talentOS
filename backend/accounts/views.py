"""
Accounts API views — Register, Login, Profile
Uses MongoDB (Beanie) for user storage, JWT for auth.
"""
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from core.db import sync_db_call, to_dict

try:
    from models.user import CustomUser
    from models.user import hash_password
except ImportError:
    from shared_models.user import CustomUser
    from shared_models.user import hash_password


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        full_name = request.data.get("full_name", "").strip()
        role = request.data.get("role", "CANDIDATE").upper()

        if role not in ("CANDIDATE", "HR", "ADMIN"):
            return Response({"error": "Invalid role. Choose CANDIDATE or HR."}, status=400)

        if not email or not password or not full_name:
            return Response({"error": "email, password, and full_name are required."}, status=400)

        # Check uniqueness safely natively
        existing = sync_db_call(CustomUser.find_one(CustomUser.email == email))
        if existing:
            return Response({"error": "Email already registered."}, status=400)

        user = CustomUser(
            email=email,
            password=hash_password(password),
            full_name=full_name,
            role=role,
        )
        sync_db_call(user.insert())

        # Generate tokens
        refresh = RefreshToken()
        refresh["user_id"] = str(user.id)
        refresh["email"] = user.email
        refresh["role"] = user.role
        
        return Response({
            "message": "Registration successful.",
            "user": to_dict(user),
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response({"error": "email and password are required."}, status=400)

        user = sync_db_call(CustomUser.find_one(CustomUser.email == email))
        if not user or not user.check_password(password):
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        # Generate tokens
        refresh = RefreshToken()
        refresh["user_id"] = str(user.id)
        refresh["email"] = user.email
        refresh["role"] = user.role
        
        return Response({
            "message": "Login successful.",
            "user": to_dict(user),
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(to_dict(request.user))

    def patch(self, request):
        user = request.user
        if "full_name" in request.data:
            user.full_name = request.data["full_name"]
        sync_db_call(user.save())
        return Response({"message": "Profile updated.", "user": to_dict(user)})
