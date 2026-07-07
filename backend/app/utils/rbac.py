"""
Phase 11 — Authentication & RBAC.

Single source of truth for role names and their default landing route,
shared by routes_auth.py (login response) and the frontend RBAC config
(frontend/lib/rbac.ts mirrors this list -- keep the two in sync by hand,
same as messages/*.json are hand-kept in sync across languages).
"""

ROLES = [
    "district_admin",
    "facility_admin",
    "doctor",
    "pharmacist",
    "lab_technician",
    "citizen",
]

# Where the frontend should redirect a user immediately after login.
ROLE_HOME_ROUTE = {
    "district_admin": "/dashboard",
    "facility_admin": "/operations",
    "doctor": "/doctor",
    "pharmacist": "/inventory",
    "lab_technician": "/operations",
    "citizen": "/citizen",
}


def is_valid_role(role: str) -> bool:
    return role in ROLES
