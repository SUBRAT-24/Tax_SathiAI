"""
Auth middleware — JWT verification, role checking, admin guard.
Re-exports from __init__ for clean imports.
"""

from app.middleware import (
    create_access_token,
    create_refresh_token,
    verify_token,
    hash_password,
    hash_password_async,
    verify_password,
    verify_password_async,
    get_current_user,
    get_admin_user,
    verify_admin_credentials,
    verify_admin_credentials_async,
)

__all__ = [
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "hash_password",
    "hash_password_async",
    "verify_password",
    "verify_password_async",
    "get_current_user",
    "get_admin_user",
    "verify_admin_credentials",
    "verify_admin_credentials_async",
]
