# UHOS — Demo Script (target: 4–5 minutes)

Reset the demo state first, every time, right before you present:

```bash
cd backend && python -m seed.demo_seed
```

This wipes the DB, reseeds the same believable Mysuru-district dataset,
and prints a cheat sheet with the exact numbers used below.

Then start both servers:

```bash
# terminal 1
cd backend && uvicorn app.main:app --reload

# terminal 2
cd frontend && npm run dev
```

Open the District Dashboard (`http://localhost:3000`) in one tab and the
Doctor Workspace (`/doctor`) in a second tab, side by side if your screen
allows it — the live WebSocket update from tab 2 into tab 1 is one of the
strongest visual beats in the demo.

---

## 0:00 – 0:30 — Open on the District Dashboard

**Say:** "This is UHOS — a unified operating system for PHCs and CHCs in
a district. Right now you're looking at three real facilities around
Mysuru. Notice the Critical Alerts panel already has one open alert —
that's Pulse AI, our forecasting engine, flagging that Paracetamol at
PHC Nanjangud Road is about to run out, based on a week of real
dispensing history we seeded, not a hardcoded demo value."

**Do:** Point at the Critical Alerts card. Click **WHY?** on it.

**Say:** "Every AI decision in this system explains itself. This isn't a
black box — current stock, daily consumption, days remaining, and the
exact safety threshold that triggered the alert."

---

## 0:30 – 1:30 — Doctor Workspace: the three outcomes

**Do:** Switch to the Doctor Workspace tab. Select Dr. Anitha Rao,
patient Ramesh Gowda.

**Say:** "A doctor writes a prescription. The system decides in real
time whether to dispense locally, redistribute from another facility,
or flag an emergency shortage — the doctor never has to check inventory
manually."

1. **Paracetamol, quantity 30** → Submit.
   **Say:** "Small quantity, stock is fine — dispensed locally."

2. Reset, same doctor/patient. **Paracetamol, quantity 300** → Submit.
   **Say:** "Now watch — this facility doesn't have 300 units. Instead
   of failing, the system found PHC Bogadi has surplus and recommends a
   transfer." Click **WHY?** on the outcome card.
   **Say:** "Same explainability principle — why this facility, how much,
   and the distance."

3. Reset again. **Amoxicillin, quantity 5000** → Submit.
   **Say:** "And this is the failure mode nobody wants to be surprised
   by in production — no facility in the district has this much. The
   system says so honestly and recommends emergency procurement, instead
   of silently over-promising."

---

## 1:30 – 2:15 — Back to the Dashboard: it's live

**Do:** Switch back to the Dashboard tab (don't refresh).

**Say:** "Notice the Live Event Timeline already picked up everything we
just did in the other tab — this is a WebSocket, not a page reload."

Scroll to the Operations section.

**Say:** "Beyond medicine, we also track the things that actually
determine whether a patient gets seen: is the doctor present, are there
beds, is the right diagnostic test even available today."

- Point at **Doctor Attendance** — one doctor is seeded absent.
- Point at **Bed Management** — PHC Nanjangud Road is at 95% occupancy,
  crossing the alert threshold live.
- Point at **Test Availability** — CBC/ECG/Ultrasound gaps at that same
  facility, with an alternative facility recommended automatically.

---

## 2:15 – 3:00 — Citizen App

**Do:** Open `/citizen`, search "Ramesh Gowda".

**Say:** "And this is the same data, but from the patient's side. He can
see his upcoming appointment, and his full history — including the
prescriptions we just created — without calling the clinic."

---

## 3:00 – 3:45 — Multilingual, live

**Do:** Click the globe icon in the top bar, switch to Kannada, then
Hindi, then back to English.

**Say:** "This is a district in Karnataka — most patients and a lot of
front-line staff are more comfortable in Kannada or Hindi than English.
The entire navigation and every core workflow — dashboard, doctor
workspace, citizen app — switches instantly. No reload, no separate
build per language."

---

## 3:45 – 4:30 — Close on engineering credibility

**Say (to camera / judges, not the screen):** "Everything you just saw
is backed by a full regression suite — 40 backend tests covering every
module including the WebSocket and redistribution logic, and 21 frontend
tests including a full submit flow through the Doctor Workspace. That
suite runs in under 15 seconds and it's how we know a change to one
module didn't quietly break another one three days before a demo."

**Optional closer, if time remains:** open `/docs` (FastAPI Swagger) for
five seconds to show the API is fully documented and typed, not just
working by accident.

---

## If something goes wrong live

- **Blank dashboard / no alerts:** you forgot to reseed. Run
  `python -m seed.demo_seed` again — it's idempotent and takes under a
  second.
- **WebSocket indicator looks dead:** check the backend terminal is
  still running `uvicorn`; the frontend's `live` indicator is tied
  directly to that socket, so this is diagnostic, not cosmetic.
- **CORS error in the browser console:** confirm `NEXT_PUBLIC_API_BASE_URL`
  in `frontend/.env.local` points at wherever the backend is actually
  running.
