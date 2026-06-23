(function () {
  "use strict";

  const {
    calculateRentShare,
    daysInMonth,
    formatISODate,
    formatMoney,
  } = window.RentShareCalculator;

  const STORAGE_KEY = "house-share-calculator:v1";
  const root = document.querySelector("#app");
  const copyStatus = { message: "", timeout: null };

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
      end: formatISODate(state.year, state.month, lastDay),
    };
  }

  function defaultState() {
    const base = currentYearMonth();
    const bounds = {
      start: formatISODate(base.year, base.month, 1),
      end: formatISODate(base.year, base.month, daysInMonth(base.year, base.month)),
    };

    return {
      rent: 2000,
      currency: "USD",
      year: base.year,
      month: base.month,
      emptyDayPolicy: "unassigned",
      people: [
        {
          id: createId("person"),
          name: "Person 1",
          stays: [{ id: createId("stay"), start: bounds.start, end: bounds.end }],
        },
        { id: createId("person"), name: "Person 2", stays: [] },
        { id: createId("person"), name: "Person 3", stays: [] },
      ],
    };
  }

  function sanitizeState(value) {
    const fallback = defaultState();
    const state = value && typeof value === "object" ? value : fallback;
    const year = Number(state.year) || fallback.year;
    const month = Number(state.month) || fallback.month;
    const people = Array.isArray(state.people) ? state.people : fallback.people;

    return {
      rent: Number.isFinite(Number(state.rent)) ? Number(state.rent) : fallback.rent,
      currency: typeof state.currency === "string" ? state.currency : "USD",
      year: Math.min(Math.max(year, 1900), 2200),
      month: Math.min(Math.max(month, 1), 12),
      emptyDayPolicy: state.emptyDayPolicy === "split_all" ? "split_all" : "unassigned",
      people: people.map((person, personIndex) => ({
        id: person.id || createId("person"),
        name:
          typeof person.name === "string" && person.name.trim()
            ? person.name
            : `Person ${personIndex + 1}`,
        stays: Array.isArray(person.stays)
          ? person.stays.map((stay) => ({
              id: stay.id || createId("stay"),
              start: stay.start || "",
              end: stay.end || "",
            }))
          : [],
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

  function money(cents) {
    return formatMoney(cents, state.currency, "de-DE");
  }

  function buildShareText(calculation) {
    const lines = [
      `Hausmiete ${monthLabel()}: ${money(calculation.rentCents)}`,
      "",
      "Anteile:",
      ...calculation.totals.map((person) => {
        const parts = [
          `${person.name}: ${money(person.totalCents)}`,
          `${person.daysPresent} Tage`,
        ];
        if (person.emptyShareCents > 0) {
          parts.push(`${money(person.emptyShareCents)} Leerstand`);
        }
        return parts.join(" | ");
      }),
    ];

    if (calculation.unassignedCents > 0) {
      lines.push(`Leerstand separat: ${money(calculation.unassignedCents)}`);
    }

    lines.push("", `Summe verteilt: ${money(calculation.allocatedCents)}`);
    return lines.join("\n");
  }

  function totalsById(calculation) {
    return new Map(calculation.totals.map((person) => [person.id, person]));
  }

  function renderControls() {
    return `
      <section class="panel controls-panel" aria-labelledby="settings-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Rechnung</p>
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

          <label class="field field-wide">
            <span>Leerstand</span>
            <select data-field="emptyDayPolicy">
              <option value="unassigned" ${state.emptyDayPolicy === "unassigned" ? "selected" : ""}>Separat anzeigen</option>
              <option value="split_all" ${state.emptyDayPolicy === "split_all" ? "selected" : ""}>Auf alle Personen verteilen</option>
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
          <span>Von</span>
          <input data-field="stay-start" type="date" min="${bounds.start}" max="${bounds.end}" value="${escapeHtml(stay.start)}">
        </label>
        <label class="field compact">
          <span>Bis</span>
          <input data-field="stay-end" type="date" min="${bounds.start}" max="${bounds.end}" value="${escapeHtml(stay.end)}">
        </label>
        <button class="icon-button danger" type="button" data-action="remove-stay" aria-label="Aufenthalt löschen" title="Aufenthalt löschen">x</button>
      </div>
    `;
  }

  function renderPeople(calculation) {
    const totals = totalsById(calculation);
    const bounds = monthBounds(state);

    return `
      <section class="panel people-panel" aria-labelledby="people-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Personen</p>
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
                      <span>${total.daysPresent} Tage</span>
                    </div>
                    <button class="icon-button danger" type="button" data-action="remove-person" aria-label="Person löschen" title="Person löschen">x</button>
                  </div>

                  <div class="person-stats" aria-label="Aufteilung">
                    <span>${total.soloDays} allein</span>
                    <span>${total.sharedDays} geteilt</span>
                    <span>${money(total.emptyShareCents)} Leerstand</span>
                  </div>

                  <div class="stays">
                    ${person.stays.length > 0
                      ? person.stays.map((stay) => renderStayRow(person, stay, bounds)).join("")
                      : `<p class="empty-note">Keine Tage eingetragen</p>`}
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
      <section class="panel result-panel" aria-labelledby="result-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Ergebnis</p>
            <h2 id="result-title">Was jeder zahlt</h2>
          </div>
          <button class="primary-button" type="button" data-action="copy">Kopieren</button>
        </div>

        <div class="summary-meter" aria-label="Verteilte Miete">
          <div>
            <strong>${money(calculation.allocatedCents)}</strong>
            <span>von ${money(calculation.rentCents)} verteilt</span>
          </div>
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
                  <small>${person.daysPresent} Tage im Haus</small>
                </div>
              `,
            )
            .join("")}
          ${calculation.unassignedCents > 0
            ? `
              <div class="total-tile warning">
                <span>Leerstand separat</span>
                <strong>${money(calculation.unassignedCents)}</strong>
                <small>noch nicht verteilt</small>
              </div>
            `
            : ""}
        </div>

        <label class="field share-field">
          <span>Text zum Teilen</span>
          <textarea readonly rows="7">${escapeHtml(shareText)}</textarea>
        </label>
        <p class="copy-status" aria-live="polite">${escapeHtml(copyStatus.message)}</p>
      </section>
    `;
  }

  function renderDayBreakdown(calculation) {
    return `
      <section class="panel days-panel" aria-labelledby="days-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${escapeHtml(monthLabel())}</p>
            <h2 id="days-title">Tage</h2>
          </div>
        </div>

        <div class="day-list">
          ${calculation.dayRows
            .map((day) => {
              const occupantText = day.occupants.length
                ? day.occupants.map((person) => person.name).join(", ")
                : "Leer";
              const shareText = day.shares.length
                ? day.shares.map((share) => `${share.name}: ${money(share.cents)}`).join(" | ")
                : `Separat: ${money(day.unassignedCents)}`;

              return `
                <div class="day-row ${day.isEmpty ? "is-empty" : ""}">
                  <time datetime="${day.date}">${day.dayOfMonth}</time>
                  <div>
                    <strong>${escapeHtml(occupantText)}</strong>
                    <span>${escapeHtml(shareText)}</span>
                  </div>
                  <small>${money(day.dayRentCents)}</small>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function render() {
    const calculation = calculateRentShare(state);
    root.innerHTML = `
      <header class="app-header">
        <div>
          <p class="eyebrow">House Split</p>
          <h1>Hauskosten teilen</h1>
        </div>
        <div class="header-total">
          <span>${escapeHtml(monthLabel())}</span>
          <strong>${money(calculation.rentCents)}</strong>
        </div>
      </header>

      <main class="layout">
        <div class="left-column">
          ${renderControls()}
          ${renderPeople(calculation)}
        </div>
        <div class="right-column">
          ${renderSummary(calculation)}
          ${renderDayBreakdown(calculation)}
        </div>
      </main>
    `;
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

    if (field === "emptyDayPolicy") {
      state.emptyDayPolicy = target.value;
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
      return true;
    }

    if (field === "stay-end" && stay) {
      stay.end = target.value;
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
      end: bounds.end,
    });
  }

  function fullMonth(person) {
    const bounds = monthBounds(state);
    person.stays = [{ id: createId("stay"), start: bounds.start, end: bounds.end }];
  }

  function removeStay(person, stayId) {
    person.stays = person.stays.filter((stay) => stay.id !== stayId);
  }

  async function copyShareText() {
    const calculation = calculateRentShare(state);
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

  render();
})();
