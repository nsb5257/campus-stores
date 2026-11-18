(() => {
  const storageKey = "campus-stores.shift.v1";
  const root = document.getElementById("campus-stores");
  const q = (selector) => root.querySelector(selector);
  const requests = [
    {
      id: "RQ-214",
      club: "Film Society",
      event: "Courtyard screening",
      owner: "Isha Rao",
      due: "Fri 8 pm",
      items: ["HDMI projector", "Portable speaker", "USB-C → HDMI adapter"],
      note: "Playback is from a USB-C-only laptop. The host will collect at 4 pm.",
    },
    {
      id: "RQ-209",
      club: "Debate Union",
      event: "Finals rehearsal",
      owner: "Tara Shah",
      due: "Sat 10 am",
      items: ["Wireless microphone"],
      note: "Rehearsal runs into the evening.",
    },
    {
      id: "RQ-217",
      club: "Photo Circle",
      event: "Street portrait walk",
      owner: "Dev Menon",
      due: "Sat noon",
      items: ["Digital camera"],
      note: "Collection on Saturday morning.",
    },
  ];
  const assets = [
    { id: "PR-04", type: "HDMI projector", model: "BenQ MH550", bin: "A2" },
    {
      id: "PR-06",
      type: "HDMI projector",
      model: "Epson EB-X49",
      bin: "Workshop",
      repair: true,
    },
    { id: "SP-02", type: "Portable speaker", model: "JBL Eon One", bin: "B1" },
    { id: "SP-05", type: "Portable speaker", model: "Bose S1", bin: "B2" },
    {
      id: "AD-12",
      type: "USB-C → HDMI adapter",
      model: "Belkin AVC002",
      bin: "C4",
    },
    {
      id: "AD-15",
      type: "USB-C → HDMI adapter",
      model: "Anker A8312",
      bin: "C4",
    },
    { id: "MI-09", type: "Wireless microphone", model: "Shure BLX", bin: "B3" },
    { id: "CA-03", type: "Digital camera", model: "Sony A6400", bin: "D2" },
  ];
  const people = [
    "Isha Rao",
    "Kabir Sen",
    "Leela Das",
    "Tara Shah",
    "Dev Menon",
  ];
  // Desk-book messages imply a default collector per request.
  // Used only to pre-select a sensible default; operator can always change it.
  const requestCollectors = {
    "RQ-214": "Kabir Sen",
  };
  const shifts = [
    {
      time: "Friday \u00b7 3:45 pm",
      title: "Pickup at the counter",
      text: "Kabir is here for the Film Society screening. The film starts at four. Can he leave with everything he needs?",
      next: "Move to return time",
    },
    {
      time: "Friday \u00b7 7:30 pm",
      title: "The kit comes back in pieces",
      text: "Kabir has brought back the projector and speaker. \u201cLeela still has the adapter. She\u2019ll drop it off tomorrow at nine.\u201d Take the return and hand over to the morning shift.",
      next: "Move to next morning",
    },
    {
      time: "Saturday \u00b7 9:00 am",
      title: "Morning shift",
      text: "You\u2019ve just taken over. Leela walks in with an adapter. Work out what was outstanding from the screening and close the loan for the right item.",
    },
  ];
  const pages = [
    ["Requests", "clipboard-list"],
    ["Inventory", "package"],
    ["Loan register", "book-open"],
    ["Desk book", "messages-square"],
  ];
  const original = () => ({
    version: 1,
    tab: "Requests",
    phase: 0,
    selected: "",
    filter: "All items",
    loans: [
      {
        num: 401,
        req: "RQ-209",
        asset: "MI-09",
        who: "Tara Shah",
        due: "Sat 10 am",
        back: false,
      },
    ],
    notes: [],
    editing: false,
    issuingKit: false,
    returningSlip: null,
    onlyOpen: true,
    notice: "Sample shift \u00b7 All records are fictional.",
  });
  let s = original();
  const getAsset = (id) => assets.find((x) => x.id === id);
  const getReq = (id) => requests.find((x) => x.id === id);
  const out = (id) => s.loans.find((l) => l.asset === id && !l.back);
  const esc = (x) =>
    String(x).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const opts = (list) =>
    list
      .map(([v, t]) => '<option value="' + esc(v) + '">' + esc(t) + "</option>")
      .join("");
  const btn = (label, act, val = "", style = "") =>
    '<button type="button" data-action="' +
    act +
    '" data-val="' +
    esc(val) +
    '" class="' +
    style +
    '">' +
    esc(label) +
    "</button>";
  const head = (title, sub, control = "") =>
    '<div class="sectionhead"><div><h2>' +
    title +
    "</h2><small>" +
    sub +
    "</small></div>" +
    control +
    "</div>";
  const row = (label, sub, right) =>
    '<div class="row"><div><strong>' +
    esc(label) +
    "</strong><small>" +
    esc(sub) +
    "</small></div><div>" +
    right +
    "</div></div>";
  const badge = (t, good = false) =>
    '<span class="tag' + (good ? " good" : "") + '">' + esc(t) + "</span>";

  // ── Fulfilment helpers ────────────────────────────────────────────────────
  // Returns { issued, outstanding } for a given request id, derived from live loan data.
  // "issued"      = number of distinct approved equipment types that have ever had a loan
  //                 (including returned ones). Cannot be inflated by duplicate records.
  // "outstanding" = number of active loans (back === false) under this request.
  function fulfilment(reqId) {
    const r = getReq(reqId);
    if (!r) return { issued: 0, outstanding: 0 };
    const loansForReq = s.loans.filter((l) => l.req === reqId);
    // Build the set of types that have ever been loaned under this request.
    const everIssuedTypes = new Set(
      loansForReq
        .map((l) => { const a = getAsset(l.asset); return a ? a.type : null; })
        .filter(Boolean),
    );
    // Count only types that appear in the approved items list (deduplicated).
    const issued = r.items.filter((type) => everIssuedTypes.has(type)).length;
    const outstanding = loansForReq.filter((l) => !l.back).length;
    return { issued, outstanding };
  }

  // Returns true if equipment type has EVER been loaned under reqId (including returned loans).
  // Used to decide whether to show Issue kit and to scope the kit form rows.
  function typeEverIssued(reqId, type) {
    return s.loans.some(
      (l) => l.req === reqId && getAsset(l.asset) && getAsset(l.asset).type === type,
    );
  }

  // ── Kit checkout form builder ─────────────────────────────────────────────
  function kitCheckoutForm(r) {
    const dueDates = ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"];
    const preselectedCollector = requestCollectors[r.id] || "";
    const preselectedDue = dueDates.includes(r.due) ? r.due : "";

    // Only show rows for equipment types that have NEVER been loaned under this request.
    // A type that was issued and returned must not reappear here.
    const neverIssuedItems = r.items.filter((type) => !typeEverIssued(r.id, type));

    let itemRows = "";
    for (let i = 0; i < neverIssuedItems.length; i++) {
      const itemType = neverIssuedItems[i];
      const availableUnits = assets.filter(
        (a) => a.type === itemType && !a.repair && !out(a.id),
      );

      const unitOptions = availableUnits
        .map(
          (a) =>
            '<option value="' +
            esc(a.id) +
            '">' +
            esc(a.id + " \u00b7 " + a.model + " \u00b7 Bin " + a.bin) +
            "</option>",
        )
        .join("");

      const unavailableNote =
        availableUnits.length === 0
          ? ' <span class="tag">No units available</span>'
          : "";

      itemRows +=
        '<div class="kit-item-row">' +
        '<label><span>' +
        esc(itemType) +
        "</span>" +
        '<select name="asset_' +
        i +
        '" required>' +
        "<option value=\"\">Select unit\u2026</option>" +
        unitOptions +
        "</select>" +
        unavailableNote +
        "</label>" +
        "</div>";
    }

    // Collector select — pre-select known collector if present in the people list.
    const collectorOpts = people
      .map((p) => {
        const sel = p === preselectedCollector ? " selected" : "";
        return '<option value="' + esc(p) + '"' + sel + ">" + esc(p) + "</option>";
      })
      .join("");

    // Due date select — pre-select from request's due date.
    const dueOpts = dueDates
      .map((d) => {
        const sel = d === preselectedDue ? " selected" : "";
        return '<option value="' + esc(d) + '"' + sel + ">" + esc(d) + "</option>";
      })
      .join("");

    const slipCount = neverIssuedItems.length;
    return (
      '<form data-kit>' +
      '<div class="kit-items">' +
      '<p style="margin:10px 0 6px;font-size:13px;font-weight:600">Select physical units</p>' +
      itemRows +
      "</div>" +
      '<div class="form" style="margin-top:14px">' +
      '<label><span>Collected by</span>' +
      '<select name="who" required>' +
      "<option value=\"\">Select\u2026</option>" +
      collectorOpts +
      "</select></label>" +
      '<label><span>Return by</span>' +
      '<select name="due" required>' +
      "<option value=\"\">Select\u2026</option>" +
      dueOpts +
      "</select></label>" +
      "</div>" +
      '<button type="submit" class="primary">Issue kit \u00b7 ' +
      esc(slipCount + " " + (slipCount === 1 ? "slip" : "slips")) +
      "</button>" +
      "</form>"
    );
  }

  // ── Requests page ─────────────────────────────────────────────────────────
  function requestPage() {
    let html = head(
      "Approved requests",
      "Student Activities Office \u00b7 3 approved forms",
    );
    if (s.selected) {
      const r = getReq(s.selected);
      const { issued, outstanding } = fulfilment(r.id);
      const totalItems = r.items.length;

      // Fulfilment status badge for detail view.
      let fulfilBadge;
      if (issued === 0) {
        fulfilBadge = badge("0/" + totalItems + " issued");
      } else if (outstanding === 0) {
        fulfilBadge = badge(issued + "/" + totalItems + " issued \u00b7 0 out", true);
      } else {
        fulfilBadge = badge(issued + "/" + totalItems + " issued \u00b7 " + outstanding + " out");
      }

      // "Issue kit" appears only when at least one approved type has NEVER been loaned
      // under this request (returned loans count — a type cannot be reissued via kit).
      const hasUnissuedTypes = r.items.some((type) => !typeEverIssued(r.id, type));

      html +=
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">' +
        btn("Back to list", "close") +
        (hasUnissuedTypes && !s.issuingKit
          ? btn("Issue kit", "issue-kit", r.id, "primary")
          : "") +
        (s.issuingKit ? btn("Cancel checkout", "cancel-kit") : "") +
        "</div>" +
        '<div class="record">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px">' +
        "<small>" +
        esc(r.id) +
        " \u00b7 Approved</small>" +
        fulfilBadge +
        "</div>" +
        "<h3>" +
        esc(r.event) +
        "</h3><p>" +
        esc(r.club) +
        " \u00b7 Filed by " +
        esc(r.owner) +
        "</p><p><b>Return by</b> " +
        esc(r.due) +
        "</p><p><b>Approved equipment</b></p><ul>" +
        r.items.map((x) => "<li>" + esc(x) + "</li>").join("") +
        "</ul><p>" +
        esc(r.note) +
        "</p></div>";

      if (s.issuingKit) {
        html +=
          '<div class="kit-checkout">' +
          '<p style="margin:14px 0 6px;font-weight:600">Kit checkout \u00b7 ' +
          esc(r.id) +
          " \u00b7 " +
          esc(r.club) +
          "</p>" +
          kitCheckoutForm(r) +
          "</div>";
      }
    } else {
      html += requests
        .map((r) => {
          const { issued, outstanding } = fulfilment(r.id);
          const total = r.items.length;
          let statusBadge;
          if (issued === 0) {
            statusBadge = badge("0/" + total + " issued");
          } else if (outstanding === 0) {
            statusBadge = badge(issued + "/" + total + " issued \u00b7 0 out", true);
          } else {
            statusBadge = badge(issued + "/" + total + " issued \u00b7 " + outstanding + " out");
          }
          return row(
            r.event,
            r.id + " \u00b7 " + r.club,
            statusBadge + " " + btn("View form", "request", r.id),
          );
        })
        .join("");
    }
    return html;
  }
  function inventory() {
    let html = head(
      "Inventory",
      "Physical units \u00b7 home shelf and current availability",
    );
    html +=
      '<div class="buttons"><label>Show <select data-filter>' +
      opts(
        ["All items", "On shelf", "On loan", "In repair"].map((f) => [f, f]),
      ) +
      "</select></label></div>";
    for (const a of assets) {
      const status = a.repair
        ? "In repair"
        : out(a.id)
          ? "On loan"
          : "On shelf";
      if (s.filter !== "All items" && s.filter !== status) continue;
      html += row(
        a.id + " \u00b7 " + a.type,
        a.model + " \u00b7 " + a.bin,
        badge(status, status === "On shelf"),
      );
    }
    return html;
  }
  function register() {
    let html = head(
      "Loan register",
      "One slip per physical unit",
      s.editing
        ? btn("Cancel", "cancel")
        : btn("New issue slip", "new", "", "primary"),
    );
    if (s.editing) {
      const available = assets.filter((a) => !a.repair && !out(a.id));
      const select = (label, key, options) =>
        "<label><span>" +
        label +
        '</span><select name="' +
        key +
        '" required><option value="">Select\u2026</option>' +
        opts(options) +
        "</select></label>";
      return (
        html +
        '<form data-issue><div class="form">' +
        select(
          "Approved request",
          "req",
          requests.map((r) => [r.id, r.id + " \u00b7 " + r.club]),
        ) +
        select(
          "Unit leaving the desk",
          "asset",
          available.map((a) => [a.id, a.id + " \u00b7 " + a.type]),
        ) +
        select(
          "Collected by",
          "who",
          people.map((p) => [p, p]),
        ) +
        select(
          "Return by",
          "due",
          ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => [d, d]),
        ) +
        '</div><button type="submit" class="primary">Save issue slip</button></form>'
      );
    }
    html +=
      '<div class="buttons">' +
      ["Outstanding", "All slips"]
        .map(
          (v, i) =>
            '<button type="button" data-action="scope" data-val="' +
            i +
            '" aria-pressed="' +
            (s.onlyOpen === (i === 0)) +
            '">' +
            v +
            "</button>",
        )
        .join("") +
      "</div>";
    const shown = s.loans
      .filter((l) => !s.onlyOpen || !l.back)
      .slice()
      .reverse();
    if (!shown.length) html += "<p>No outstanding slips.</p>";
    for (const l of shown) {
      const subLine =
        l.req + " \u00b7 " + l.who + " \u00b7 Due " + l.due +
        (l.returnedBy ? " \u00b7 Returned by " + l.returnedBy : "");
      let right;
      if (l.back) {
        right = badge("Returned");
      } else if (s.returningSlip === l.num) {
        // Inline return confirmation — ask who is physically handing it back.
        const returnerOpts = people
          .map((p) => '<option value="' + esc(p) + '">' + esc(p) + "</option>")
          .join("");
        right =
          '<form data-return-confirm style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">' +
          '<input type="hidden" name="num" value="' + l.num + '">' +
          '<select name="returner" required style="font-size:12px;padding:4px 6px">' +
          '<option value="">Who is returning?</option>' +
          returnerOpts +
          "</select>" +
          '<button type="submit" style="font-size:12px;padding:4px 8px">Confirm</button>' +
          btn("\u00d7", "cancel-return", "", "") +
          "</form>";
      } else {
        right = btn("Record return", "return", String(l.num));
      }
      html += row("L-" + l.num + " \u00b7 " + l.asset, subLine, right);
    }
    return html;
  }
  function deskbook() {
    let html = head(
      "Desk book",
      "Messages from clubs and notes for the next shift",
    );
    const entries = [
      [
        "Friday \u00b7 3:20 pm",
        "Isha Rao \u00b7 Film Society",
        "Kabir Sen is picking up our whole screening kit. Please issue it in his name. I'm setting up in the courtyard.",
      ],
      [
        "Friday \u00b7 3:30 pm",
        "Tara Shah \u00b7 Debate Union",
        "Our microphone stays with me overnight. I'll return it by 10 am Saturday.",
      ],
    ];
    if (s.phase >= 1)
      entries.push([
        "Friday \u00b7 7:30 pm",
        "Kabir Sen \u00b7 Film Society",
        "I brought the projector and speaker. Leela Das has our adapter. She'll be at the counter at 9 am tomorrow.",
      ]);
    for (const n of s.notes)
      entries.push([shifts[n.phase].time, "Counter handover", n.text]);
    for (const [t, author, body] of entries.slice().reverse())
      html +=
        '<article class="record"><small>' +
        esc(t) +
        "</small><h3>" +
        esc(author) +
        "</h3><p>" +
        esc(body) +
        "</p></article>";
    return (
      html +
      '<form data-note><div class="form"><label class="full"><span>Note for the next shift</span><textarea name="note" rows="2" maxlength="400" required></textarea></label></div><button type="submit">Add handover note</button></form>'
    );
  }
  const screens = {
    Requests: requestPage,
    Inventory: inventory,
    "Loan register": register,
    "Desk book": deskbook,
  };
  function paint() {
    const phase = shifts[s.phase];
    q("[data-clock]").textContent = phase.time;
    q("[data-shift-title]").textContent = phase.title;
    q("[data-shift]").textContent = phase.text;
    const advance = q('[data-action="advance"]');
    advance.hidden = !phase.next;
    advance.textContent = phase.next || "";
    q("[data-nav]").innerHTML = pages
      .map(
        ([n, icon]) =>
          '<button type="button" data-action="tab" data-val="' +
          n +
          '" aria-pressed="' +
          (s.tab === n) +
          '"><svg aria-hidden="true" class="store-icon"><use href="#icon-' +
          icon +
          '"></use></svg>' +
          n +
          "</button>",
      )
      .join("");
    q("[data-page]").innerHTML = screens[s.tab]();
    if (q("[data-filter]")) q("[data-filter]").value = s.filter;
    q("[data-status]").textContent = s.notice;
  }
  function commit(msg) {
    if (msg) s.notice = msg;
    paint();
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {
      q("[data-status]").textContent +=
        " Browser storage is unavailable. Progress lasts for this visit.";
    }
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const v = b.dataset.val;
    switch (b.dataset.action) {
      case "restart":
        s = original();
        break;
      case "advance":
        if (s.phase < 2) s.phase++;
        s.notice = "Shift time updated.";
        break;
      case "tab":
        s.tab = v;
        s.editing = false;
        s.issuingKit = false;
        s.returningSlip = null;
        break;
      case "close":
        s.selected = "";
        s.issuingKit = false;
        break;
      case "request":
        s.selected = v;
        s.issuingKit = false;
        break;
      case "new":
        s.editing = true;
        break;
      case "cancel":
        s.editing = false;
        break;
      case "issue-kit":
        s.issuingKit = true;
        break;
      case "cancel-kit":
        s.issuingKit = false;
        break;
      case "scope":
        s.onlyOpen = v === "0";
        break;
      case "return": {
        const l = s.loans.find((l) => l.num === Number(v));
        if (!l || l.back) return;
        s.returningSlip = l.num;
        break;
      }
      case "cancel-return":
        s.returningSlip = null;
        break;
    }
    commit();
  });
  root.addEventListener("change", (e) => {
    if (e.target.matches("[data-filter]")) {
      s.filter = e.target.value;
      commit();
    }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const form = new FormData(f);

    // ── Desk book note ─────────────────────────────────────────────────────
    if (f.matches("[data-note]")) {
      const text = String(form.get("note")).trim();
      if (!text) return;
      s.notes.push({ phase: s.phase, text });
      commit("Handover note saved.");
      return;
    }

    // ── Return confirmation (who physically handed back the item) ───────────
    if (f.matches("[data-return-confirm]")) {
      const num = Number(form.get("num"));
      const returner = String(form.get("returner") || "").trim();
      const l = s.loans.find((l) => l.num === num);
      if (!l || l.back) return;
      if (!people.includes(returner)) {
        q("[data-status]").textContent = "Please select who is returning the item.";
        return;
      }
      l.back = true;
      l.returnedBy = returner;
      s.returningSlip = null;
      commit(l.asset + " returned by " + returner + ". Slip L-" + num + " closed.");
      return;
    }

    // ── Single-slip issue form (Loan Register) ─────────────────────────────
    if (f.matches("[data-issue]")) {
      const [req, asset, who, due] = ["req", "asset", "who", "due"].map((k) =>
        form.get(k),
      );
      const unit = getAsset(asset),
        r = getReq(req);
      if (!r || !unit || unit.repair || out(asset) || !people.includes(who))
        return;
      if (!r.items.includes(unit.type)) {
        q("[data-status]").textContent =
          "This equipment type is outside the approved request. Choose an approved unit.";
        return;
      }
      if (typeEverIssued(req, unit.type)) {
        q("[data-status]").textContent =
          "This equipment type has already been issued under " + req + ".";
        return;
      }
      const num = Math.max(...s.loans.map((l) => l.num)) + 1;
      s.loans.push({ num, req, asset, who, due, back: false });
      s.editing = false;
      commit("Issued " + asset + " to " + who + " on slip L-" + num + ".");
      return;
    }

    // ── Kit checkout form ──────────────────────────────────────────────────
    if (!f.matches("[data-kit]")) return;

    const r = getReq(s.selected);
    if (!r) return;

    const who = String(form.get("who") || "").trim();
    const due = String(form.get("due") || "").trim();

    // Validate borrower and due date.
    if (!people.includes(who)) {
      q("[data-status]").textContent =
        "Please select a valid collector before issuing the kit.";
      return;
    }
    if (!due) {
      q("[data-status]").textContent =
        "Please select a return date before issuing the kit.";
      return;
    }

    // Collect and validate every asset selection before creating any loan (atomic).
    // Iterate over never-issued types — the same set that the form rows were built from.
    const neverIssuedItems = r.items.filter((type) => !typeEverIssued(r.id, type));
    const selectedAssets = [];
    const selectedAssetIds = new Set();

    for (let i = 0; i < neverIssuedItems.length; i++) {
      const assetId = String(form.get("asset_" + i) || "").trim();
      const itemType = neverIssuedItems[i];

      // Missing selection.
      if (!assetId) {
        q("[data-status]").textContent =
          'Please select a unit for \u201c' + itemType + '\u201d before issuing the kit.';
        return;
      }

      const unit = getAsset(assetId);

      // Asset must exist in the inventory catalogue.
      if (!unit) {
        q("[data-status]").textContent =
          "Unknown asset ID \u201c" + assetId + "\u201d. Please refresh and try again.";
        return;
      }

      // Must not be in repair.
      if (unit.repair) {
        q("[data-status]").textContent =
          unit.id + " (" + unit.model + ") is in repair and cannot be issued.";
        return;
      }

      // Must not already be on loan to someone else.
      if (out(unit.id)) {
        q("[data-status]").textContent =
          unit.id + " is currently on loan and cannot be issued again.";
        return;
      }

      // Must match the expected equipment type for this slot.
      if (unit.type !== itemType) {
        q("[data-status]").textContent =
          unit.id + " is a " + unit.type + " but slot " + (i + 1) + " requires a " + itemType + ".";
        return;
      }

      // Type must be on the approved list (belt-and-suspenders).
      if (!r.items.includes(unit.type)) {
        q("[data-status]").textContent =
          unit.type + " is not on the approved list for " + r.id + ".";
        return;
      }

      // Guard: ANY loan for this type (active or returned) already exists under this request.
      // A type that was issued and returned cannot be reissued via kit checkout.
      if (typeEverIssued(r.id, unit.type)) {
        q("[data-status]").textContent =
          "A loan for a " +
          unit.type +
          " has already been created under " +
          r.id +
          ". Previously issued types cannot be reissued.";
        return;
      }

      // Duplicate asset within the same kit submission.
      if (selectedAssetIds.has(unit.id)) {
        q("[data-status]").textContent =
          unit.id + " has been selected more than once. Each unit can only appear once in the kit.";
        return;
      }

      selectedAssetIds.add(unit.id);
      selectedAssets.push({ asset: unit.id });
    }

    // All validations passed — create all slips atomically.
    let nextNum = Math.max(...s.loans.map((l) => l.num)) + 1;
    const createdSlips = [];

    for (const { asset } of selectedAssets) {
      s.loans.push({ num: nextNum, req: r.id, asset, who, due, back: false });
      createdSlips.push("L-" + nextNum);
      nextNum++;
    }

    // Success: close kit checkout, navigate to Loan Register to show new slips.
    s.issuingKit = false;
    s.selected = "";
    s.tab = "Loan register";
    s.onlyOpen = true;
    commit(
      "Kit issued for " +
        r.id +
        " to " +
        who +
        " \u00b7 Slips " +
        createdSlips.join(", ") +
        " created.",
    );
  });
  function restore(d) {
    if (
      !d ||
      d.version !== 1 ||
      !Object.hasOwn(screens, d.tab) ||
      !shifts[d.phase] ||
      (d.selected && !getReq(d.selected)) ||
      !Array.isArray(d.notes) ||
      !d.notes.every(
        (n) => n && shifts[n.phase] && typeof n.text === "string",
      ) ||
      !Array.isArray(d.loans) ||
      !d.loans.length ||
      !d.loans.every(
        (l) =>
          l && getReq(l.req) && getAsset(l.asset) && Number.isInteger(l.num),
      )
    )
      return;
    s = {
      ...original(),
      ...d,
      loans: d.loans.map((l) => ({ ...l })),
      notes: d.notes.map((n) => ({ ...n })),
      // issuingKit and returningSlip are transient UI state — always reset on page restore.
      issuingKit: false,
      returningSlip: null,
    };
    paint();
  }
  paint();
  try {
    restore(JSON.parse(localStorage.getItem(storageKey)));
  } catch {
    // Keep the fresh shift when storage is unavailable or the saved data is invalid.
  }
})();
