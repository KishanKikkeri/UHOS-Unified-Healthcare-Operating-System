"""
Phase 7 — Demo Polish.

One command to reset UHOS to a known-good demo state and print exactly
what to say while pointing at the screen. This wraps seed.seed_data (the
actual data-building logic is untouched, per the "no functional changes"
rule for this phase) and adds:

  1. A hard reset of the SQLite dev DB file, so re-running the demo twice
     in a row never shows leftover data from the last rehearsal.
  2. A printed cheat sheet of the exact numbers seed_data.py produces,
     so the presenter doesn't have to remember or improvise them live.

Run with: python -m seed.demo_seed
"""
import os
import subprocess
import sys

HERE = os.path.dirname(__file__)
BACKEND_ROOT = os.path.join(HERE, "..")
DB_PATH = os.path.join(BACKEND_ROOT, "uhos.db")


def reset_db_file():
    # Only meaningful for the default local SQLite target -- if
    # DATABASE_URL points at Postgres for a deployed demo, seed_data's own
    # table wipe (DELETE FROM ...) is what actually matters, and this is a
    # harmless no-op.
    if os.getenv("DATABASE_URL", "").startswith("sqlite") or not os.getenv("DATABASE_URL"):
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
            print(f"Removed stale demo DB at {DB_PATH}")


def run_seed():
    result = subprocess.run(
        [sys.executable, "-m", "seed.seed_data"],
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(result.returncode)

    # Phase 11 — Authentication & RBAC: seed demo login accounts after the
    # core dataset exists, so doctor/patient logins can link to real rows.
    auth_result = subprocess.run(
        [sys.executable, "-m", "seed.seed_auth"],
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
    )
    print(auth_result.stdout)
    if auth_result.returncode != 0:
        print(auth_result.stderr, file=sys.stderr)
        sys.exit(auth_result.returncode)


CHEAT_SHEET = """
================================================================
  UHOS DEMO — READY. Cheat sheet for the next 5 minutes:
================================================================

1) DOCTOR WORKSPACE — local dispense
   Doctor: Dr. Anitha Rao (PHC Nanjangud Road)
   Patient: Ramesh Gowda
   Medicine: Paracetamol, quantity 30
   -> "dispensed_locally". Click WHY? to show the explanation panel.

2) DOCTOR WORKSPACE — cross-facility redistribution
   Same doctor/patient. Medicine: Paracetamol, quantity 300
   -> stock at PHC Nanjangud Road is already low (see cheat sheet #4),
      so this triggers "dispensed_via_redistribution" from PHC Bogadi.
      Click WHY? -- shows the exact days-remaining math and why that
      source facility was picked over the others.

3) DOCTOR WORKSPACE — emergency procurement
   Same doctor/patient. Medicine: Amoxicillin, quantity 5000
   -> no facility anywhere has that much -> "critical_shortage" +
      emergency procurement recommendation.

4) DISTRICT DASHBOARD
   Open before step 2 so the Critical Alerts panel is already showing
   PHC Nanjangud Road's Paracetamol alert (it's seeded to be low from a
   week of fast historical consumption -- no need to create it live).
   Watch the Live Event Timeline update in real time as you submit
   prescriptions in another tab -- this is the WebSocket, not a refresh.

5) OPERATIONS CARDS (same dashboard, scroll down)
   - Doctor Attendance: Dr. Kavya Iyer is seeded absent -> visible in the
     attendance %.
   - Bed Management: PHC Nanjangud Road is seeded at 38/40 beds (95%) ->
     crosses the >90% alert threshold live.
   - Test Availability: CBC/ECG/Ultrasound gaps at PHC Nanjangud Road ->
     alternative-facility recommendation to CHC Hebbal.

6) CITIZEN APP
   Search "Ramesh Gowda" -> Dashboard tab shows his upcoming appointment
   and recent prescription at a glance; History tab shows the full
   dispensing trail from the demo above.

7) LANGUAGE SWITCH
   Flip the globe selector in the top bar to Hindi/Kannada/Gujarati and
   back -- navigation, dashboard headers, and the Doctor Workspace/Citizen
   App shells update instantly, no reload.

================================================================
"""


if __name__ == "__main__":
    reset_db_file()
    run_seed()
    print(CHEAT_SHEET)
