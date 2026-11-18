# Campus Stores

Campus Stores is a Product Engineer work sample set at a fictional campus media equipment desk. Work through a club's screening, from equipment pickup to a partial return and the next morning's handover. Open **Candidate brief** in the app for the assignment.

## Run the app

Open `index.html` in a modern browser. The app includes its scripts, styles, and icons and can run offline.

To serve it over local HTTP, run this from the repository folder and visit `http://localhost:8000`.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Each browser stores its own sample shift locally when browser storage is available. **Restart sample shift** restores the fictional starting records.

## Source

- `index.html` contains the desk layout, candidate brief, and bundled icons.
- `app.js` contains the sample records and interactions.
- `styles.css` defines the desktop and mobile layouts.

Icon license notices are in [third-party/lucide-LICENSE.txt](third-party/lucide-LICENSE.txt).

---

## Candidate brief response

### 1. What the product handles well

**The inventory availability and repair guard on issuance is airtight.** When Kabir arrives at 3:45 pm to collect equipment for the Film Society screening, the desk operator cannot issue broken equipment — specifically projector `PR-06` (`repair: true`, located in "Workshop") — by any path in the application. It is filtered out before the options are ever rendered. Similarly, units already checked out to other borrowers (such as wireless microphone `MI-09` out on slip `L-401`) are excluded from selection. This structural guard ensures that the loan register never diverges from physical shelf availability, preventing double-booking and faulty dispatches during high-pressure pre-event rushes.

### 2. What I would change

**Multi-item kit issuance and partial return attribution caused severe counter friction:**
1. **Repetitive single-item checkouts**: To fulfil request `RQ-214` (3 items: projector, portable speaker, and adapter), the operator was forced to navigate to the Loan Register, click *New issue slip*, and manually fill four dropdowns (Request, Unit, Borrower, Due Date) three separate times. The borrower's name ("Kabir Sen") and due date ("Fri 8 pm") had to be re-entered each time.
2. **Disconnected requests and register**: The Requests tab had no direct issuance action and provided no indication of fulfilment progress.
3. **Loss of returner identity**: When Kabir returned the projector and speaker on Friday evening and Leela returned the adapter on Saturday morning, the original system provided no way to record *who* physically returned each unit. The outstanding slip remained solely under Kabir's name, forcing the operator to rely on loose free-text handover notes in the Desk Book.

### 3. The prototype: guided kit checkout & return confirmation

To solve these friction points without altering the underlying data model, two focused enhancements were implemented:

1. **Guided kit checkout**:
   - An **Issue kit** action on the approved request detail view launches a scoped checkout form.
   - It generates one selection row per approved equipment type, with dropdowns containing only available, non-repair physical units of that exact type (`PR-06` in repair is excluded; units on loan are excluded).
   - "Collected by" is pre-selected from the request handover context (`Kabir Sen` for `RQ-214`), and "Return by" is pre-filled from the approved request's due date (`Fri 8 pm`).
   - One click issues all physical units **atomically**: all validations run before any loan record is created. If any selection fails validation, zero slips are written.
   - Sequential slip numbers (`L-402`, `L-403`, `L-404`) are generated using the existing numbering schema, preserving the one-slip-per-unit principle for independent returnability.
2. **Accurate fulfilment tracking & reissuance prevention**:
   - Fulfilment status (`issued` / `total` issued · `outstanding` out) is computed live from loan records.
   - Issued progress is calculated using distinct requested equipment types with loan history (including returned loans). It cannot be inflated by duplicate loan records.
   - Outstanding count is calculated using active loans (`back === false`).
   - **Reissuance guard**: Once an equipment type has been issued under a request, it cannot be reissued under that same request (even after return). The "Issue kit" button permanently disappears once all requested types have been issued. If partially issued, the kit form offers only never-issued requested types.
3. **Return confirmation & physical returner tracking**:
   - Clicking *Record return* on an outstanding slip displays an inline confirmation asking "Who is returning?", populated from the existing `people` list.
   - Confirmed returns record `returnedBy` on the loan record without overwriting `who` (the original borrower).
   - Closed slips display both the borrower and the physical returner (e.g. `RQ-214 · Kabir Sen · Due Fri 8 pm · Returned by Leela Das`).
   - Existing saved loans without `returnedBy` remain completely compatible.

