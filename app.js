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
  const PEOPLE_LIBRARY_KEY = "house-share-calculator:people-library:v1";
  const ECB_RATES_STORAGE_KEY = "house-share-calculator:frankfurter-ecb-rate:v2";
  const ECB_RATE_SET_STORAGE_KEY = "house-share-calculator:frankfurter-ecb-rates:v3";
  const INSTALL_PROMO_KEY = "house-share-calculator:install-promo:v1";
  const FRANKFURTER_RATES_URL = "https://api.frankfurter.dev/v2/rates";
  const FRANKFURTER_PROVIDER = "ECB";
  const CURRENCY_CODES = [
    "EUR",
    "USD",
    "CHF",
    "GBP",
    "CAD",
    "AUD",
    "JPY",
    "NOK",
    "SEK",
    "DKK",
    "PLN",
    "CZK",
    "HUF",
    "BGN",
    "RON",
    "TRY",
    "NZD",
    "MXN",
    "BRL",
    "CNY",
    "HKD",
    "SGD",
    "KRW",
    "INR",
    "ZAR",
    "ILS",
    "THB",
    "MYR",
    "IDR",
    "PHP",
    "ISK",
  ];
  const root = document.querySelector("#app");
  const toastState = {
    message: "",
    actionLabel: "",
    onAction: null,
    timeout: null,
  };
  const sheetState = { type: null, personId: null };
  const fxState = {
    rates: null,
    peopleRates: null,
    targetCurrency: "",
    status: "",
    peopleStatus: "",
    isLoading: false,
    peopleIsLoading: false,
    peopleRequestKey: "",
  };
  let personRateTimer = null;
  let installPrompt = null;
  let installPromoTimer = null;
  let isOnline = navigator.onLine;
  let isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
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

  function normalizeCurrencyCode(value, fallback) {
    const code = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (CURRENCY_CODES.includes(code)) return code;
    return CURRENCY_CODES.includes(fallback) ? fallback : "USD";
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
          payCurrency: "USD",
          stays: [{ id: createId("stay"), start: bounds.start, end: bounds.checkout }],
        },
        { id: createId("person"), name: "Person 2", payCurrency: "USD", stays: [] },
        { id: createId("person"), name: "Person 3", payCurrency: "USD", stays: [] },
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
      currency: normalizeCurrencyCode(state.currency, "USD"),
      year: Math.min(Math.max(year, 1900), 2200),
      month: Math.min(Math.max(month, 1), 12),
      emptyNightPolicy,
      people: people.map((person, personIndex) => ({
        id: person.id || createId("person"),
        name:
          typeof person.name === "string" && person.name.trim()
            ? person.name
            : `Person ${personIndex + 1}`,
        payCurrency: normalizeCurrencyCode(person.payCurrency, normalizeCurrencyCode(state.currency, "USD")),
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

  function loadPeopleLibrary() {
    try {
      const raw = window.localStorage.getItem(PEOPLE_LIBRARY_KEY);
      const names = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(names)) return [];
      return [...new Set(names.filter((name) => typeof name === "string").map((name) => name.trim()))]
        .filter(Boolean)
        .slice(0, 24);
    } catch (error) {
      return [];
    }
  }

  let state = loadState();
  let peopleLibrary = loadPeopleLibrary();
  fxState.rates = loadCachedEcbRates();
  fxState.peopleRates = loadCachedFrankfurterRates(state.currency);
  fxState.targetCurrency = state.currency === "EUR" ? "USD" : "EUR";

  function savePeopleLibrary() {
    try {
      window.localStorage.setItem(PEOPLE_LIBRARY_KEY, JSON.stringify(peopleLibrary));
    } catch (error) {
      // Some mobile file previews block localStorage; saved names are optional.
    }
  }

  function loadCachedEcbRates(sourceCurrency, targetCurrency) {
    try {
      const raw = window.localStorage.getItem(ECB_RATES_STORAGE_KEY);
      const cached = raw ? JSON.parse(raw) : null;
      if (!cached || typeof cached.date !== "string" || !cached.rates) return null;
      if (sourceCurrency && cached.base !== sourceCurrency) return null;
      if (targetCurrency && cached.quote !== targetCurrency) return null;
      return cached;
    } catch (error) {
      return null;
    }
  }

  function saveEcbRates(rates) {
    try {
      window.localStorage.setItem(ECB_RATES_STORAGE_KEY, JSON.stringify(rates));
    } catch (error) {
      // Exchange rates can be fetched again; caching is only a convenience.
    }
  }

  function loadCachedFrankfurterRates(sourceCurrency) {
    try {
      const raw = window.localStorage.getItem(ECB_RATE_SET_STORAGE_KEY);
      const cached = raw ? JSON.parse(raw) : null;
      if (!cached || typeof cached.date !== "string" || !cached.rates) return null;
      if (sourceCurrency && cached.base !== normalizeCurrencyCode(sourceCurrency, state.currency)) return null;
      return cached;
    } catch (error) {
      return null;
    }
  }

  function saveFrankfurterRates(rates) {
    try {
      window.localStorage.setItem(ECB_RATE_SET_STORAGE_KEY, JSON.stringify(rates));
    } catch (error) {
      // Exchange rates can be fetched again; caching is only a convenience.
    }
  }

  function todayISODate() {
    return new Date().toISOString().slice(0, 10);
  }

  function frankfurterRateUrl(sourceCurrency, targetCurrency) {
    const url = new URL(FRANKFURTER_RATES_URL);
    url.searchParams.set("base", sourceCurrency);
    url.searchParams.set("quotes", targetCurrency);
    url.searchParams.set("providers", FRANKFURTER_PROVIDER);
    return url.toString();
  }

  function frankfurterRatesUrl(sourceCurrency, targetCurrencies) {
    const url = new URL(FRANKFURTER_RATES_URL);
    url.searchParams.set("base", sourceCurrency);
    url.searchParams.set("quotes", targetCurrencies.join(","));
    url.searchParams.set("providers", FRANKFURTER_PROVIDER);
    return url.toString();
  }

  function normalizeFrankfurterRatePayload(payload, sourceCurrency, targetCurrency) {
    const source = sourceCurrency.toUpperCase();
    const target = targetCurrency.toUpperCase();
    const rows = Array.isArray(payload) ? payload : [payload];
    const row = rows.find(
      (entry) =>
        String(entry && entry.base).toUpperCase() === source &&
        String(entry && entry.quote).toUpperCase() === target,
    );
    const rate = row ? Number(row.rate) : NaN;

    if (!row || !Number.isFinite(rate) || rate <= 0 || typeof row.date !== "string") {
      throw new Error("Frankfurter response did not contain an ECB rate for this pair");
    }

    return {
      date: row.date,
      base: source,
      quote: target,
      provider: FRANKFURTER_PROVIDER,
      rates: {
        [source]: 1,
        [target]: rate,
      },
      source: frankfurterRateUrl(source, target),
      fetchedAt: new Date().toISOString(),
    };
  }

  function normalizeFrankfurterRatesPayload(payload, sourceCurrency, targetCurrencies) {
    const source = sourceCurrency.toUpperCase();
    const targets = targetCurrencies.map((currency) => currency.toUpperCase());
    const requested = new Set(targets);
    const rows = Array.isArray(payload) ? payload : [payload];
    const rates = { [source]: 1 };
    let date = "";

    rows.forEach((entry) => {
      const base = String(entry && entry.base).toUpperCase();
      const quote = String(entry && entry.quote).toUpperCase();
      const rate = Number(entry && entry.rate);
      if (base === source && requested.has(quote) && Number.isFinite(rate) && rate > 0) {
        rates[quote] = rate;
        if (!date && typeof entry.date === "string") date = entry.date;
      }
    });

    if (!date || Object.keys(rates).length <= 1) {
      throw new Error("Frankfurter response did not contain usable ECB rates");
    }

    return {
      date,
      base: source,
      provider: FRANKFURTER_PROVIDER,
      rates,
      source: frankfurterRatesUrl(source, targets),
      fetchedAt: new Date().toISOString(),
    };
  }

  function formatRateDate(value) {
    const dayNumber = parseISODate(value);
    if (dayNumber === null) return value || "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(dayNumber * 24 * 60 * 60 * 1000));
  }

  function currencyOptions(selected) {
    return CURRENCY_CODES.map(
      (code) => `<option value="${code}" ${selected === code ? "selected" : ""}>${code}</option>`,
    ).join("");
  }

  function rateFor(currency, rates) {
    if (!currency || !rates) return null;
    const rate = rates.rates[currency];
    return Number.isFinite(Number(rate)) && Number(rate) > 0 ? Number(rate) : null;
  }

  function convertCurrencyAmount(amount, fromCurrency, toCurrency, rates) {
    const fromRate = rateFor(fromCurrency, rates);
    const toRate = rateFor(toCurrency, rates);
    if (!fromRate || !toRate) return null;
    return Math.round((Number(amount) / fromRate) * toRate * 100) / 100;
  }

  function moneyInCurrency(cents, currency) {
    return formatMoney(cents, currency, "de-DE");
  }

  function personPayCurrency(person) {
    return normalizeCurrencyCode(person && person.payCurrency, state.currency);
  }

  function requiredPersonCurrencies() {
    const base = normalizeCurrencyCode(state.currency, "USD");
    return [
      ...new Set(
        state.people
          .map((person) => personPayCurrency(person))
          .filter((currency) => currency !== base),
      ),
    ].sort();
  }

  function ratesCoverTargets(rates, sourceCurrency, targetCurrencies) {
    const source = normalizeCurrencyCode(sourceCurrency, state.currency);
    return Boolean(
      rates &&
        rates.base === source &&
        rateFor(source, rates) &&
        targetCurrencies.every((currency) => rateFor(currency, rates)),
    );
  }

  function convertPersonCents(cents, targetCurrency) {
    const source = normalizeCurrencyCode(state.currency, "USD");
    const target = normalizeCurrencyCode(targetCurrency, source);
    if (target === source) return cents;
    if (!ratesCoverTargets(fxState.peopleRates, source, [target])) return null;
    const rate = rateFor(target, fxState.peopleRates);
    return Math.round(cents * rate);
  }

  function personPaymentInfo(person, totalCents) {
    const currency = personPayCurrency(person);
    const baseText = money(totalCents);
    if (currency === state.currency) {
      return {
        currency,
        baseText,
        convertedText: "",
        statusText: `Zahlt in ${currency}`,
        isConverted: false,
      };
    }

    const convertedCents = convertPersonCents(totalCents, currency);
    if (convertedCents !== null) {
      return {
        currency,
        baseText,
        convertedText: moneyInCurrency(convertedCents, currency),
        statusText: `Zahlt in ${currency}`,
        isConverted: true,
      };
    }

    return {
      currency,
      baseText,
      convertedText: fxState.peopleIsLoading ? "Kurs lädt..." : `Kurs für ${currency} fehlt`,
      statusText: `Zahlt in ${currency}`,
      isConverted: false,
    };
  }

  function isRateForPair(rates, sourceCurrency, targetCurrency) {
    return Boolean(
      rates &&
        rates.base === sourceCurrency &&
        rates.quote === targetCurrency &&
        rateFor(sourceCurrency, rates) &&
        rateFor(targetCurrency, rates),
    );
  }

  async function loadEcbRates(sourceCurrency = state.currency, targetCurrency = fxState.targetCurrency || "EUR") {
    const source = sourceCurrency.toUpperCase();
    const target = targetCurrency.toUpperCase();

    fxState.isLoading = true;
    fxState.status = "Frankfurter/EZB-Livekurs wird geladen...";
    render();

    try {
      if (source === target) {
        const parsed = {
          date: todayISODate(),
          base: source,
          quote: target,
          provider: FRANKFURTER_PROVIDER,
          rates: { [source]: 1 },
          source: "identity",
          fetchedAt: new Date().toISOString(),
        };
        fxState.rates = parsed;
        fxState.status = "Quelle und Ziel sind identisch. Es ist keine Umrechnung nötig.";
        return parsed;
      }

      const response = await fetch(frankfurterRateUrl(source, target), { cache: "no-store" });
      if (!response.ok) throw new Error(`Frankfurter request failed with ${response.status}`);
      const parsed = normalizeFrankfurterRatePayload(await response.json(), source, target);
      fxState.rates = parsed;
      fxState.status = `Frankfurter/EZB-Livekurs vom ${formatRateDate(parsed.date)} geladen.`;
      saveEcbRates(parsed);
      return parsed;
    } catch (error) {
      const cached = loadCachedEcbRates(source, target);
      if (cached) {
        fxState.rates = cached;
        fxState.status = `Offline genutzt: letzter Frankfurter/EZB-Kurs vom ${formatRateDate(cached.date)}.`;
        return cached;
      }

      fxState.status = "Frankfurter/EZB-Livekurs konnte nicht geladen werden.";
      return null;
    } finally {
      fxState.isLoading = false;
      render();
      focusSheet();
    }
  }

  async function loadPersonPaymentRates() {
    const source = normalizeCurrencyCode(state.currency, "USD");
    const targets = requiredPersonCurrencies();
    if (!targets.length || ratesCoverTargets(fxState.peopleRates, source, targets)) return fxState.peopleRates;

    const cached = loadCachedFrankfurterRates(source);
    if (ratesCoverTargets(cached, source, targets)) {
      fxState.peopleRates = cached;
      return cached;
    }

    const requestKey = `${source}:${targets.join(",")}`;
    if (fxState.peopleIsLoading && fxState.peopleRequestKey === requestKey) return null;

    fxState.peopleIsLoading = true;
    fxState.peopleRequestKey = requestKey;
    fxState.peopleStatus = "Zahlungswährungen werden geladen...";
    render();

    try {
      const response = await fetch(frankfurterRatesUrl(source, targets), { cache: "no-store" });
      if (!response.ok) throw new Error(`Frankfurter request failed with ${response.status}`);
      const parsed = normalizeFrankfurterRatesPayload(await response.json(), source, targets);
      fxState.peopleRates = parsed;
      fxState.peopleStatus = `Zahlungswährungen vom ${formatRateDate(parsed.date)} geladen.`;
      saveFrankfurterRates(parsed);
      return parsed;
    } catch (error) {
      if (cached) {
        fxState.peopleRates = cached;
        fxState.peopleStatus = `Offline genutzt: letzter Kurs vom ${formatRateDate(cached.date)}.`;
        return cached;
      }
      fxState.peopleStatus = "Zahlungswährungen konnten nicht geladen werden.";
      return null;
    } finally {
      fxState.peopleIsLoading = false;
      fxState.peopleRequestKey = "";
      render();
    }
  }

  function schedulePersonRateLoad() {
    if (personRateTimer) window.clearTimeout(personRateTimer);
    personRateTimer = window.setTimeout(() => {
      personRateTimer = null;
      const source = normalizeCurrencyCode(state.currency, "USD");
      const targets = requiredPersonCurrencies();
      if (!targets.length || fxState.peopleIsLoading) return;
      if (ratesCoverTargets(fxState.peopleRates, source, targets)) return;
      loadPersonPaymentRates();
    }, 0);
  }

  async function convertWithEcbRates() {
    const targetCurrency = fxState.targetCurrency || "EUR";
    const sourceCurrency = state.currency;
    const rates = await loadEcbRates(sourceCurrency, targetCurrency);
    if (!rates) {
      showToast("Livekurs nicht verfügbar");
      render();
      return;
    }

    const converted = convertCurrencyAmount(state.rent, sourceCurrency, targetCurrency, rates);
    if (converted === null) {
      fxState.status = `${sourceCurrency} oder ${targetCurrency} ist im Frankfurter/EZB-Feed nicht verfügbar.`;
      render();
      return;
    }

    const previousAmount = state.rent;
    const previousCurrency = state.currency;
    state.rent = converted;
    state.currency = targetCurrency;
    fxState.status = `${previousAmount} ${previousCurrency} wurden mit dem Livekurs vom ${formatRateDate(rates.date)} zu ${converted.toFixed(2)} ${targetCurrency} umgerechnet.`;
    saveState();
    showToast(`In ${targetCurrency} umgerechnet`, {
      actionLabel: "Rückgängig",
      onAction: () => {
        state.rent = previousAmount;
        state.currency = previousCurrency;
      },
    });
    render();
  }

  function readInstallPromoState() {
    try {
      return JSON.parse(window.localStorage.getItem(INSTALL_PROMO_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function dismissInstallPromo() {
    try {
      window.localStorage.setItem(
        INSTALL_PROMO_KEY,
        JSON.stringify({ dismissedAt: new Date().toISOString() }),
      );
    } catch (error) {
      // Install hints are optional and should not block the app.
    }
  }

  function installPlatform() {
    const ua = window.navigator.userAgent || "";
    const isIos = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isWindows = /Windows/.test(ua);
    if (isIos) return "ios";
    if (isAndroid) return "android";
    if (isWindows) return "windows";
    return "desktop";
  }

  function shouldShowInstallPromo() {
    if (isStandalone || sheetState.type) return false;
    return !readInstallPromoState().dismissedAt;
  }

  function scheduleInstallPromo(delay) {
    if (installPromoTimer) window.clearTimeout(installPromoTimer);
    installPromoTimer = window.setTimeout(() => {
      if (!shouldShowInstallPromo()) return;
      openSheet("install");
      render();
    }, delay || 1200);
  }

  function rememberPersonName(name) {
    const normalized = typeof name === "string" ? name.trim() : "";
    if (!normalized || /^person\s+\d+$/i.test(normalized)) return;

    peopleLibrary = [
      normalized,
      ...peopleLibrary.filter((entry) => entry.toLocaleLowerCase() !== normalized.toLocaleLowerCase()),
    ].slice(0, 24);
    savePeopleLibrary();
  }

  function rememberVisiblePeople() {
    state.people.forEach((person) => rememberPersonName(person.name));
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Some mobile file previews block localStorage; the calculator still works in-memory.
    }
    rememberVisiblePeople();
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

  function clearToast() {
    toastState.message = "";
    toastState.actionLabel = "";
    toastState.onAction = null;
    if (toastState.timeout) window.clearTimeout(toastState.timeout);
    toastState.timeout = null;
  }

  function showToast(message, options) {
    clearToast();
    toastState.message = message;
    toastState.actionLabel = options && options.actionLabel ? options.actionLabel : "";
    toastState.onAction = options && typeof options.onAction === "function" ? options.onAction : null;
    toastState.timeout = window.setTimeout(() => {
      clearToast();
      render();
    }, options && options.duration ? options.duration : 3200);
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
    return moneyInCurrency(cents, state.currency);
  }

  function nightWord(count) {
    return count === 1 ? "Nacht" : "Nächte";
  }

  function personInitial(name) {
    const trimmed = typeof name === "string" ? name.trim() : "";
    return trimmed ? trimmed.slice(0, 1).toUpperCase() : "?";
  }

  function vacancyLabel(calculation) {
    return calculation.emptyNightPolicy === "split_all"
      ? "Leerstand verteilt"
      : "Leerstand separat";
  }

  function onlineLabel() {
    if (!isOnline) return "Offline bereit";
    if (isStandalone) return "Installiert";
    if (installPrompt) return "Installierbar";
    return "Lokal gespeichert";
  }

  function stayLabel(stay) {
    if (!stay.start || !stay.end) return "Unvollständig";
    return `${dateLabel(stay.start)} bis ${dateLabel(stay.end)}`;
  }

  function personStaySummary(person) {
    if (!person.stays.length) return "Keine Aufenthalte";
    if (person.stays.length === 1) return stayLabel(person.stays[0]);
    return `${person.stays.length} Aufenthalte`;
  }

  function openSheet(type, options) {
    sheetState.type = type;
    sheetState.personId = options && options.personId ? options.personId : null;
  }

  function closeSheet() {
    sheetState.type = null;
    sheetState.personId = null;
  }

  function focusSheet() {
    window.setTimeout(() => {
      const sheet = document.querySelector(".sheet-panel");
      if (!sheet) return;
      const focusTarget = sheet.querySelector("input, select, textarea") || sheet.querySelector("button");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    }, 0);
  }

  function buildShareText(calculation) {
    const lines = [
      `Hausmiete ${monthLabel()}: ${money(calculation.rentCents)}`,
      `Basis: ${calculation.monthNights} ${nightWord(calculation.monthNights)} · Anreise zählt, Abreise nicht`,
      "",
      "Anteile:",
      ...calculation.totals.map((person) => {
        const statePerson = findPerson(person.id);
        const payment = personPaymentInfo(statePerson, person.totalCents);
        const parts = [
          `${person.name}: ${money(person.totalCents)}`,
          `${person.nightsPresent} ${nightWord(person.nightsPresent)}`,
        ];
        if (payment.convertedText && payment.isConverted) {
          parts.push(`Zahlt ${payment.convertedText}`);
        }
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

  function renderAppTopbar() {
    return `
      <header class="app-topbar">
        <a class="app-mark" href="#result" aria-label="HouseSplit Ergebnis öffnen">
          <span class="app-logo" aria-hidden="true">H</span>
          <span>
            <strong>HouseSplit</strong>
            <small>${escapeHtml(onlineLabel())}</small>
          </span>
        </a>
        <div class="topbar-actions">
          ${installPrompt && !isStandalone
            ? `<button class="icon-label-button" type="button" data-action="install-app" aria-label="App installieren">
                <span class="button-icon icon-download" aria-hidden="true"></span>
                <span>Installieren</span>
              </button>`
            : ""}
          <button class="icon-label-button" type="button" data-action="open-settings" aria-label="Setup öffnen">
            <span class="button-icon icon-settings" aria-hidden="true"></span>
            <span>Setup</span>
          </button>
        </div>
      </header>
    `;
  }

  function renderHero(calculation) {
    return `
      <header class="app-hero">
        <div class="brand-block">
          <p class="eyebrow">HouseSplit</p>
          <h1>Miete nach Nächten teilen</h1>
          <p class="hero-lede">Mobile Abrechnung für WG, Ferienhaus und Freunde. Personen bleiben lokal gespeichert.</p>
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
            <strong>${escapeHtml(vacancyLabel(calculation))}</strong>
          </div>
        </div>
      </header>
    `;
  }

  function renderControls(calculation) {
    const emptyNightCount = calculation.nightRows.filter((night) => night.isEmpty).length;

    return `
      <section class="setup-panel" aria-labelledby="settings-title">
        <div class="setup-summary">
          <div>
            <p class="eyebrow">Setup</p>
            <h2 id="settings-title">Monatsdaten</h2>
            <p class="section-note">${escapeHtml(monthLabel())} · ${money(calculation.rentCents)} · ${state.currency}</p>
          </div>
          <button class="secondary-button" type="button" data-action="open-settings">Bearbeiten</button>
        </div>

        <div class="setup-chips" aria-label="Abrechnungsdetails">
          <span>${calculation.monthNights} ${nightWord(calculation.monthNights)}</span>
          <span>${emptyNightCount} leer</span>
          <span>${escapeHtml(vacancyLabel(calculation))}</span>
          <span>${state.people.length} Personen</span>
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
        <button class="icon-button danger" type="button" data-action="remove-stay" aria-label="Aufenthalt löschen" title="Aufenthalt löschen">×</button>
      </div>
    `;
  }

  function renderPeople(calculation) {
    const totals = totalsById(calculation);

    return `
      <section class="people-section" aria-labelledby="people-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Bewohner</p>
            <h2 id="people-title">Personen</h2>
            <p class="section-note">Kurzansicht hier, Details im Sheet.</p>
          </div>
          <button class="primary-button" type="button" data-action="open-add-person">Neue Person</button>
        </div>

        <div class="people-list">
          ${state.people
            .map((person) => {
              const total = totals.get(person.id);
              const payment = personPaymentInfo(findPerson(person.id), total.totalCents);
              return `
                <article class="person-card" data-person-id="${escapeHtml(person.id)}">
                  <div class="person-topline">
                    <div class="person-identity">
                      <span class="person-avatar" aria-hidden="true">${escapeHtml(personInitial(person.name))}</span>
                      <div class="person-name-block">
                        <h3>${escapeHtml(person.name)}</h3>
                        <p>${escapeHtml(personStaySummary(person))}</p>
                      </div>
                    </div>
                    <div class="person-total">
                      <strong>${escapeHtml(payment.convertedText || payment.baseText)}</strong>
                      ${payment.convertedText
                        ? `<span>${escapeHtml(payment.baseText)} Basis</span>`
                        : `<span>${total.nightsPresent} ${nightWord(total.nightsPresent)}</span>`}
                    </div>
                  </div>

                  <div class="person-stats" aria-label="Aufteilung">
                    <span>${escapeHtml(payment.statusText)}</span>
                    <span>${total.soloNights} allein</span>
                    <span>${total.sharedNights} geteilt</span>
                    ${total.emptyShareCents > 0 ? `<span>${money(total.emptyShareCents)} Leerstand</span>` : ""}
                  </div>

                  <div class="person-actions">
                    <button class="secondary-button" type="button" data-action="open-person">Bearbeiten</button>
                    <button class="ghost-button" type="button" data-action="add-stay">Aufenthalt</button>
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

    return `
      <section id="result" class="summary-panel app-section" aria-labelledby="result-title">
        <div class="summary-head">
          <div>
            <p class="eyebrow">Ergebnis</p>
            <h2 id="result-title">
              ${money(calculation.allocatedCents)}
              <span>verteilt</span>
            </h2>
            <p class="summary-rule">${calculation.monthNights} ${nightWord(calculation.monthNights)} · ${vacancyLabel(calculation)}</p>
          </div>
          <div class="summary-actions">
            <button class="primary-button copy-button" type="button" data-action="copy">Kopieren</button>
            <button class="secondary-button" type="button" data-action="open-share">Teilen</button>
          </div>
        </div>

        <div class="meter-block" aria-label="Verteilte Miete">
          <span>von ${money(calculation.rentCents)}</span>
          <div class="meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
            <span style="width: ${percent}%"></span>
          </div>
        </div>

        <div class="totals-grid">
          ${calculation.totals
            .map((person) => {
              const payment = personPaymentInfo(findPerson(person.id), person.totalCents);
              return `
                <div class="total-tile">
                  <div class="total-tile-head">
                    <span class="person-avatar small" aria-hidden="true">${escapeHtml(personInitial(person.name))}</span>
                    <span>${escapeHtml(person.name)}</span>
                  </div>
                  <strong>${escapeHtml(payment.convertedText || payment.baseText)}</strong>
                  <small>${payment.convertedText
                    ? `${escapeHtml(payment.baseText)} Basis · ${person.nightsPresent} ${nightWord(person.nightsPresent)}`
                    : `${person.nightsPresent} ${nightWord(person.nightsPresent)}`}</small>
                </div>
              `;
            })
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

        ${calculation.unassignedCents > 0
          ? `<div class="inline-alert">
              <strong>${money(calculation.unassignedCents)} Leerstand</strong>
              <span>Öffne Setup, um Leerstand auf alle Personen zu verteilen.</span>
            </div>`
          : ""}
      </section>
    `;
  }

  function renderNightBreakdown(calculation) {
    const emptyNightCount = calculation.nightRows.filter((night) => night.isEmpty).length;
    const occupiedNightCount = calculation.monthNights - emptyNightCount;
    const averageNightRent = calculation.nightRows[0] ? calculation.nightRows[0].nightRentCents : 0;

    return `
      <section id="plan" class="night-panel app-section" aria-labelledby="nights-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${escapeHtml(monthLabel())}</p>
            <h2 id="nights-title">Nachtplan</h2>
            <p class="section-note">${occupiedNightCount} belegt · ${emptyNightCount} leer · ca. ${money(averageNightRent)} pro Nacht</p>
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

  function renderSheetHeader(title, kicker) {
    return `
      <div class="sheet-header">
        <div>
          <p class="eyebrow">${escapeHtml(kicker)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <button class="icon-button" type="button" data-action="close-sheet" aria-label="Schließen" title="Schließen">×</button>
      </div>
    `;
  }

  function renderSettingsSheet(calculation) {
    return `
      ${renderSheetHeader("Monatsdaten", "Setup")}
      <div class="sheet-body">
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
              ${currencyOptions(state.currency)}
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

        <div class="sheet-stat-grid">
          <div>
            <span>Monat</span>
            <strong>${calculation.monthNights} ${nightWord(calculation.monthNights)}</strong>
          </div>
          <div>
            <span>Verteilt</span>
            <strong>${money(calculation.allocatedCents)}</strong>
          </div>
        </div>

        <div class="sheet-callout">
          <div>
            <strong>Währung umrechnen</strong>
            <span>Konvertiert die aktuelle Miete online mit dem Frankfurter/ECB-Livekurs.</span>
          </div>
          <button class="secondary-button" type="button" data-action="open-currency-converter">EZB umrechnen</button>
        </div>

        <div class="sheet-actions">
          <button class="ghost-button danger-text" type="button" data-action="reset">Zurücksetzen</button>
          <button class="primary-button" type="button" data-action="close-sheet">Fertig</button>
        </div>
      </div>
    `;
  }

  function renderCurrencySheet() {
    const targetCurrency = fxState.targetCurrency || (state.currency === "EUR" ? "USD" : "EUR");
    const rates = isRateForPair(fxState.rates, state.currency, targetCurrency) ? fxState.rates : null;
    const converted = rates
      ? convertCurrencyAmount(state.rent, state.currency, targetCurrency, rates)
      : null;
    const pairRate = rates ? rateFor(targetCurrency, rates) : null;

    return `
      ${renderSheetHeader("EZB-Umrechnung", "Währung")}
      <div class="sheet-body">
        <div class="converter-card">
          <div>
            <span>Aktuelle Miete</span>
            <strong>${escapeHtml(String(state.rent))} ${escapeHtml(state.currency)}</strong>
          </div>
          <span class="converter-arrow" aria-hidden="true">→</span>
          <div>
            <span>Zielwährung</span>
            <strong>${converted === null ? "Livekurs laden" : `${converted.toFixed(2)} ${targetCurrency}`}</strong>
          </div>
        </div>

        <label class="field">
          <span>Nach Währung umrechnen</span>
          <select data-field="fx-target-currency">
            ${currencyOptions(targetCurrency)}
          </select>
        </label>

        <div class="sheet-note">
          <strong>Quelle: Frankfurter API mit ECB-Provider</strong>
          <span>Die App fragt online nur dieses Währungspaar ab. Miete, Namen und Aufenthalte werden nicht übertragen.</span>
          ${rates
            ? `<span>Aktueller Kurs: ${escapeHtml(formatRateDate(rates.date))} · 1 ${escapeHtml(state.currency)} = ${escapeHtml(pairRate.toFixed(5))} ${escapeHtml(targetCurrency)}</span>`
            : `<span>Noch kein Livekurs für ${escapeHtml(state.currency)} nach ${escapeHtml(targetCurrency)} geladen.</span>`}
        </div>

        ${fxState.status ? `<p class="sheet-status" aria-live="polite">${escapeHtml(fxState.status)}</p>` : ""}

        <div class="sheet-actions">
          <button class="ghost-button" type="button" data-action="refresh-ecb-rates" ${fxState.isLoading ? "disabled" : ""}>Livekurs laden</button>
          <button class="primary-button" type="button" data-action="convert-currency" ${fxState.isLoading ? "disabled" : ""}>
            ${fxState.isLoading ? "Lädt..." : "Umrechnen"}
          </button>
        </div>
      </div>
    `;
  }

  function renderInstallSheet() {
    const platform = installPlatform();
    const nativeInstallAvailable = Boolean(installPrompt);
    const isIos = platform === "ios";
    const title = isIos ? "Als App nutzen" : "HouseSplit installieren";
    const body = nativeInstallAvailable
      ? "Installiere HouseSplit als App auf diesem Gerät. Danach öffnet es ohne Browser-Leiste und funktioniert nach dem ersten Laden offline."
      : isIos
        ? "iOS erlaubt keinen direkten Install-Klick aus Webseiten. Öffne diese Seite in Safari und füge sie über das Teilen-Menü zum Home-Bildschirm hinzu."
        : "Wenn dein Browser die Installation anbietet, findest du sie im Browser-Menü unter App installieren oder Zum Startbildschirm hinzufügen.";

    return `
      ${renderSheetHeader(title, "PWA")}
      <div class="sheet-body">
        <div class="install-card">
          <span class="install-icon" aria-hidden="true">H</span>
          <div>
            <strong>HouseSplit</strong>
            <span>${escapeHtml(body)}</span>
          </div>
        </div>

        ${isIos
          ? `<ol class="install-steps">
              <li>In Safari öffnen.</li>
              <li>Teilen-Button antippen.</li>
              <li>Zum Home-Bildschirm wählen.</li>
            </ol>`
          : ""}

        <div class="sheet-actions">
          <button class="ghost-button" type="button" data-action="dismiss-install-promo">Später</button>
          ${nativeInstallAvailable
            ? `<button class="primary-button" type="button" data-action="install-app">App installieren</button>`
            : `<button class="primary-button" type="button" data-action="dismiss-install-promo">Verstanden</button>`}
        </div>
      </div>
    `;
  }

  function renderPersonSheet(calculation) {
    const person = findPerson(sheetState.personId);
    if (!person) return "";

    const total = totalsById(calculation).get(person.id);
    const bounds = monthBounds(state);
    const payment = personPaymentInfo(person, total.totalCents);

    return `
      ${renderSheetHeader(person.name, "Person")}
      <div class="sheet-body" data-person-id="${escapeHtml(person.id)}">
        <div class="control-grid">
          <label class="field">
            <span>Name</span>
            <input data-field="person-name" type="text" autocomplete="name" value="${escapeHtml(person.name)}">
          </label>

          <label class="field">
            <span>Zahlt in</span>
            <select data-field="person-currency">
              ${currencyOptions(personPayCurrency(person))}
            </select>
          </label>
        </div>

        <div class="sheet-stat-grid">
          <div>
            <span>Zahlbetrag</span>
            <strong>${escapeHtml(payment.convertedText || payment.baseText)}</strong>
          </div>
          <div>
            <span>Basis</span>
            <strong>${money(total.totalCents)}</strong>
          </div>
          <div>
            <span>Anwesend</span>
            <strong>${total.nightsPresent} ${nightWord(total.nightsPresent)}</strong>
          </div>
          <div>
            <span>Allein</span>
            <strong>${total.soloNights}</strong>
          </div>
          <div>
            <span>Geteilt</span>
            <strong>${total.sharedNights}</strong>
          </div>
        </div>

        ${personPayCurrency(person) !== state.currency
          ? `<p class="sheet-status" aria-live="polite">${escapeHtml(payment.statusText)} · ${fxState.peopleStatus || "Livekurs wird automatisch geladen."}</p>`
          : ""}

        <div class="sheet-section-head">
          <div>
            <h3>Aufenthalte</h3>
            <p>Anreise zählt als Nacht, Abreise nicht.</p>
          </div>
          <button class="secondary-button" type="button" data-action="add-stay">Aufenthalt</button>
        </div>

        <div class="stays">
          ${person.stays.length > 0
            ? person.stays.map((stay) => renderStayRow(person, stay, bounds)).join("")
            : `<div class="empty-state">
                <strong>Keine Nächte eingetragen</strong>
                <span>Füge einen Aufenthalt hinzu oder wähle den ganzen Monat.</span>
              </div>`}
        </div>

        <div class="sheet-actions split">
          <button class="ghost-button" type="button" data-action="full-month">Ganzer Monat</button>
          <button class="ghost-button danger-text" type="button" data-action="remove-person">Person löschen</button>
        </div>
      </div>
    `;
  }

  function renderAddPersonSheet() {
    const existingNames = new Set(state.people.map((person) => person.name.trim().toLocaleLowerCase()));
    const savedNames = peopleLibrary.filter((name) => !existingNames.has(name.toLocaleLowerCase()));

    return `
      ${renderSheetHeader("Person hinzufügen", "Bewohner")}
      <div class="sheet-body">
        <label class="field">
          <span>Name</span>
          <input class="new-person-input" type="text" autocomplete="name" placeholder="Name">
        </label>

        ${savedNames.length
          ? `<div class="saved-people">
              <h3>Gespeicherte Personen</h3>
              <div>
                ${savedNames
                  .map(
                    (name) =>
                      `<button class="saved-person-chip" type="button" data-action="use-saved-person" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`,
                  )
                  .join("")}
              </div>
            </div>`
          : `<div class="empty-state">
              <strong>Noch keine gespeicherten Personen</strong>
              <span>Namen werden automatisch lokal gemerkt, sobald du sie nutzt.</span>
            </div>`}

        <div class="sheet-actions">
          <button class="ghost-button" type="button" data-action="close-sheet">Abbrechen</button>
          <button class="primary-button" type="button" data-action="create-person">Hinzufügen</button>
        </div>
      </div>
    `;
  }

  function renderShareSheet(calculation) {
    const shareText = buildShareText(calculation);

    return `
      ${renderSheetHeader("Zusammenfassung", "Teilen")}
      <div class="sheet-body">
        <label class="field share-field">
          <span>Text für Chat oder Notizen</span>
          <textarea readonly rows="10">${escapeHtml(shareText)}</textarea>
        </label>
        <div class="sheet-actions">
          <button class="secondary-button" type="button" data-action="copy">Kopieren</button>
          <button class="primary-button" type="button" data-action="native-share">System teilen</button>
        </div>
      </div>
    `;
  }

  function renderSheet(calculation) {
    if (!sheetState.type) return "";

    let content = "";
    if (sheetState.type === "settings") content = renderSettingsSheet(calculation);
    if (sheetState.type === "currency") content = renderCurrencySheet();
    if (sheetState.type === "install") content = renderInstallSheet();
    if (sheetState.type === "person") content = renderPersonSheet(calculation);
    if (sheetState.type === "add-person") content = renderAddPersonSheet();
    if (sheetState.type === "share") content = renderShareSheet(calculation);
    if (!content) return "";

    return `
      <div class="sheet-layer" role="presentation">
        <button class="sheet-backdrop" type="button" data-action="close-sheet" aria-label="Dialog schließen"></button>
        <section class="sheet-panel" role="dialog" aria-modal="true">
          <span class="sheet-handle" aria-hidden="true"></span>
          ${content}
        </section>
      </div>
    `;
  }

  function renderToast() {
    if (!toastState.message) return "";

    return `
      <div class="toast" role="status" aria-live="polite">
        <span>${escapeHtml(toastState.message)}</span>
        ${toastState.actionLabel
          ? `<button type="button" data-action="toast-action">${escapeHtml(toastState.actionLabel)}</button>`
          : ""}
      </div>
    `;
  }

  function render() {
    const calculation = calculateRentShare({
      ...state,
      emptyNightPolicy: state.emptyNightPolicy,
    });

    root.innerHTML = `
      ${renderAppTopbar()}
      ${renderHero(calculation)}
      <main id="main-content">
        ${renderSummary(calculation)}
        <div id="entry" class="workspace app-section">
          <div class="workspace-main">
            ${renderControls(calculation)}
            ${renderPeople(calculation)}
          </div>
          <div class="workspace-side">
            ${renderNightBreakdown(calculation)}
          </div>
        </div>
      </main>
      ${renderToast()}
      ${renderSheet(calculation)}
      <nav class="bottom-tabs" aria-label="App-Bereiche">
        <a class="is-active" href="#result" aria-current="page">
          <span class="tab-icon tab-result" aria-hidden="true"></span>
          <span>Ergebnis</span>
        </a>
        <a href="#entry">
          <span class="tab-icon tab-entry" aria-hidden="true"></span>
          <span>Personen</span>
        </a>
        <a href="#plan">
          <span class="tab-icon tab-plan" aria-hidden="true"></span>
          <span>Plan</span>
        </a>
      </nav>
    `;
    syncBottomTabs();
    schedulePersonRateLoad();
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
      fxState.targetCurrency = state.currency === "EUR" ? "USD" : "EUR";
      fxState.rates = null;
      fxState.peopleRates = loadCachedFrankfurterRates(state.currency);
      return true;
    }

    if (field === "emptyNightPolicy") {
      state.emptyNightPolicy = target.value;
      return true;
    }

    if (field === "fx-target-currency") {
      fxState.targetCurrency = target.value;
      return true;
    }

    const personElement = target.closest("[data-person-id]");
    const person = personElement ? findPerson(personElement.dataset.personId) : null;

    if (field === "person-name" && person) {
      person.name = target.value;
      return true;
    }

    if (field === "person-currency" && person) {
      person.payCurrency = normalizeCurrencyCode(target.value, state.currency);
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

  function addPerson(name, payCurrency) {
    const trimmed = typeof name === "string" ? name.trim() : "";
    const nextName = trimmed || `Person ${state.people.length + 1}`;
    const person = {
      id: createId("person"),
      name: nextName,
      payCurrency: normalizeCurrencyCode(payCurrency, state.currency),
      stays: [],
    };

    state.people.push(person);
    rememberPersonName(nextName);
    return person;
  }

  function removePerson(personId) {
    const index = state.people.findIndex((person) => person.id === personId);
    if (index === -1) return;

    const [removed] = state.people.splice(index, 1);
    closeSheet();
    showToast(`${removed.name} gelöscht`, {
      actionLabel: "Rückgängig",
      onAction: () => {
        state.people.splice(Math.min(index, state.people.length), 0, removed);
      },
    });
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
    const index = person.stays.findIndex((stay) => stay.id === stayId);
    if (index === -1) return;

    const [removed] = person.stays.splice(index, 1);
    showToast("Aufenthalt gelöscht", {
      actionLabel: "Rückgängig",
      onAction: () => {
        const latestPerson = findPerson(person.id);
        if (latestPerson) latestPerson.stays.splice(Math.min(index, latestPerson.stays.length), 0, removed);
      },
    });
  }

  async function copyShareText() {
    const calculation = calculateRentShare({
      ...state,
      emptyNightPolicy: state.emptyNightPolicy,
    });
    const text = buildShareText(calculation);

    try {
      await navigator.clipboard.writeText(text);
      showToast("Zusammenfassung kopiert");
      render();
    } catch (error) {
      const textarea = document.querySelector(".share-field textarea");
      if (textarea) {
        textarea.focus();
        textarea.select();
        const copied = document.execCommand && document.execCommand("copy");
        showToast(copied ? "Zusammenfassung kopiert" : "Text ist markiert");
        render();
        return;
      }
      showToast("Kopieren nicht möglich");
      render();
    }
  }

  async function nativeShare() {
    const calculation = calculateRentShare({
      ...state,
      emptyNightPolicy: state.emptyNightPolicy,
    });
    const text = buildShareText(calculation);

    if (!navigator.share) {
      await copyShareText();
      return;
    }

    try {
      await navigator.share({
        title: "HouseSplit Abrechnung",
        text,
      });
      showToast("Teilen geöffnet");
      render();
    } catch (error) {
      showToast("Teilen abgebrochen");
      render();
    }
  }

  async function installApp() {
    if (!installPrompt) {
      openSheet("install");
      render();
      return;
    }

    const prompt = installPrompt;
    installPrompt = null;
    dismissInstallPromo();
    prompt.prompt();
    try {
      const result = await prompt.userChoice;
      if (result && result.outcome === "accepted") {
        isStandalone = true;
        showToast("HouseSplit installiert");
      }
    } catch (error) {
      showToast("Installation nicht möglich");
    }
    render();
  }

  root.addEventListener("input", (event) => {
    if (updateField(event.target)) saveState();
  });

  root.addEventListener("change", (event) => {
    if (updateField(event.target)) {
      render();
      if (event.target.dataset.field === "fx-target-currency") {
        loadEcbRates(state.currency, fxState.targetCurrency);
        return;
      }
      saveState();
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

    if (action === "toast-action") {
      if (toastState.onAction) toastState.onAction();
      clearToast();
      saveState();
      render();
      return;
    }

    if (action === "open-settings") {
      openSheet("settings");
      render();
      focusSheet();
      return;
    }

    if (action === "open-currency-converter") {
      fxState.targetCurrency = state.currency === "EUR" ? "USD" : "EUR";
      openSheet("currency");
      render();
      focusSheet();
      loadEcbRates(state.currency, fxState.targetCurrency);
      return;
    }

    if (action === "refresh-ecb-rates") {
      loadEcbRates(state.currency, fxState.targetCurrency || "EUR");
      return;
    }

    if (action === "convert-currency") {
      convertWithEcbRates();
      return;
    }

    if (action === "open-share") {
      openSheet("share");
      render();
      focusSheet();
      return;
    }

    if (action === "open-add-person" || action === "add-person") {
      openSheet("add-person");
      render();
      focusSheet();
      return;
    }

    if (action === "open-person" && person) {
      openSheet("person", { personId: person.id });
      render();
      focusSheet();
      return;
    }

    if (action === "close-sheet") {
      if (sheetState.type === "install") dismissInstallPromo();
      closeSheet();
      render();
      return;
    }

    if (action === "dismiss-install-promo") {
      dismissInstallPromo();
      closeSheet();
      render();
      return;
    }

    if (action === "create-person") {
      const input = document.querySelector(".new-person-input");
      const created = addPerson(input ? input.value : "");
      closeSheet();
      openSheet("person", { personId: created.id });
    }

    if (action === "use-saved-person") {
      const created = addPerson(button.dataset.name || "");
      closeSheet();
      openSheet("person", { personId: created.id });
    }

    if (action === "remove-person" && person) removePerson(person.id);
    if (action === "add-stay" && person) {
      addStay(person);
      openSheet("person", { personId: person.id });
    }
    if (action === "full-month" && person) fullMonth(person);
    if (action === "remove-stay" && person && stayElement) {
      removeStay(person, stayElement.dataset.stayId);
    }
    if (action === "reset") {
      const previousState = JSON.parse(JSON.stringify(state));
      state = defaultState();
      fxState.peopleRates = loadCachedFrankfurterRates(state.currency);
      closeSheet();
      showToast("Abrechnung zurückgesetzt", {
        actionLabel: "Rückgängig",
        onAction: () => {
          state = sanitizeState(previousState);
          fxState.peopleRates = loadCachedFrankfurterRates(state.currency);
        },
      });
    }
    if (action === "copy") {
      copyShareText();
      return;
    }
    if (action === "native-share") {
      nativeShare();
      return;
    }
    if (action === "install-app") {
      installApp();
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

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    render();
    scheduleInstallPromo(500);
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    isStandalone = true;
    showToast("HouseSplit installiert");
    render();
  });

  window.addEventListener("online", () => {
    isOnline = true;
    render();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    showToast("Offline bereit");
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sheetState.type) {
      closeSheet();
      render();
    }
  });

  window.addEventListener("scroll", syncBottomTabs, { passive: true });
  window.addEventListener("hashchange", () => {
    const activeId = window.location.hash.replace("#", "");
    if (activeId) updateBottomTabs(activeId);
  });

  render();
  scheduleInstallPromo(1400);
})();
