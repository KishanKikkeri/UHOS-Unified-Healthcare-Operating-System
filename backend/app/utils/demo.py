"""
Phase 12 — Demo Mode.

Small, dependency-free config module, read dynamically (not cached at
import time) so `DEMO_MODE` can be toggled per-test via `monkeypatch.setenv`
without needing to reimport the module -- same reasoning as
`ACCESS_TOKEN_EXPIRE_MINUTES` in security.py, except that one's fixed at
process start is fine for a token lifetime, whereas DEMO_MODE being flippable
mid-process is exactly what the test suite needs to verify both states.
"""
import os

from app.utils.rbac import ROLES


def is_demo_mode_enabled() -> bool:
    return os.getenv("DEMO_MODE", "false").strip().lower() in ("1", "true", "yes", "on")


# Phase 12 handover doc's literal usernames (admin1, phcadmin1, doctor1,
# pharma1, lab1, patient1) don't exist in this codebase's Phase 11 seed --
# seed_auth.py created admin/district01/opsadmin, phc_sidd/phc_vijaya/...,
# doctor01-06, pharma01-05, lab01-04, patient01-10 instead. Rather than
# adding a second, parallel set of demo-only accounts (which would drift
# from the seed doc), Demo Mode maps each role to the first/most
# representative account seed_auth.py already created for it. See
# PHASE12_DEMO_MODE_HANDOVER.md's "Known deviations" section.
DEMO_ROLE_USERNAME = {
    "district_admin": "admin",
    "facility_admin": "phc_sidd",
    "doctor": "doctor01",
    "pharmacist": "pharma01",
    "lab_technician": "lab01",
    "citizen": "patient01",
}

assert set(DEMO_ROLE_USERNAME.keys()) == set(ROLES), "DEMO_ROLE_USERNAME must cover every role"