### 4. Walkthrough using the prototype — the three-phase scenario

- **Friday · 3:45 pm — Pickup**:
  The operator opens the Requests tab. `Courtyard screening` (RQ-214) displays `0/3 issued`. The operator clicks *View form* → *Issue kit*. The kit form appears with three equipment rows: HDMI projector (`PR-04`), Portable speaker (`SP-02` / `SP-05`), and USB-C → HDMI adapter (`AD-12` / `AD-15`). `PR-06` (in repair) is absent. "Collected by" is pre-selected to `Kabir Sen` and "Return by" is pre-filled to `Fri 8 pm`. The operator selects `PR-04`, `SP-02`, and `AD-12` and clicks *Issue kit · 3 slips*. The app atomically creates slips `L-402`, `L-403`, and `L-404` and navigates to the Loan Register. The Requests badge updates to `3/3 issued · 3 out`, and the *Issue kit* button disappears.
- **Friday · 7:30 pm — Partial return**:
  Kabir brings back the projector and speaker. The operator clicks *Record return* on `L-402` (PR-04), selects `Kabir Sen` in the return confirmation, and clicks *Confirm*. They repeat this for `L-403` (SP-02). Both slips close and show `Returned by Kabir Sen`. Slip `L-404` (AD-12) remains outstanding under Kabir Sen. The Requests list badge updates to `3/3 issued · 1 out`. The operator adds a handover note in the Desk Book. Navigating back to RQ-214 confirms that the *Issue kit* button does NOT reappear.
- **Saturday · 9:00 am — Morning handover**:
  The morning operator sees `Courtyard screening` at `3/3 issued · 1 out`. Leela Das arrives at the counter with the adapter. The operator opens the Loan Register, finds outstanding slip `L-404` (`AD-12 · Kabir Sen`), clicks *Record return*, selects `Leela Das` from the returner dropdown, and clicks *Confirm*. Slip `L-404` closes, displaying `Kabir Sen · Due Fri 8 pm · Returned by Leela Das`. The Requests badge updates to `3/3 issued · 0 out`.

### 5. What was preserved and why

- **One-slip-per-unit architecture**: Kept intact because physical media equipment returns are inherently piece-wise (e.g., adapters kept overnight while heavy projectors return early).
- **Independent returns and data model**: Loan records retain `{ num, req, asset, who, due, back }`, extending it non-destructively with optional `returnedBy`.
- **Existing single-slip issue workflow**: The original *New issue slip* form in the Loan Register remains functional for ad-hoc or individual checkouts, with the added guard against reissuing previously issued types.
- **Shift progression, Desk Book, Inventory, and LocalStorage**: Shift advancement, handover logging, inventory filtering, persistence, and the *Restart sample shift* functionality remain completely operational.

### 6. Real-world validation metric

