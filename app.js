(function () {
  "use strict";

  const {
    addDaysISO,
    calculateRentShare,
    daysInMonth,
    formatISODate,
    formatMoney,
    nextMonthStartISO,
    parseISODate,
  } = window.RentShareCalculator;

  const STORAGE_KEY = "house-share-calculator:nights:v2";
  const root = document.querySelector("#app");
  const copyStatus = { message: "", timeout: null };
  let tabSyncLockedUntil = 0;

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function currentYearMonth() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  }

  function monthValue(state) {
    return `${state.year}-${String(state.month).padStart(2, "0")}`;
  }

  function monthBounds(state) {
    const lastDay = daysInMonth(state.year, state.month);
    return {
      start: formatISODate(state.year, state.month, 1),
      lastNight: formatISODate(state.year, state.month, lastDay),
      checkout: nextMonthStartISO(state.year, state.month),
    };
  }

  function defaultState() {
    const base = currentYearMonth();
    const bounds = monthBounds(base);

    return {
      rent: 2000,
      currency: "USD",
      year: base.year,
      month: base.month,
      emptyNightPolicy: "unassigned",
      people: [
        {
          id: createId("person"),
          name: "Person 1",
          stays: [{ id: createId("stay"), start: bounds.start, end: bounds.checkout }],
        },
        { id: createId("person"), name: "Person 2", stays: [] },
        { id: createId("person"), name: "Person 3", stays: [] },
      ],
    };
  }

  function normalizeStay(stay) {
    const start = stay && typeof stay.start === "string" ? stay.start : "";
    let end = stay && typeof stay.end === "string" ? stay.end : "";

    if (start && end && parseISODate(end) !== null && parseISODate(start) !== null) {
      if (parseISODate(end) <= parseISODate(start)) end = addDaysISO(start, 1);
    }

    return {
      id: (stay && stay.id) || createId("stay"),
      start,
      end,
    };
  }

  function sanitizeState(value) {
    const fallback = defaultState();
    const state = value && typeof value === "object" ? value : fallback;
    const year = Number(state.year) || fallback.year;
    const month = Number(state.month) || fallback.month;
    const people = Array.isArray(state.people) ? state.people : fallback.people;
    const emptyNightPolicy =
      state.emptyNightPolicy === "split_all" || state.emptyDayPolicy === "split_all"
        ? "split_all"
        : "unassigned";

    return {
      rent: Number.isFinite(Number(state.rent)) ? Number(state.rent) : fallback.rent,
      currency: typeof state.currency === "string" ? state.currency : "USD",
      year: Math.min(Math.max(year, 1900), 2200),
      month: Math.min(Math.max(month, 1), 12),
      emptyNightPolicy,
      people: people.map((person, personIndex) => ({
        id: person.id || createId("person"),
        name:
          typeof person.name === "string" && person.name.trim()
            ? person.name
            : `Person ${personIndex + 1}`,
        stays: Array.isArray(person.stays) ? person.stays.map(normalizeStay) : [],
      })),
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return sanitizeState(JSON.parse(raw));
    } catch (error) {
      return defaultState();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Some mobile file previews block localStorage; the calculator still works in-memory.
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function findPerson(personId) {
    return state.people.find((person) => person.id === personId);
  }

  function findStay(person, stayId) {
    return person && person.stays.find((stay) => stay.id === stayId);
  }

  function setCopyStatus(message) {
    copyStatus.message = message;
    if (copyStatus.timeout) window.clearTimeout(copyStatus.timeout);
    const statusElement = document.querySelector(".copy-status");
    if (statusElement) statusElement.textContent = message;
    copyStatus.timeout = window.setTimeout(() => {
      copyStatus.message = "";
      const latestStatusElement = document.querySelector(".copy-status");
      if (latestStatusElement) latestStatusElement.textContent = "";
    }, 1800);
  }

  function monthLabel() {
    const date = new Date(Date.UTC(state.year, state.month - 1, 1));
    return new Intl.DateTimeFormat("de-DE", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function dateLabel(value) {
    const dayNumber = parseISODate(value);
    if (dayNumber === null) return value || "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(dayNumber * 24 * 60 * 60 * 1000));
  }

  function money(cents) {
    return formatMoney(cents, state.currency, "de-DE");
  }

  function nightWord(count) {
    return count === 1 ? "Nacht" : "Nächte";
  }

  function vacancyLabel(calculation) {
    return calculation.emptyNightPolicy === "split_all"
      ? "Leerstand verteilt"
      : "Leerstand separat";
  }

  function buildShareText(calculation) {
    const lines = [
      `Hausmiete ${monthLabel()}: ${money(calculation.rentCents)}`,
      `Basis: ${calculation.monthNights} ${nightWord(calculation.monthNights)} · Anreise zählt, Abreise nicht`,
      "",
      "Anteile:",
      ...calculation.totals.map((person) => {
        const parts = [
          `${person.name}: ${money(person.totalCents)}`,
          `${person.nightsPresent} ${nightWord(person.nightsPresent)}`,
        ];
        if (person.emptyShareCents > 0) {
          parts.push(`${money(person.emptyShareCents)} Leerstand`);
        }
        return parts.join(" | ");
      }),
    ];

    if (calculation.unassignedCents > 0) {
      lines.push(`${vacancyLabel(calculation)}: ${money(calculation.unassignedCents)}`);
    }

    lines.push("", `Summe verteilt: ${money(calculation.allocatedCents)}`);
    return lines.join("\n");
  }

  function totalsById(calculation) {
    return new Map(calculation.totals.map((person) => [person.id, person]));
  }

  function updateBottomTabs(activeId) {
    document.querySelectorAll(".bottom-tabs a").forEach((link) => {
      const isActive = link.getAttribute("href") === `#${activeId}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function syncBottomTabs() {
    if (Date.now() < tabSyncLockedUntil) return;

    const sections = ["result", "entry", "plan"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    const probe = window.scrollY + Math.round(window.innerHeight * 0.38);
    const current =
      sections
        .slice()
        .reverse()
        .find((section) => section.offsetTop <= probe) || sections[0];
    updateBottomTabs(current.id);
  }

  function renderHero(calculation) {
    return `
      <header class="app-hero">
        <div class="brand-block">
          <p class="eyebrow">HouseSplit</p>
          <h1>Miete nach Nächten teilen</h1>
        </div>
        <div class="hero-facts" aria-label="Monatsübersicht">
          <div>
            <span>${escapeHtml(monthLabel())}</span>
            <strong>${money(calculation.rentCents)}</strong>
          </div>
          <div>
            <span>Zeitraum</span>
            <strong>${calculation.monthNights} ${nightWord(calculation.monthNights)}</strong>
          </div>
          <div>
            <span>Modus</span>
            <strong>Nächte</strong>
          </div>
        </div>
      </header>
    `;
  }

  function renderControls() {
    return `
      <section class="setup-panel" aria-labelledby="settings-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Setup</p>
            <h2 id="settings-title">Monatsdaten</h2>
          </div>
          <button class="ghost-button" type="button" data-action="reset">Zurücksetzen</button>
        </div>

        <div class="control-grid">
          <label class="field">
            <span>Miete</span>
            <input data-field="rent" inputmode="decimal" type="number" min="0" step="0.01" value="${escapeHtml(state.rent)}">
          </label>

          <label class="field">
            <span>Monat</span>
            <input data-field="month" type="month" value="${escapeHtml(monthValue(state))}">
          </label>

          <label class="field">
            <span>Währung</span>
            <select data-field="currency">
              ${["USD", "EUR", "CHF", "GBP", "CAD", "AUD"]
                .map(
                  (code) =>
                    `<option value="${code}" ${state.currency === code ? "selected" : ""}>${code}</option>`,
                )
                .join("")}
            </select>
          </label>

          <label class="field">
            <span>Leerstand</span>
            <select data-field="emptyNightPolicy">
              <option value="unassigned" ${state.emptyNightPolicy === "unassigned" ? "selected" : ""}>Separat anzeigen</option>
              <option value="split_all" ${state.emptyNightPolicy === "split_all" ? "selected" : ""}>Auf alle Personen verteilen</option>
            </select>
          </label>
        </div>
      </section>
    `;
  }

  function renderStayRow(person, stay, bounds) {
    return `
      <div class="stay-row" data-person-id="${escapeHtml(person.id)}" data-stay-id="${escapeHtml(stay.id)}">
        <label class="field compact">
          <span>Anreise</span>
          <input data-field="stay-start" type="date" min="${bounds.start}" max="${bounds.lastNight}" value="${escapeHtml(stay.start)}">
        </label>
        <label class="field compact">
          <span>Abreise</span>
          <input data-field="stay-end" type="date" min="${bounds.start}" max="${bounds.checkout}" value="${escapeHtml(stay.end)}">
        </label>
        <button class="icon-button danger" type="button" data-action="remove-stay" aria-label="Aufenthalt löschen" title="Aufenthalt löschen">x</button>
      </div>
    `;
  }

  function renderPeople(calculation) {
    const totals = totalsById(calculation);
    const bounds = monthBounds(state);

    return `
      <section class="people-section" aria-labelledby="people-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Bewohner</p>
            <h2 id="people-title">Aufenthalte</h2>
          </div>
          <button class="primary-button" type="button" data-action="add-person">+ Person</button>
        </div>

        <div class="people-list">
          ${state.people
            .map((person) => {
              const total = totals.get(person.id);
              return `
                <article class="person-card" data-person-id="${escapeHtml(person.id)}">
                  <div class="person-topline">
                    <label class="field name-field">
                      <span>Name</span>
                      <input data-field="person-name" type="text" value="${escapeHtml(person.name)}">
                    </label>
                    <div class="person-total">
                      <strong>${money(total.totalCents)}</strong>
                      <span>${total.nightsPresent} ${nightWord(total.nightsPresent)}</span>
                    </div>
                    <button class="icon-button danger" type="button" data-action="remove-person" aria-label="Person löschen" title="Person löschen">x</button>
                  </div>

                  <div class="person-stats" aria-label="Aufteilung">
                    <span>${total.soloNights} allein</span>
                    <span>${total.sharedNights} geteilt</span>
                    <span>${money(total.emptyShareCents)} Leerstand</span>
                  </div>

                  <div class="stays">
                    ${person.stays.length > 0
                      ? person.stays.map((stay) => renderStayRow(person, stay, bounds)).join("")
                      : `<p class="empty-note">Keine Nächte eingetragen</p>`}
                  </div>

                  <div class="person-actions">
                    <button class="secondary-button" type="button" data-action="add-stay">+ Aufenthalt</button>
                    <button class="ghost-button" type="button" data-action="full-month">Ganzer Monat</button>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderSummary(calculation) {
    const percent =
      calculation.rentCents > 0
        ? Math.min(100, Math.round((calculation.allocatedCents / calculation.rentCents) * 100))
        : 0;
    const shareText = buildShareText(calculation);

    return `
      <section id="result" class="summary-panel app-section" aria-labelledby="result-title">
        <div class="summary-head">
          <div>
            <p class="eyebrow">Ergebnis</p>
            <h2 id="result-title">${money(calculation.allocatedCents)} verteilt</h2>
          </div>
          <button class="primary-button copy-button" type="button" data-action="copy">Kopieren</button>
        </div>

        <div class="meter-block" aria-label="Verteilte Miete">
          <span>von ${money(calculation.rentCents)}</span>
          <div class="meter-track">
            <span style="width: ${percent}%"></span>
          </div>
        </div>

        <div class="totals-grid">
          ${calculation.totals
            .map(
              (person) => `
                <div class="total-tile">
                  <span>${escapeHtml(person.name)}</span>
                  <strong>${money(person.totalCents)}</strong>
                  <small>${person.nightsPresent} ${nightWord(person.nightsPresent)}</small>
                </div>
              `,
            )
            .join("")}
          ${calculation.unassignedCents > 0
            ? `
              <div class="total-tile warning">
                <span>${vacancyLabel(calculation)}</span>
                <strong>${money(calculation.unassignedCents)}</strong>
                <small>nicht Personen zugeordnet</small>
              </div>
            `
            : ""}
        </div>

        <details class="share-details">
          <summary>Text zum Teilen</summary>
          <label class="field share-field">
            <span>Zusammenfassung</span>
            <textarea readonly rows="6">${escapeHtml(shareText)}</textarea>
          </label>
        </details>
        <p class="copy-status" aria-live="polite">${escapeHtml(copyStatus.message)}</p>
      </section>
    `;
  }

  function renderNightBreakdown(calculation) {
    return `
      <section id="plan" class="night-panel app-section" aria-labelledby="nights-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${escapeHtml(monthLabel())}</p>
            <h2 id="nights-title">Nachtplan</h2>
          </div>
        </div>

        <div class="night-list">
          ${calculation.nightRows
            .map((night) => {
              const occupantText = night.occupants.length
                ? night.occupants.map((person) => person.name).join(", ")
                : "Leer";
              const shareText = night.shares.length
                ? night.shares
                    .map((share) => `${share.name}: ${money(share.cents)}`)
                    .join(" | ")
                : `Separat: ${money(night.unassignedCents)}`;

              return `
                <div class="night-row ${night.isEmpty ? "is-empty" : ""}">
                  <time datetime="${night.date}">
                    <span>${night.nightOfMonth}</span>
                    <small>${escapeHtml(dateLabel(night.date))}</small>
                  </time>
                  <div>
                    <strong>${escapeHtml(occupantText)}</strong>
                    <span>${escapeHtml(shareText)}</span>
                  </div>
                  <small>${money(night.nightRentCents)}</small>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function render() {
    const calculation = calculateRentShare({
      ...state,
      emptyNightPolicy: state.emptyNightPolicy,
    });

    root.innerHTML = `
      ${renderHero(calculation)}
      <main>
        ${renderSummary(calculation)}
        <div id="entry" class="workspace app-section">
          <div class="workspace-main">
            ${renderControls()}
            ${renderPeople(calculation)}
          </div>
          <div class="workspace-side">
            ${renderNightBreakdown(calculation)}
          </div>
        </div>
      </main>
      <nav class="bottom-tabs" aria-label="App-Bereiche">
        <a class="is-active" href="#result" aria-current="page">
          <span class="tab-icon tab-result" aria-hidden="true"></span>
          <span>Ergebnis</span>
        </a>
        <a href="#entry">
          <span class="tab-icon tab-entry" aria-hidden="true"></span>
          <span>Eingabe</span>
        </a>
        <a href="#plan">
          <span class="tab-icon tab-plan" aria-hidden="true"></span>
          <span>Plan</span>
        </a>
      </nav>
    `;
    syncBottomTabs();
  }

  function updateField(target) {
    const field = target.dataset.field;
    if (!field) return false;

    if (field === "rent") {
      state.rent = Number(target.value);
      return true;
    }

    if (field === "month") {
      const [year, month] = target.value.split("-").map(Number);
      if (year && month) {
        state.year = year;
        state.month = month;
      }
      return true;
    }

    if (field === "currency") {
      state.currency = target.value;
      return true;
    }

    if (field === "emptyNightPolicy") {
      state.emptyNightPolicy = target.value;
      return true;
    }

    const personElement = target.closest("[data-person-id]");
    const person = personElement ? findPerson(personElement.dataset.personId) : null;

    if (field === "person-name" && person) {
      person.name = target.value;
      return true;
    }

    const stayElement = target.closest("[data-stay-id]");
    const stay = stayElement ? findStay(person, stayElement.dataset.stayId) : null;

    if (field === "stay-start" && stay) {
      stay.start = target.value;
      if (stay.end && parseISODate(stay.end) <= parseISODate(stay.start)) {
        stay.end = addDaysISO(stay.start, 1);
      }
      return true;
    }

    if (field === "stay-end" && stay) {
      stay.end = target.value;
      if (stay.start && parseISODate(stay.end) <= parseISODate(stay.start)) {
        stay.end = addDaysISO(stay.start, 1);
      }
      return true;
    }

    return false;
  }

  function addPerson() {
    state.people.push({
      id: createId("person"),
      name: `Person ${state.people.length + 1}`,
      stays: [],
    });
  }

  function removePerson(personId) {
    state.people = state.people.filter((person) => person.id !== personId);
  }

  function addStay(person) {
    const bounds = monthBounds(state);
    person.stays.push({
      id: createId("stay"),
      start: bounds.start,
      end: bounds.checkout,
    });
  }

  function fullMonth(person) {
    const bounds = monthBounds(state);
    person.stays = [{ id: createId("stay"), start: bounds.start, end: bounds.checkout }];
  }

  function removeStay(person, stayId) {
    person.stays = person.stays.filter((stay) => stay.id !== stayId);
  }

  async function copyShareText() {
    const calculation = calculateRentShare({
      ...state,
      emptyNightPolicy: state.emptyNightPolicy,
    });
    const text = buildShareText(calculation);

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Kopiert");
    } catch (error) {
      const textarea = document.querySelector(".share-field textarea");
      if (textarea) {
        textarea.focus();
        textarea.select();
        const copied = document.execCommand && document.execCommand("copy");
        setCopyStatus(copied ? "Kopiert" : "Text ist markiert");
        return;
      }
      setCopyStatus("Kopieren nicht möglich");
    }
  }

  root.addEventListener("input", (event) => {
    if (updateField(event.target)) saveState();
  });

  root.addEventListener("change", (event) => {
    if (updateField(event.target)) {
      saveState();
      render();
    }
  });

  root.addEventListener("click", (event) => {
    const tabLink = event.target.closest(".bottom-tabs a[href^='#']");
    if (tabLink) {
      event.preventDefault();

      const targetId = tabLink.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;

      tabSyncLockedUntil = Date.now() + 700;
      updateBottomTabs(targetId);
      if (window.location.hash !== `#${targetId}`) {
        window.history.pushState(null, "", `#${targetId}`);
      }

      const scrollMarginTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - scrollMarginTop);
      window.scrollTo({
        top,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });

      window.setTimeout(() => {
        tabSyncLockedUntil = 0;
        updateBottomTabs(targetId);
      }, 520);
      return;
    }

    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const personElement = button.closest("[data-person-id]");
    const person = personElement ? findPerson(personElement.dataset.personId) : null;
    const stayElement = button.closest("[data-stay-id]");

    if (action === "add-person") addPerson();
    if (action === "remove-person" && person) removePerson(person.id);
    if (action === "add-stay" && person) addStay(person);
    if (action === "full-month" && person) fullMonth(person);
    if (action === "remove-stay" && person && stayElement) {
      removeStay(person, stayElement.dataset.stayId);
    }
    if (action === "reset") state = defaultState();
    if (action === "copy") {
      copyShareText();
      return;
    }

    saveState();
    render();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  window.addEventListener("scroll", syncBottomTabs, { passive: true });
  window.addEventListener("hashchange", () => {
    const activeId = window.location.hash.replace("#", "");
    if (activeId) updateBottomTabs(activeId);
  });

  render();
})();
