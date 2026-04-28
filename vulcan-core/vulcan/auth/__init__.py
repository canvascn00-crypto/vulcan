"""
Vulcan Authentication & RBAC
"""

from vulcan.auth.rbac import (
    Role,
    APIKeyRecord,
    generate_api_key,
    create_api_key,
    revoke_api_key,
    list_api_keys,
    get_api_key,
    check_rbac,
    get_current_api_key,
    require_role,
    API_KEY_HEADER,
)

__all__ = [
    "Role",
    "APIKeyRecord", 
    "generate_api_key",
    "create_api_key",
    "revoke_api_key",
    "list_api_keys",
    "get_api_key",
    "check_rbac",
    "get_current_api_key",
    "require_role",
    "API_KEY_HEADER",
]