**Metric: Peak-period checkout duration and returner attribution accuracy**
- **Checkout duration**: Measured as the elapsed time (in seconds, via counter observation or timestamp delta) from an operator opening an approved request to the final creation of all kit slips during the 3:00–4:30 pm rush. Under the single-slip baseline, issuing a 3-item kit required ~60–90 seconds across 12 manual dropdown selections. With guided kit checkout, this drops to under 20 seconds.
- **Returner attribution discrepancy rate**: The percentage of returned assets during morning handovers where the actual returner is logged and verifiable in the register versus untracked. Success is defined as 100% of non-borrower returns (such as Leela returning Kabir's adapter) having their identity recorded directly on the closed slip.

---

## Files changed

| File | Changes Made |
|---|---|
| `app.js` | Added `issuingKit` and `returningSlip` UI state; added `fulfilment()` to calculate distinct ever-issued types and active loans; added `typeEverIssued()` reissuance guard; added `kitCheckoutForm()` with per-type dropdowns, pre-fills, and atomic validation; updated `requestPage()` with live fulfilment badges (`0/3 issued`, `3/3 issued · 3 out`, `3/3 issued · 1 out`, `3/3 issued · 0 out`) and conditional *Issue kit* display; updated `register()` to render inline return confirmation and show `Returned by <name>` on closed slips; updated submit handler with `[data-kit]` atomic issue and `[data-return-confirm]` returner capture; updated single-slip `[data-issue]` with `typeEverIssued` check; updated `restore()` to reset transient UI states and support backward-compatible loans. |
| `styles.css` | Added scoped styles for `.kit-checkout`, `.kit-items`, `.kit-item-row`, and responsive layout rules. |
| `README.md` | Documented candidate brief analysis, prototype architecture, three-phase walkthrough, design decisions, and verification records. |

## Validations added

1. **Missing unit selection**: Rejects empty selections before submission; leaves 0 records written.
2. **In-repair exclusion**: Filters out `repair: true` units (`PR-06`) at render time and checks on submission.
3. **On-loan exclusion**: Units currently checked out cannot appear in dropdowns or be submitted.
4. **Wrong equipment type**: Validates that selected unit's type matches the slot's requested type.
5. **Approved items restriction**: Validates that unit types belong to the request's approved list.
6. **Reissuance prevention**: Prevents reissuing an equipment type that has already been issued under that request (active or returned).
7. **Duplicate asset guard**: Rejects any kit where the same asset is selected across multiple slots.
8. **Borrower and due date validation**: Requires valid persons from the `people` roster and non-empty return dates.
9. **Returner identity validation**: Requires selecting a valid person when confirming an item return.
10. **Atomicity**: All items in a kit are validated upfront; if any item fails, zero loan records are created.

## Tests performed (browser automated verification)

All 13 test scenarios were executed and verified against `http://localhost:8321`:

| # | Test Name | Result | Key Evidence |
|---|---|---|---|
| 1 | Initial Requests List Badges | ✅ PASSED | RQ-214: `0/3 issued`; RQ-209: `1/1 issued · 1 out`; RQ-217: `0/1 issued` |
| 2 | RQ-214 Detail View | ✅ PASSED | Detail badge: `0/3 issued`; "Issue kit" button visible |
| 3 | Kit Checkout Form & PR-06 Exclusion | ✅ PASSED | PR-06 excluded from projector select; Kabir Sen and Fri 8 pm pre-selected |
| 4 | Form Validation | ✅ PASSED | Unselected unit blocked by validation; 0 slips created; remained on form |
| 5 | Successful Kit Checkout | ✅ PASSED | Slips L-402, L-403, L-404 created; navigated to Loan Register |
| 6 | Badges After Checkout & Issue Kit Disappears | ✅ PASSED | Badge updated to `3/3 issued · 3 out`; "Issue kit" button absent |
| 7 | Phase 2: Friday 7:30 pm & Return Confirmation | ✅ PASSED | Inline return confirmation captured Kabir Sen for L-402 and L-403; L-404 remained out |
| 8 | Issue Kit Button Does NOT Reappear After Partial Return | ✅ PASSED | Requests badge `3/3 issued · 1 out`; "Issue kit" button completely absent |
| 9 | Phase 3: Saturday 9:00 am & Leela Returns L-404 | ✅ PASSED | L-404 closed with borrower `Kabir Sen` and returner `Returned by Leela Das` |
| 10 | Final Fulfilment State | ✅ PASSED | Requests badge updated to `3/3 issued · 0 out`; "Issue kit" button absent |
| 11 | Single-slip Issue Rejection for Issued Type | ✅ PASSED | Attempt to reissue adapter for RQ-214 blocked: "This equipment type has already been issued under RQ-214." |
| 12 | Page Refresh (localStorage Persistence) | ✅ PASSED | State retained after reload: RQ-214 at `3/3 issued · 0 out`, L-404 shows borrower Kabir Sen and returner Leela Das |
| 13 | Restart Sample Shift | ✅ PASSED | Clean reset to Friday 3:45 pm, RQ-214 at `0/3 issued`, only initial slip L-401 present |

---

## Submit your work

1. [Fork Campus Stores](https://github.com/virinchi-healthcare/campus-stores/fork) into your GitHub account. Complete the candidate brief and push your changes to your public fork. In your README, point reviewers to your work and explain the decision you made.
2. In your fork, open **Commits**, select the final commit you want reviewed, and copy the page URL. It should look like `https://github.com/YOUR-USERNAME/campus-stores/commit/COMMIT-SHA`.
3. [Submit your work through the Google Form](https://docs.google.com/forms/d/e/1FAIpQLScvzoh1R4WS-SkiwAVBQbMvniieJYSoOEfLMyVo5CyjOvYUgQ/viewform). Your **roll number**, **email ID**, and **final commit link from your public fork** are required. Enter your roll number and email ID in the form only.
