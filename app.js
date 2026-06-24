(function () {
  "use strict";

  const {
    addDaysISO,
    calculateRentShare,
    daysInMonth,
    formatISODate,
    formatISOFromDay,
    formatMoney,
    nextMonthStartISO,
    parseISODate,
  } = window.RentShareCalculator;

  const STORAGE_KEY = "house-share-calculator:nights:v2";
  const APARTMENTS_STORAGE_KEY = "house-share-calculator:apartments:v1";
  const PEOPLE_LIBRARY_KEY = "house-share-calculator:people-library:v1";
  const PREFERENCES_STORAGE_KEY = "house-share-calculator:preferences:v1";
  const ECB_RATES_STORAGE_KEY = "house-share-calculator:frankfurter-ecb-rate:v2";
  const ECB_RATE_SET_STORAGE_KEY = "house-share-calculator:frankfurter-ecb-rates:v3";
  const INSTALL_PROMO_KEY = "house-share-calculator:install-promo:v1";
  const FRANKFURTER_RATES_URL = "https://api.frankfurter.dev/v2/rates";
  const FRANKFURTER_PROVIDER = "ECB";
  const MAX_APARTMENTS = 30;
  const MAX_HISTORY_ENTRIES = 10;
  const AUTO_HISTORY_INTERVAL_MS = 5 * 60 * 1000;
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
  const LANGUAGE_CODES = ["de", "en"];
  const APPEARANCE_MODES = ["system", "light", "dark"];
  const CONTRAST_MODES = ["standard", "high"];
  const TRANSPARENCY_MODES = ["glass", "solid"];
  const UI_TEXT = {
    de: {
      appOpenResult: "HouseSplit Ergebnis öffnen",
      apartment: "Apartment",
      apartmentActive: "Aktiv",
      apartmentCreated: "{name} angelegt",
      apartmentOpened: "{name} geöffnet",
      apartmentSaved: "Gespeichert {date}",
      apartments: "Wohnungen",
      apartmentsAndHistory: "Wohnungen & Verlauf",
      apartmentsAndHistoryOpen: "Wohnungen und Verlauf öffnen",
      apartmentsOpen: "Wohnungen öffnen",
      appInstall: "App installieren",
      appInstalled: "HouseSplit installiert",
      appInstallable: "Installierbar",
      appInstallHelp: "Installationshilfe",
      appAreas: "App-Bereiche",
      appUse: "Als App nutzen",
      appUseBody: "Installationshinweise für iPhone, Android und Desktop öffnen.",
      arrival: "Anreise",
      arrivalCounts: "Anreise zählt als Nacht, Abreise nicht.",
      base: "Basis",
      billingDetails: "Abrechnungsdetails",
      cancel: "Abbrechen",
      checkout: "Abreise",
      close: "Schließen",
      collapseSolid: "Deckend",
      contrast: "Kontrast",
      contrastHigh: "Hoch",
      contrastStandard: "Normal",
      copied: "Zusammenfassung kopiert",
      copy: "Kopieren",
      copyUnavailable: "Kopieren nicht möglich",
      createCopy: "Kopie erstellen",
      convertedTo: "In {currency} umgerechnet",
      currency: "Währung",
      currencyConvert: "Währung umrechnen",
      currencyConvertBody: "Ändert die Monatsmiete selbst in eine andere Währung.",
      currencyConvertRent: "Miete umrechnen",
      currencyConvertedStatus: "{oldAmount} {oldCurrency} wurden mit dem Livekurs vom {date} zu {newAmount} {newCurrency} umgerechnet.",
      currencyCurrentRent: "Aktuelle Miete",
      currencyLiveLoad: "Livekurs laden",
      currencyMissingLive: "Noch kein Livekurs für {source} nach {target} geladen.",
      currencyPairUnsupported: "{source} oder {target} ist im Frankfurter/EZB-Feed nicht verfügbar.",
      currencyRateCurrent: "Aktueller Kurs: {date} · 1 {source} = {rate} {target}",
      currencyRatesCached: "Offline genutzt: letzter Kurs vom {date}.",
      currencyRatesFail: "Zahlungswährungen konnten nicht geladen werden.",
      currencyRatesLoaded: "Zahlungswährungen vom {date} geladen.",
      currencyRatesLoading: "Zahlungswährungen werden geladen...",
      currencyRateStatusCached: "Offline genutzt: letzter Frankfurter/EZB-Kurs vom {date}.",
      currencyRateStatusFailed: "Frankfurter/EZB-Livekurs konnte nicht geladen werden.",
      currencyRateStatusIdentity: "Quelle und Ziel sind identisch. Es ist keine Umrechnung nötig.",
      currencyRateStatusLoaded: "Frankfurter/EZB-Livekurs vom {date} geladen.",
      currencyRateStatusLoading: "Frankfurter/EZB-Livekurs wird geladen...",
      currencySource: "Quelle: Frankfurter API mit ECB-Provider",
      currencySourceBody: "Die App fragt online nur dieses Währungspaar ab. Miete, Namen und Aufenthalte werden nicht übertragen.",
      currencyTarget: "Zielwährung",
      dark: "Dunkel",
      deletedStay: "Aufenthalt gelöscht",
      deleteStay: "Aufenthalt löschen",
      deletePerson: "Person löschen",
      dialogClose: "Dialog schließen",
      done: "Fertig",
      duplicateSuffix: "Kopie",
      edit: "Bearbeiten",
      empty: "Leer",
      emptyNightsShort: "{count} leer",
      emptySeparate: "Separat anzeigen",
      emptySplitAll: "Auf alle Personen verteilen",
      emptyStay: "Keine Nächte eingetragen",
      emptyStayHint: "Füge einen Aufenthalt hinzu oder wähle den ganzen Monat.",
      enter: "Eintragen",
      firstHalf: "Erste Hälfte",
      fromAmount: "von {amount}",
      fullMonth: "Ganzer Monat",
      gotIt: "Verstanden",
      highContrast: "Hoher Kontrast",
      history: "Verlauf",
      historyAuto: "Automatische Sicherung",
      historyBeforeCopy: "Vor Kopie",
      historyBeforeDelete: "Vor dem Löschen",
      historyBeforeNewApartment: "Vor neuem Apartment",
      historyBeforeReset: "Vor dem Zurücksetzen",
      historyBeforeRestore: "Vor Wiederherstellung",
      historyBeforeSwitch: "Vor Wohnungswechsel",
      historyEmpty: "Noch keine Sicherung",
      historyEmptyHint: "Tippe auf „Jetzt sichern“ oder ändere Daten, dann entsteht automatisch ein Verlauf.",
      historyLatest: "Die letzten {count} Sicherungen der aktiven Wohnung.",
      historyManual: "Manuelle Sicherung",
      historySaved: "Sicherung gespeichert",
      historySavedAlready: "Schon gesichert",
      historyRestored: "Sicherung wiederhergestellt",
      heroLede: "Mobile Abrechnung für WG, Ferienhaus und Freunde. Personen bleiben lokal gespeichert.",
      heroTitle: "Miete nach Nächten teilen",
      install: "Installieren",
      installBody: "Installiere HouseSplit als App auf diesem Gerät. Danach öffnet es ohne Browser-Leiste und funktioniert nach dem ersten Laden offline.",
      installBrowserBody: "Wenn dein Browser die Installation anbietet, findest du sie im Browser-Menü unter App installieren oder Zum Startbildschirm hinzufügen.",
      installImpossible: "Installation nicht möglich",
      installIosBody: "iOS erlaubt keinen direkten Install-Klick aus Webseiten. Öffne diese Seite in Safari und füge sie über das Teilen-Menü zum Home-Bildschirm hinzu.",
      installIosStep1: "In Safari öffnen.",
      installIosStep2: "Teilen-Button antippen.",
      installIosStep3: "Zum Home-Bildschirm wählen.",
      installed: "Installiert",
      language: "Sprache",
      languageGerman: "Deutsch",
      languageEnglish: "English",
      later: "Später",
      light: "Hell",
      liquidGlass: "Liquid Glass",
      liveRateUnavailable: "Livekurs nicht verfügbar",
      liveRateAuto: "Livekurs wird automatisch geladen.",
      liveRateFrom: "Livekurs vom {date}.",
      loading: "Lädt...",
      localSaved: "Lokal gespeichert",
      lookAndFeel: "Darstellung & Sprache",
      lookAndFeelBody: "Theme, Kontrast, Transparenz und Sprache gelten sofort auf diesem Gerät.",
      month: "Monat",
      monthlyOverview: "Monatsübersicht",
      monthlyData: "Monatsdaten",
      monthlyRent: "Miete",
      mode: "Modus",
      multipleApartmentsBody: "Mehrere Apartments lokal speichern und Sicherungen wiederherstellen.",
      name: "Name",
      newApartment: "Neues Apartment",
      newVersionAvailable: "Neue Version verfügbar",
      newPerson: "Neue Person",
      nightSingular: "Nacht",
      nightPlural: "Nächte",
      nightsAdd: "Nächte hinzufügen",
      nightsAddFor: "Nächte für {name} hinzufügen",
      nightPlan: "Nachtplan",
      noSavedPeople: "Noch keine gespeicherten Personen",
      noSavedPeopleHint: "Namen werden automatisch lokal gemerkt, sobald du sie nutzt.",
      occupancy: "Aufteilung",
      occupiedEmptyAverage: "{occupied} belegt · {empty} leer · ca. {amount} pro Nacht",
      offlineReady: "Offline bereit",
      open: "Öffnen",
      openPerson: "Person öffnen",
      openPersonNamed: "{name} öffnen",
      paidIn: "Zahlt in {currency}",
      payIn: "Zahlt in",
      paymentAmount: "Zahlbetrag",
      people: "Personen",
      peopleKicker: "Bewohner",
      person: "Person",
      personAdd: "Person hinzufügen",
      personCount: "{count} Personen",
      personCountOne: "1 Person",
      personDeleteConfirm: "Jetzt wirklich löschen",
      personDeleted: "{name} gelöscht",
      personRemove: "{name} entfernen",
      personRemoveVisible: "Entfernen",
      personReallyRemoveVisible: "Wirklich entfernen",
      personSectionNote: "Kurzansicht hier, Details im Sheet.",
      personRequired: "Mindestens eine Person bleibt nötig",
      perNight: "pro Nacht",
      period: "Zeitraum",
      preferences: "Einstellungen",
      privacyLocal: "Alle Daten bleiben lokal auf diesem Gerät. Beim Bearbeiten entstehen automatisch Sicherungen, zusätzlich kannst du manuell sichern.",
      readyShare: "Bereit zum Teilen",
      reducedTransparency: "Reduzierte Transparenz",
      reload: "Neu laden",
      reset: "Zurücksetzen",
      resetArmed: "Jetzt wirklich zurücksetzen",
      resetDone: "Abrechnung zurückgesetzt",
      resetPrompt: "Zum Zurücksetzen erneut tippen",
      restore: "Wiederherstellen",
      result: "Ergebnis",
      rules: "Regeln",
      savedApartments: "Gespeicherte Apartments",
      savedPeople: "Gespeicherte Personen",
      saveNow: "Jetzt sichern",
      secondHalf: "Zweite Hälfte",
      separateAmount: "Separat: {amount}",
      separately: "Separat",
      setup: "Setup",
      setupOpen: "Setup öffnen",
      share: "Teilen",
      shareBillTitle: "HouseSplit Abrechnung",
      shareBlocked: "Teilen gesperrt",
      shareBlockedReason: "Teilen ist gesperrt, weil die Abrechnung noch unvollständig ist",
      shareCancelled: "Teilen abgebrochen",
      shareOpened: "Teilen geöffnet",
      shareBaseLine: "Basis: {nights} · {rule}",
      sharePays: "Zahlt {amount}",
      shareReadyGuard: "Erst prüfen: {title}",
      shareRentLine: "Hausmiete {month}: {amount}",
      shareRatesSummary: "Zahlungswährungen: Frankfurter/ECB Livekurs vom {date} · {rates}",
      shareSharesHeading: "Anteile:",
      shareSystem: "System teilen",
      shareText: "Text für Chat oder Notizen",
      shareToClipboard: "In Zwischenablage",
      shared: "geteilt",
      sheetStorage: "Speicher",
      solidSurfaces: "Deckende Flächen",
      solo: "allein",
      splitSummary: "Summe verteilt: {amount}",
      splitTotal: "verteilt",
      statusCheck: "Aufenthalt prüfen",
      statusLoad: "Laden",
      statusLoading: "Lädt",
      statusMissingCurrencyRates: "Kurse fehlen",
      statusMissingRent: "Miete fehlt",
      statusMissingRentDetail: "Monatsmiete eintragen.",
      statusMissingStays: "Aufenthalte fehlen",
      statusMissingStaysDetail: "Nächte eintragen.",
      statusNoPeople: "Keine Personen",
      statusNoPeopleDetail: "Person hinzufügen.",
      statusRatesLoading: "Kurse laden",
      statusVacancyOpen: "Leerstand offen",
      stayIncomplete: "Unvollständig",
      stayPlural: "Aufenthalte",
      staySingular: "Aufenthalt",
      storageSwitchHint: "Wechseln überschreibt nichts, sondern öffnet den gespeicherten Stand.",
      tapDeleteAgain: "Zum Löschen erneut tippen",
      textMarked: "Text ist markiert",
      theme: "Modus",
      themeSystem: "System",
      undo: "Rückgängig",
      vacancy: "Leerstand",
      vacancySeparate: "Leerstand separat",
      vacancySplit: "Leerstand verteilt",
      vacancyUnassigned: "nicht Personen zugeordnet",
      vacancyOpenSetup: "Öffne Setup, um Leerstand auf alle Personen zu verteilen.",
      visualMode: "Darstellung",
      withoutNights: "{count} ohne Nächte",
    },
    en: {
      appOpenResult: "Open HouseSplit result",
      apartment: "Apartment",
      apartmentActive: "Active",
      apartmentCreated: "{name} created",
      apartmentOpened: "{name} opened",
      apartmentSaved: "Saved {date}",
      apartments: "Homes",
      apartmentsAndHistory: "Homes & History",
      apartmentsAndHistoryOpen: "Open homes and history",
      apartmentsOpen: "Open homes",
      appInstall: "Install app",
      appInstalled: "HouseSplit installed",
      appInstallable: "Installable",
      appInstallHelp: "Install help",
      appAreas: "App areas",
      appUse: "Use as an app",
      appUseBody: "Open install instructions for iPhone, Android, and desktop.",
      arrival: "Arrival",
      arrivalCounts: "Arrival counts as a night, checkout does not.",
      base: "Base",
      billingDetails: "Billing details",
      cancel: "Cancel",
      checkout: "Checkout",
      close: "Close",
      collapseSolid: "Solid",
      contrast: "Contrast",
      contrastHigh: "High",
      contrastStandard: "Standard",
      copied: "Summary copied",
      copy: "Copy",
      copyUnavailable: "Copy unavailable",
      createCopy: "Create copy",
      convertedTo: "Converted to {currency}",
      currency: "Currency",
      currencyConvert: "Convert currency",
      currencyConvertBody: "Changes the monthly rent itself into another currency.",
      currencyConvertRent: "Convert rent",
      currencyConvertedStatus: "{oldAmount} {oldCurrency} was converted with the live rate from {date} to {newAmount} {newCurrency}.",
      currencyCurrentRent: "Current rent",
      currencyLiveLoad: "Load live rate",
      currencyMissingLive: "No live rate loaded for {source} to {target} yet.",
      currencyPairUnsupported: "{source} or {target} is not available in the Frankfurter/ECB feed.",
      currencyRateCurrent: "Current rate: {date} · 1 {source} = {rate} {target}",
      currencyRatesCached: "Offline used: latest rate from {date}.",
      currencyRatesFail: "Payment currencies could not be loaded.",
      currencyRatesLoaded: "Payment currencies loaded from {date}.",
      currencyRatesLoading: "Loading payment currencies...",
      currencyRateStatusCached: "Offline used: latest Frankfurter/ECB rate from {date}.",
      currencyRateStatusFailed: "Frankfurter/ECB live rate could not be loaded.",
      currencyRateStatusIdentity: "Source and target are identical. No conversion is needed.",
      currencyRateStatusLoaded: "Frankfurter/ECB live rate from {date} loaded.",
      currencyRateStatusLoading: "Loading Frankfurter/ECB live rate...",
      currencySource: "Source: Frankfurter API with ECB provider",
      currencySourceBody: "The app only requests this currency pair online. Rent, names, and stays are not transmitted.",
      currencyTarget: "Target currency",
      dark: "Dark",
      deletedStay: "Stay deleted",
      deleteStay: "Delete stay",
      deletePerson: "Delete person",
      dialogClose: "Close dialog",
      done: "Done",
      duplicateSuffix: "Copy",
      edit: "Edit",
      empty: "Empty",
      emptyNightsShort: "{count} empty",
      emptySeparate: "Show separately",
      emptySplitAll: "Split across all people",
      emptyStay: "No nights entered",
      emptyStayHint: "Add a stay or choose the full month.",
      enter: "Enter",
      firstHalf: "First half",
      fromAmount: "of {amount}",
      fullMonth: "Full month",
      gotIt: "Got it",
      highContrast: "High contrast",
      history: "History",
      historyAuto: "Automatic backup",
      historyBeforeCopy: "Before copy",
      historyBeforeDelete: "Before deletion",
      historyBeforeNewApartment: "Before new apartment",
      historyBeforeReset: "Before reset",
      historyBeforeRestore: "Before restore",
      historyBeforeSwitch: "Before switching home",
      historyEmpty: "No backup yet",
      historyEmptyHint: "Tap “Save now” or edit data to create automatic history.",
      historyLatest: "The latest {count} backups for the active home.",
      historyManual: "Manual backup",
      historySaved: "Backup saved",
      historySavedAlready: "Already saved",
      historyRestored: "Backup restored",
      heroLede: "Mobile billing for flatshares, vacation homes, and friends. People stay saved locally.",
      heroTitle: "Split rent by nights",
      install: "Install",
      installBody: "Install HouseSplit as an app on this device. It opens without browser chrome and works offline after the first load.",
      installBrowserBody: "If your browser offers installation, find it in the browser menu under Install app or Add to home screen.",
      installImpossible: "Installation unavailable",
      installIosBody: "iOS does not allow a direct install click from websites. Open this page in Safari and add it to the Home Screen from the Share menu.",
      installIosStep1: "Open in Safari.",
      installIosStep2: "Tap the Share button.",
      installIosStep3: "Choose Add to Home Screen.",
      installed: "Installed",
      language: "Language",
      languageGerman: "Deutsch",
      languageEnglish: "English",
      later: "Later",
      light: "Light",
      liquidGlass: "Liquid Glass",
      liveRateUnavailable: "Live rate unavailable",
      liveRateAuto: "Live rate loads automatically.",
      liveRateFrom: "Live rate from {date}.",
      loading: "Loading...",
      localSaved: "Saved locally",
      lookAndFeel: "Appearance & Language",
      lookAndFeelBody: "Theme, contrast, transparency, and language apply immediately on this device.",
      month: "Month",
      monthlyOverview: "Month overview",
      monthlyData: "Monthly data",
      monthlyRent: "Rent",
      mode: "Mode",
      multipleApartmentsBody: "Save multiple homes locally and restore backups.",
      name: "Name",
      newApartment: "New home",
      newVersionAvailable: "New version available",
      newPerson: "New person",
      nightSingular: "night",
      nightPlural: "nights",
      nightsAdd: "Add nights",
      nightsAddFor: "Add nights for {name}",
      nightPlan: "Night plan",
      noSavedPeople: "No saved people yet",
      noSavedPeopleHint: "Names are remembered locally as soon as you use them.",
      occupancy: "Split",
      occupiedEmptyAverage: "{occupied} occupied · {empty} empty · about {amount} per night",
      offlineReady: "Offline ready",
      open: "Open",
      openPerson: "Open person",
      openPersonNamed: "Open {name}",
      paidIn: "Pays in {currency}",
      payIn: "Pays in",
      paymentAmount: "Payment amount",
      people: "People",
      peopleKicker: "Residents",
      person: "Person",
      personAdd: "Add person",
      personCount: "{count} people",
      personCountOne: "1 person",
      personDeleteConfirm: "Really delete now",
      personDeleted: "{name} deleted",
      personRemove: "Remove {name}",
      personRemoveVisible: "Remove",
      personReallyRemoveVisible: "Really remove",
      personSectionNote: "Quick view here, details in the sheet.",
      personRequired: "At least one person is required",
      perNight: "per night",
      period: "Period",
      preferences: "Settings",
      privacyLocal: "All data stays local on this device. Editing creates automatic backups, and you can also save manually.",
      readyShare: "Ready to share",
      reducedTransparency: "Reduced transparency",
      reload: "Reload",
      reset: "Reset",
      resetArmed: "Really reset now",
      resetDone: "Bill reset",
      resetPrompt: "Tap again to reset",
      restore: "Restore",
      result: "Result",
      rules: "Rules",
      savedApartments: "Saved homes",
      savedPeople: "Saved people",
      saveNow: "Save now",
      secondHalf: "Second half",
      separateAmount: "Separate: {amount}",
      separately: "Separate",
      setup: "Setup",
      setupOpen: "Open setup",
      share: "Share",
      shareBillTitle: "HouseSplit bill",
      shareBlocked: "Share locked",
      shareBlockedReason: "Sharing is locked because the bill is incomplete",
      shareCancelled: "Share cancelled",
      shareOpened: "Share opened",
      shareBaseLine: "Base: {nights} · {rule}",
      sharePays: "Pays {amount}",
      shareReadyGuard: "Check first: {title}",
      shareRentLine: "House rent {month}: {amount}",
      shareRatesSummary: "Payment currencies: Frankfurter/ECB live rate from {date} · {rates}",
      shareSharesHeading: "Shares:",
      shareSystem: "System share",
      shareText: "Text for chat or notes",
      shareToClipboard: "To clipboard",
      shared: "shared",
      sheetStorage: "Storage",
      solidSurfaces: "Solid surfaces",
      solo: "solo",
      splitSummary: "Total allocated: {amount}",
      splitTotal: "allocated",
      statusCheck: "Check stay",
      statusLoad: "Load",
      statusLoading: "Loading",
      statusMissingCurrencyRates: "Rates missing",
      statusMissingRent: "Rent missing",
      statusMissingRentDetail: "Enter monthly rent.",
      statusMissingStays: "Stays missing",
      statusMissingStaysDetail: "Enter nights.",
      statusNoPeople: "No people",
      statusNoPeopleDetail: "Add a person.",
      statusRatesLoading: "Loading rates",
      statusVacancyOpen: "Vacancy open",
      stayIncomplete: "Incomplete",
      stayPlural: "stays",
      staySingular: "stay",
      storageSwitchHint: "Switching does not overwrite anything. It opens the saved state.",
      tapDeleteAgain: "Tap again to delete",
      textMarked: "Text selected",
      theme: "Mode",
      themeSystem: "System",
      undo: "Undo",
      vacancy: "Vacancy",
      vacancySeparate: "Vacancy separate",
      vacancySplit: "Vacancy allocated",
      vacancyUnassigned: "not assigned to people",
      vacancyOpenSetup: "Open setup to split vacancy across all people.",
      visualMode: "Appearance",
      withoutNights: "{count} without nights",
    },
  };
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
  let resetArmedUntil = 0;
  let deletePersonArmedId = "";
  let deletePersonArmedUntil = 0;
  let installPrompt = null;
  let installPromoTimer = null;
  let isOnline = navigator.onLine;
  let isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  let tabSyncLockedUntil = 0;
  let pendingSheetFocus = "";
  let focusedStayId = "";

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeChoice(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function detectedLanguage() {
    const language = window.navigator.language || "";
    return language.toLocaleLowerCase().startsWith("en") ? "en" : "de";
  }

  function currentLanguage() {
    return normalizeChoice(state.language, LANGUAGE_CODES, "de");
  }

  function localeCode() {
    return currentLanguage() === "en" ? "en-US" : "de-DE";
  }

  function interpolate(template, values) {
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
      values && Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match,
    );
  }

  function t(key, values) {
    const pack = UI_TEXT[currentLanguage()] || UI_TEXT.de;
    const fallback = UI_TEXT.de[key] || key;
    return interpolate(pack[key] || fallback, values);
  }

  function optionHtml(value, label, selected) {
    return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function languageOptions(selected) {
    return [
      optionHtml("de", UI_TEXT.de.languageGerman, selected),
      optionHtml("en", UI_TEXT.de.languageEnglish, selected),
    ].join("");
  }

  function appearanceOptions(selected) {
    return [
      optionHtml("system", t("themeSystem"), selected),
      optionHtml("light", t("light"), selected),
      optionHtml("dark", t("dark"), selected),
    ].join("");
  }

  function contrastOptions(selected) {
    return [
      optionHtml("standard", t("contrastStandard"), selected),
      optionHtml("high", t("contrastHigh"), selected),
    ].join("");
  }

  function transparencyOptions(selected) {
    return [
      optionHtml("glass", t("liquidGlass"), selected),
      optionHtml("solid", t("solidSurfaces"), selected),
    ].join("");
  }

  function effectiveTheme() {
    if (state.appearance === "light" || state.appearance === "dark") return state.appearance;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyPreferences() {
    const theme = effectiveTheme();
    const html = document.documentElement;
    html.lang = currentLanguage();
    html.dataset.theme = theme;
    html.dataset.appearance = state.appearance;
    html.dataset.contrast = state.contrast;
    html.dataset.transparency = state.transparency;
    html.style.colorScheme = theme;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute("content", state.contrast === "high" ? "#000000" : theme === "dark" ? "#08111f" : "#172554");
    }
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

  function parseRentInput(value) {
    const text = String(value || "").trim();
    if (!text) return 0;
    const compact = text.replace(/\s/g, "");
    const lastComma = compact.lastIndexOf(",");
    const lastDot = compact.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const normalized =
      lastComma !== -1 && lastDot !== -1
        ? compact
            .replace(decimalSeparator === "," ? /\./g : /,/g, "")
            .replace(decimalSeparator, ".")
        : compact.includes(",")
          ? compact.replace(",", ".")
          : compact;
    const amount = Number(normalized);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
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

  function defaultApartmentName(index) {
    return `Apartment ${index || 1}`;
  }

  function normalizeApartmentName(value, fallback) {
    const text = typeof value === "string" ? value.trim() : "";
    return text || fallback || defaultApartmentName(1);
  }

  function defaultState(apartmentName) {
    const base = currentYearMonth();
    const bounds = monthBounds(base);
    const preferences = defaultPreferences();

    return {
      apartmentName: normalizeApartmentName(apartmentName, defaultApartmentName(1)),
      rent: 2000,
      currency: "EUR",
      year: base.year,
      month: base.month,
      emptyNightPolicy: "unassigned",
      ...preferences,
      people: [
        {
          id: createId("person"),
          name: "Person 1",
          payCurrency: "EUR",
          stays: [{ id: createId("stay"), start: bounds.start, end: bounds.checkout }],
        },
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
      apartmentName: normalizeApartmentName(state.apartmentName, fallback.apartmentName),
      rent: Number.isFinite(Number(state.rent)) ? Number(state.rent) : fallback.rent,
      currency: normalizeCurrencyCode(state.currency, "USD"),
      year: Math.min(Math.max(year, 1900), 2200),
      month: Math.min(Math.max(month, 1), 12),
      emptyNightPolicy,
      language: normalizeChoice(state.language, LANGUAGE_CODES, fallback.language),
      appearance: normalizeChoice(state.appearance, APPEARANCE_MODES, fallback.appearance),
      contrast: normalizeChoice(state.contrast, CONTRAST_MODES, fallback.contrast),
      transparency: normalizeChoice(state.transparency, TRANSPARENCY_MODES, fallback.transparency),
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

  function loadLegacyState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return sanitizeState(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function cleanStateForApartment(value, name) {
    const nextState = sanitizeState(value);
    nextState.apartmentName = normalizeApartmentName(name || nextState.apartmentName, nextState.apartmentName);
    return nextState;
  }

  function validIsoDateTime(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function normalizeHistoryEntry(entry, apartmentName) {
    if (!entry || typeof entry !== "object") return null;
    return {
      id: entry.id || createId("history"),
      createdAt: validIsoDateTime(entry.createdAt) ? entry.createdAt : new Date().toISOString(),
      reason: typeof entry.reason === "string" && entry.reason.trim() ? entry.reason.trim() : "Backup",
      state: cleanStateForApartment(entry.state, apartmentName),
    };
  }

  function normalizeApartment(entry, index) {
    const fallbackName = defaultApartmentName(index + 1);
    const sourceState = entry && entry.state ? entry.state : entry;
    const stateSnapshot = cleanStateForApartment(sourceState, entry && entry.name ? entry.name : fallbackName);
    const name = normalizeApartmentName(entry && entry.name, stateSnapshot.apartmentName);
    stateSnapshot.apartmentName = name;

    const history = Array.isArray(entry && entry.history)
      ? entry.history
          .map((historyEntry) => normalizeHistoryEntry(historyEntry, name))
          .filter(Boolean)
          .slice(0, MAX_HISTORY_ENTRIES)
      : [];

    return {
      id: entry && entry.id ? String(entry.id) : createId("apartment"),
      name,
      createdAt: validIsoDateTime(entry && entry.createdAt) ? entry.createdAt : new Date().toISOString(),
      updatedAt: validIsoDateTime(entry && entry.updatedAt) ? entry.updatedAt : new Date().toISOString(),
      state: stateSnapshot,
      history,
    };
  }

  function loadApartmentStore() {
    try {
      const raw = window.localStorage.getItem(APARTMENTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.apartments)) {
        const apartments = parsed.apartments
          .map(normalizeApartment)
          .filter(Boolean)
          .slice(0, MAX_APARTMENTS);
        if (apartments.length) {
          const activeId = apartments.some((apartment) => apartment.id === parsed.activeId)
            ? parsed.activeId
            : apartments[0].id;
          return { activeId, apartments };
        }
      }
    } catch (error) {
      // A broken apartment store falls back to the legacy single-apartment state.
    }

    const legacyState = loadLegacyState() || defaultState(defaultApartmentName(1));
    const firstApartment = normalizeApartment(
      {
        id: createId("apartment"),
        name: legacyState.apartmentName || defaultApartmentName(1),
        state: legacyState,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [],
      },
      0,
    );
    return {
      activeId: firstApartment.id,
      apartments: [firstApartment],
    };
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

  function defaultPreferences() {
    return {
      language: detectedLanguage(),
      appearance: "system",
      contrast: "standard",
      transparency: "glass",
    };
  }

  function sanitizePreferences(value) {
    const fallback = defaultPreferences();
    const preferences = value && typeof value === "object" ? value : {};
    return {
      language: normalizeChoice(preferences.language, LANGUAGE_CODES, fallback.language),
      appearance: normalizeChoice(preferences.appearance, APPEARANCE_MODES, fallback.appearance),
      contrast: normalizeChoice(preferences.contrast, CONTRAST_MODES, fallback.contrast),
      transparency: normalizeChoice(preferences.transparency, TRANSPARENCY_MODES, fallback.transparency),
    };
  }

  function loadPreferences() {
    try {
      const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
      return sanitizePreferences(raw ? JSON.parse(raw) : null);
    } catch (error) {
      return defaultPreferences();
    }
  }

  function preferencesFromState(sourceState = state) {
    return sanitizePreferences(sourceState);
  }

  function applyStoredPreferences(nextState, preferences) {
    return {
      ...nextState,
      ...sanitizePreferences(preferences),
    };
  }

  function persistPreferences() {
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesFromState()));
    } catch (error) {
      // Preferences are non-critical and still work in-memory when storage is blocked.
    }
  }

  let apartmentStore = loadApartmentStore();
  let state = applyStoredPreferences(activeApartmentState(), loadPreferences());
  let peopleLibrary = loadPeopleLibrary();
  fxState.rates = loadCachedEcbRates();
  fxState.peopleRates = loadCachedFrankfurterRates(state.currency);
  fxState.targetCurrency = state.currency === "EUR" ? "USD" : "EUR";

  persistApartmentStore();

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
    return new Intl.DateTimeFormat(localeCode(), {
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
    return formatMoney(cents, currency, localeCode());
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
        statusText: t("paidIn", { currency }),
        isConverted: false,
      };
    }

    const convertedCents = convertPersonCents(totalCents, currency);
    if (convertedCents !== null) {
      return {
        currency,
        baseText,
        convertedText: moneyInCurrency(convertedCents, currency),
        statusText: t("paidIn", { currency }),
        isConverted: true,
      };
    }

    return {
      currency,
      baseText,
      convertedText: fxState.peopleIsLoading ? t("currencyRatesLoading") : t("statusMissingCurrencyRates"),
      statusText: t("paidIn", { currency }),
      isConverted: false,
    };
  }

  function compactNameList(people) {
    const names = people.map((person) => person.name).filter(Boolean);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  }

  function readinessState(calculation) {
    const totals = totalsById(calculation);
    const peopleWithoutNights = state.people.filter(
      (person) => (totals.get(person.id) && totals.get(person.id).nightsPresent) === 0,
    );
    const targetCurrencies = requiredPersonCurrencies();
    const hasMissingRates =
      targetCurrencies.length > 0 &&
      !ratesCoverTargets(fxState.peopleRates, state.currency, targetCurrencies);

    if (calculation.rentCents <= 0) {
      return {
        tone: "danger",
        title: t("statusMissingRent"),
        detail: t("statusMissingRentDetail"),
        action: "open-settings",
        label: t("enter"),
      };
    }

    if (!state.people.length) {
      return {
        tone: "danger",
        title: t("statusNoPeople"),
        detail: t("statusNoPeopleDetail"),
        action: "open-add-person",
        label: t("personAdd"),
      };
    }

    if (peopleWithoutNights.length === state.people.length) {
      return {
        tone: "warning",
        title: t("statusMissingStays"),
        detail: t("statusMissingStaysDetail"),
        action: "open-person",
        personId: state.people[0].id,
        label: t("nightsAdd"),
      };
    }

    if (peopleWithoutNights.length > 0) {
      return {
        tone: "warning",
        title: t("withoutNights", { count: peopleWithoutNights.length }),
        detail: compactNameList(peopleWithoutNights),
        action: "open-person",
        personId: peopleWithoutNights[0].id,
        label: t("statusCheck"),
      };
    }

    if (calculation.unassignedCents > 0 && state.emptyNightPolicy === "unassigned") {
      return {
        tone: "warning",
        title: t("statusVacancyOpen"),
        detail: `${money(calculation.unassignedCents)} ${t("separately").toLocaleLowerCase()}`,
        action: "open-settings",
        label: t("rules"),
      };
    }

    if (hasMissingRates) {
      return {
        tone: fxState.peopleIsLoading ? "info" : "warning",
        title: fxState.peopleIsLoading ? t("statusRatesLoading") : t("statusMissingCurrencyRates"),
        detail: `${state.currency} → ${targetCurrencies.join(", ")}`,
        action: "refresh-person-rates",
        label: fxState.peopleIsLoading ? t("statusLoading") : t("statusLoad"),
        disabled: fxState.peopleIsLoading,
      };
    }

    return {
      tone: "success",
      title: t("readyShare"),
      detail: `${personCountLabel(state.people.length)} · ${money(calculation.allocatedCents)}`,
    };
  }

  function isShareReady(calculation) {
    return readinessState(calculation).tone === "success";
  }

  function currentCalculation() {
    return calculateRentShare({
      ...state,
      emptyNightPolicy: state.emptyNightPolicy,
    });
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
    fxState.status = t("currencyRateStatusLoading");
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
        fxState.status = t("currencyRateStatusIdentity");
        return parsed;
      }

      const response = await fetch(frankfurterRateUrl(source, target), { cache: "no-store" });
      if (!response.ok) throw new Error(`Frankfurter request failed with ${response.status}`);
      const parsed = normalizeFrankfurterRatePayload(await response.json(), source, target);
      fxState.rates = parsed;
      fxState.status = t("currencyRateStatusLoaded", { date: formatRateDate(parsed.date) });
      saveEcbRates(parsed);
      return parsed;
    } catch (error) {
      const cached = loadCachedEcbRates(source, target);
      if (cached) {
        fxState.rates = cached;
        fxState.status = t("currencyRateStatusCached", { date: formatRateDate(cached.date) });
        return cached;
      }

      fxState.status = t("currencyRateStatusFailed");
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
    fxState.peopleStatus = t("currencyRatesLoading");
    render();

    try {
      const response = await fetch(frankfurterRatesUrl(source, targets), { cache: "no-store" });
      if (!response.ok) throw new Error(`Frankfurter request failed with ${response.status}`);
      const parsed = normalizeFrankfurterRatesPayload(await response.json(), source, targets);
      fxState.peopleRates = parsed;
      fxState.peopleStatus = t("currencyRatesLoaded", { date: formatRateDate(parsed.date) });
      saveFrankfurterRates(parsed);
      return parsed;
    } catch (error) {
      if (cached) {
        fxState.peopleRates = cached;
        fxState.peopleStatus = t("currencyRatesCached", { date: formatRateDate(cached.date) });
        return cached;
      }
      fxState.peopleStatus = t("currencyRatesFail");
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
      showToast(t("liveRateUnavailable"));
      render();
      return;
    }

    const converted = convertCurrencyAmount(state.rent, sourceCurrency, targetCurrency, rates);
    if (converted === null) {
      fxState.status = t("currencyPairUnsupported", { source: sourceCurrency, target: targetCurrency });
      render();
      return;
    }

    const previousAmount = state.rent;
    const previousCurrency = state.currency;
    state.rent = converted;
    state.currency = targetCurrency;
    fxState.status = t("currencyConvertedStatus", {
      oldAmount: previousAmount,
      oldCurrency: previousCurrency,
      date: formatRateDate(rates.date),
      newAmount: converted.toFixed(2),
      newCurrency: targetCurrency,
    });
    saveState();
    showToast(t("convertedTo", { currency: targetCurrency }), {
      actionLabel: t("undo"),
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

  function activeApartment() {
    return apartmentStore.apartments.find((apartment) => apartment.id === apartmentStore.activeId) || null;
  }

  function activeApartmentState() {
    const apartment = activeApartment();
    return apartment ? cleanStateForApartment(apartment.state, apartment.name) : defaultState(defaultApartmentName(1));
  }

  function activeApartmentName() {
    const apartment = activeApartment();
    return normalizeApartmentName(state.apartmentName, apartment ? apartment.name : defaultApartmentName(1));
  }

  function persistApartmentStore() {
    try {
      window.localStorage.setItem(APARTMENTS_STORAGE_KEY, JSON.stringify(apartmentStore));
    } catch (error) {
      // The app still works in-memory when a browser blocks localStorage.
    }
  }

  function statesEqual(left, right) {
    return JSON.stringify(cleanStateForApartment(left, left && left.apartmentName)) ===
      JSON.stringify(cleanStateForApartment(right, right && right.apartmentName));
  }

  function addApartmentHistory(apartment, snapshotState, reason, options) {
    if (!apartment || !snapshotState) return false;
    const force = options && options.force;
    const snapshot = cleanStateForApartment(snapshotState, apartment.name);
    const latest = apartment.history && apartment.history[0];

    if (!force && latest && statesEqual(latest.state, snapshot)) return false;
    if (!force && !reason && latest && Date.now() - Date.parse(latest.createdAt) < AUTO_HISTORY_INTERVAL_MS) {
      return false;
    }

    apartment.history = [
      {
        id: createId("history"),
        createdAt: new Date().toISOString(),
        reason: reason || t("historyAuto"),
        state: snapshot,
      },
      ...(Array.isArray(apartment.history) ? apartment.history : []),
    ].slice(0, MAX_HISTORY_ENTRIES);
    return true;
  }

  function recordActiveHistory(snapshotState, reason, options) {
    const apartment = activeApartment();
    const recorded = addApartmentHistory(apartment, snapshotState, reason, options);
    if (recorded) persistApartmentStore();
    return recorded;
  }

  function syncActiveApartmentState(options) {
    const apartment = activeApartment();
    if (!apartment) return;

    const nextState = cleanStateForApartment(state, state.apartmentName || apartment.name);
    const previousState = apartment.state ? cleanStateForApartment(apartment.state, apartment.name) : null;
    const name = normalizeApartmentName(nextState.apartmentName, apartment.name);
    nextState.apartmentName = name;
    state.apartmentName = name;
    apartment.name = name;

    if (previousState && !statesEqual(previousState, nextState)) {
      addApartmentHistory(apartment, previousState, options && options.historyReason, options);
    }

    apartment.state = nextState;
    apartment.updatedAt = new Date().toISOString();
  }

  function saveState(options) {
    persistPreferences();
    syncActiveApartmentState(options || {});
    persistApartmentStore();
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
    return new Intl.DateTimeFormat(localeCode(), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function dateLabel(value) {
    const dayNumber = parseISODate(value);
    if (dayNumber === null) return value || "";
    return new Intl.DateTimeFormat(localeCode(), {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(dayNumber * 24 * 60 * 60 * 1000));
  }

  function dateTimeLabel(value) {
    const date = validIsoDateTime(value) ? new Date(value) : new Date();
    return new Intl.DateTimeFormat(localeCode(), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function apartmentMonthLabel(apartmentState) {
    const date = new Date(Date.UTC(apartmentState.year, apartmentState.month - 1, 1));
    return new Intl.DateTimeFormat(localeCode(), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function apartmentSummary(apartmentState) {
    const calculation = calculateRentShare({
      ...apartmentState,
      emptyNightPolicy: apartmentState.emptyNightPolicy,
    });
    return {
      rent: formatMoney(calculation.rentCents, apartmentState.currency, localeCode()),
      month: apartmentMonthLabel(apartmentState),
      people: apartmentState.people.length,
      nights: calculation.monthNights,
    };
  }

  function uniqueApartmentName(baseName) {
    const base = normalizeApartmentName(baseName, defaultApartmentName(apartmentStore.apartments.length + 1));
    const used = new Set(apartmentStore.apartments.map((apartment) => apartment.name.toLocaleLowerCase()));
    if (!used.has(base.toLocaleLowerCase())) return base;

    let index = 2;
    let next = `${base} ${index}`;
    while (used.has(next.toLocaleLowerCase())) {
      index += 1;
      next = `${base} ${index}`;
    }
    return next;
  }

  function money(cents) {
    return moneyInCurrency(cents, state.currency);
  }

  function nightWord(count) {
    return count === 1 ? t("nightSingular") : t("nightPlural");
  }

  function nightCountLabel(count) {
    return `${count} ${nightWord(count)}`;
  }

  function personCountLabel(count) {
    if (count === 1) return t("personCountOne");
    return t("personCount", { count });
  }

  function personInitial(name) {
    const trimmed = typeof name === "string" ? name.trim() : "";
    return trimmed ? trimmed.slice(0, 1).toUpperCase() : "?";
  }

  function vacancyLabel(calculation) {
    return calculation.emptyNightPolicy === "split_all"
      ? t("vacancySplit")
      : t("vacancySeparate");
  }

  function onlineLabel() {
    if (!isOnline) return t("offlineReady");
    if (isStandalone) return t("installed");
    if (installPrompt) return t("appInstallable");
    return t("localSaved");
  }

  function stayLabel(stay) {
    if (!stay.start || !stay.end) return t("stayIncomplete");
    return currentLanguage() === "en"
      ? `${dateLabel(stay.start)} to ${dateLabel(stay.end)}`
      : `${dateLabel(stay.start)} bis ${dateLabel(stay.end)}`;
  }

  function personStaySummary(person) {
    if (!person.stays.length) return t("emptyStay");
    if (person.stays.length === 1) return stayLabel(person.stays[0]);
    return `${person.stays.length} ${t("stayPlural")}`;
  }

  function isPersonDeleteArmed(personId) {
    return deletePersonArmedId === personId && Date.now() <= deletePersonArmedUntil;
  }

  function openSheet(type, options) {
    sheetState.type = type;
    sheetState.personId = options && options.personId ? options.personId : null;
  }

  function closeSheet() {
    sheetState.type = null;
    sheetState.personId = null;
    pendingSheetFocus = "";
    focusedStayId = "";
  }

  function focusSheet() {
    window.setTimeout(() => {
      const sheet = document.querySelector(".sheet-panel");
      if (!sheet) return;
      const selector = pendingSheetFocus;
      pendingSheetFocus = "";
      const focusTarget = selector
        ? sheet.querySelector(selector)
        : sheet.querySelector("[data-sheet-focus]") || sheet;
      if (focusTarget && selector) {
        focusTarget.scrollIntoView({ block: "center" });
        focusTarget.focus();
        return;
      }
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    }, 0);
  }

  function sheetFocusableElements() {
    const sheet = document.querySelector(".sheet-panel");
    if (!sheet) return [];
    return Array.from(
      sheet.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetWidth > 0 || element.offsetHeight > 0);
  }

  function trapSheetTab(event) {
    if (!sheetState.type || event.key !== "Tab") return false;
    const focusable = sheetFocusableElements();
    if (!focusable.length) return false;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElementIsInside = focusable.includes(document.activeElement);

    if (!activeElementIsInside) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return true;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return true;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return true;
    }

    return false;
  }

  function buildShareText(calculation) {
    const targetCurrencies = requiredPersonCurrencies();
    const hasRateSummary = ratesCoverTargets(fxState.peopleRates, state.currency, targetCurrencies);
    const lines = [
      t("shareRentLine", { month: monthLabel(), amount: money(calculation.rentCents) }),
      t("shareBaseLine", {
        nights: nightCountLabel(calculation.monthNights),
        rule: t("arrivalCounts"),
      }),
      "",
      t("shareSharesHeading"),
      ...calculation.totals.map((person) => {
        const statePerson = findPerson(person.id);
        const payment = personPaymentInfo(statePerson, person.totalCents);
        const parts = [
          `${person.name}: ${money(person.totalCents)}`,
          `${person.nightsPresent} ${nightWord(person.nightsPresent)}`,
        ];
        if (payment.convertedText && payment.isConverted) {
          parts.push(t("sharePays", { amount: payment.convertedText }));
        }
        if (person.emptyShareCents > 0) {
          parts.push(`${money(person.emptyShareCents)} ${t("vacancy")}`);
        }
        return parts.join(" | ");
      }),
    ];

    if (calculation.unassignedCents > 0) {
      lines.push(`${vacancyLabel(calculation)}: ${money(calculation.unassignedCents)}`);
    }

    if (targetCurrencies.length && hasRateSummary) {
      const rateParts = targetCurrencies.map((currency) => {
        const rate = rateFor(currency, fxState.peopleRates);
        return `1 ${state.currency} = ${rate.toFixed(5)} ${currency}`;
      });
      lines.push(
        "",
        t("shareRatesSummary", {
          date: formatRateDate(fxState.peopleRates.date),
          rates: rateParts.join(" · "),
        }),
      );
    }

    lines.push("", t("splitSummary", { amount: money(calculation.allocatedCents) }));
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
        <a class="app-mark" href="#result" aria-label="${escapeHtml(t("appOpenResult"))}">
          <span class="app-logo" aria-hidden="true">H</span>
          <span>
            <strong>HouseSplit</strong>
            <small>${escapeHtml(activeApartmentName())} · ${escapeHtml(onlineLabel())}</small>
          </span>
        </a>
        <div class="topbar-actions">
          <button class="icon-label-button" type="button" data-action="open-apartments" aria-label="${escapeHtml(t("apartmentsAndHistoryOpen"))}">
            <span class="button-icon icon-home" aria-hidden="true"></span>
            <span>${escapeHtml(t("apartments"))}</span>
          </button>
          ${installPrompt && !isStandalone
            ? `<button class="icon-label-button" type="button" data-action="install-app" aria-label="${escapeHtml(t("appInstall"))}">
                <span class="button-icon icon-download" aria-hidden="true"></span>
                <span>${escapeHtml(t("install"))}</span>
              </button>`
            : ""}
          <button class="icon-label-button" type="button" data-action="open-settings" aria-label="${escapeHtml(t("setupOpen"))}">
            <span class="button-icon icon-settings" aria-hidden="true"></span>
            <span>${escapeHtml(t("setup"))}</span>
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
          <h1>${escapeHtml(t("heroTitle"))}</h1>
          <p class="hero-lede">${escapeHtml(t("heroLede"))}</p>
        </div>
        <div class="hero-facts" aria-label="${escapeHtml(t("monthlyOverview"))}">
          <div>
            <span>${escapeHtml(monthLabel())}</span>
            <strong>${money(calculation.rentCents)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("period"))}</span>
            <strong>${calculation.monthNights} ${nightWord(calculation.monthNights)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("mode"))}</span>
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
            <p class="eyebrow">${escapeHtml(t("setup"))}</p>
            <h2 id="settings-title">${escapeHtml(t("monthlyData"))}</h2>
            <p class="section-note">${escapeHtml(monthLabel())} · ${money(calculation.rentCents)} · ${state.currency}</p>
          </div>
          <button class="secondary-button" type="button" data-action="open-settings">${escapeHtml(t("edit"))}</button>
        </div>

        <div class="setup-chips" aria-label="${escapeHtml(t("billingDetails"))}">
          <span>${calculation.monthNights} ${nightWord(calculation.monthNights)}</span>
          <span>${escapeHtml(t("emptyNightsShort", { count: emptyNightCount }))}</span>
          <span>${escapeHtml(vacancyLabel(calculation))}</span>
          <span>${escapeHtml(personCountLabel(state.people.length))}</span>
        </div>
      </section>
    `;
  }

  function renderStayRow(person, stay, bounds) {
    const isFocusedStay = focusedStayId === stay.id;
    return `
      <div
        class="stay-row ${isFocusedStay ? "is-focused" : ""}"
        data-person-id="${escapeHtml(person.id)}"
        data-stay-id="${escapeHtml(stay.id)}"
        ${isFocusedStay ? 'data-focus-stay="true"' : ""}
      >
        <label class="field compact">
          <span>${escapeHtml(t("arrival"))}</span>
          <input data-field="stay-start" type="date" min="${bounds.start}" max="${bounds.lastNight}" value="${escapeHtml(stay.start)}">
        </label>
        <label class="field compact">
          <span>${escapeHtml(t("checkout"))}</span>
          <input data-field="stay-end" type="date" min="${bounds.start}" max="${bounds.checkout}" value="${escapeHtml(stay.end)}">
        </label>
        <button class="icon-button danger" type="button" data-action="remove-stay" aria-label="${escapeHtml(t("deleteStay"))}" title="${escapeHtml(t("deleteStay"))}">×</button>
      </div>
    `;
  }

  function renderPeople(calculation) {
    const totals = totalsById(calculation);

    return `
      <section class="people-section" aria-labelledby="people-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${escapeHtml(t("peopleKicker"))}</p>
            <h2 id="people-title">${escapeHtml(t("people"))}</h2>
            <p class="section-note">${escapeHtml(t("personSectionNote"))}</p>
          </div>
          <button class="primary-button" type="button" data-action="open-add-person">${escapeHtml(t("newPerson"))}</button>
        </div>

        <div class="people-list">
          ${state.people
            .map((person) => {
              const total = totals.get(person.id);
              const payment = personPaymentInfo(findPerson(person.id), total.totalCents);
              const deleteArmed = isPersonDeleteArmed(person.id);
              const displayAmount = payment.isConverted && payment.convertedText ? payment.convertedText : payment.baseText;
              const amountDetail =
                payment.isConverted && payment.convertedText
                  ? `${payment.baseText} ${t("base")}`
                  : payment.convertedText || `${total.nightsPresent} ${nightWord(total.nightsPresent)}`;
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
                      <strong>${escapeHtml(displayAmount)}</strong>
                      <span>${escapeHtml(amountDetail)}</span>
                    </div>
                  </div>

                  <div class="person-stats" aria-label="${escapeHtml(t("occupancy"))}">
                    <span>${escapeHtml(payment.statusText)}</span>
                    <span>${total.soloNights} ${escapeHtml(t("solo"))}</span>
                    <span>${total.sharedNights} ${escapeHtml(t("shared"))}</span>
                    ${total.emptyShareCents > 0 ? `<span>${money(total.emptyShareCents)} ${escapeHtml(t("vacancy"))}</span>` : ""}
                  </div>

                  <div class="person-actions">
                    <button
                      class="secondary-button"
                      type="button"
                      data-action="open-person"
                      aria-label="${escapeHtml(t("openPersonNamed", { name: person.name }))}"
                    >${escapeHtml(t("openPerson"))}</button>
                    <button
                      class="ghost-button"
                      type="button"
                      data-action="add-stay"
                      aria-label="${escapeHtml(t("nightsAddFor", { name: person.name }))}"
                    >${escapeHtml(t("nightsAdd"))}</button>
                    ${state.people.length > 1 && total.nightsPresent === 0
                      ? `<button
                          class="ghost-button danger-text ${deleteArmed ? "danger-confirm" : ""}"
                          type="button"
                          data-action="remove-person"
                          aria-label="${escapeHtml(t("personRemove", { name: person.name }))}"
                        >${escapeHtml(deleteArmed ? t("personReallyRemoveVisible") : t("personRemoveVisible"))}</button>`
                      : ""}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderReadiness(calculation) {
    const status = readinessState(calculation);
    return `
      <div class="readiness-bar ${escapeHtml(status.tone)}">
        <span class="readiness-dot" aria-hidden="true"></span>
        <div>
          <strong>${escapeHtml(status.title)}</strong>
          <span>${escapeHtml(status.detail)}</span>
        </div>
        ${status.action
          ? `<button
              class="readiness-action"
              type="button"
              data-action="${escapeHtml(status.action)}"
              ${status.personId ? `data-person-id="${escapeHtml(status.personId)}"` : ""}
              aria-label="${escapeHtml(status.personId ? `${status.label}: ${status.detail}` : status.label)}"
              ${status.disabled ? "disabled" : ""}
            >${escapeHtml(status.label)}</button>`
          : ""}
      </div>
    `;
  }

  function renderSummary(calculation) {
    const percent =
      calculation.rentCents > 0
        ? Math.min(100, Math.round((calculation.allocatedCents / calculation.rentCents) * 100))
        : 0;
    const status = readinessState(calculation);
    const canShare = status.tone === "success";

    return `
      <section id="result" class="summary-panel app-section" aria-labelledby="result-title">
        <div class="summary-head">
          <div>
            <p class="eyebrow">${escapeHtml(t("result"))}</p>
            <h2 id="result-title">
              ${money(calculation.allocatedCents)}
              <span>${escapeHtml(t("splitTotal"))}</span>
            </h2>
            <p class="summary-rule">${calculation.monthNights} ${nightWord(calculation.monthNights)} · ${vacancyLabel(calculation)}</p>
          </div>
          <div class="summary-actions">
            ${canShare
              ? `<button class="primary-button" type="button" data-action="open-share">${escapeHtml(t("share"))}</button>
                 <button class="secondary-button copy-button" type="button" data-action="copy">${escapeHtml(t("copy"))}</button>`
              : `<button
                  class="primary-button"
                  type="button"
                  data-action="${escapeHtml(status.action)}"
                  ${status.personId ? `data-person-id="${escapeHtml(status.personId)}"` : ""}
                  aria-label="${escapeHtml(status.personId ? `${status.label}: ${status.detail}` : status.label)}"
                  ${status.disabled ? "disabled" : ""}
                >${escapeHtml(status.label)}</button>
                <button
                  class="secondary-button copy-button"
                  type="button"
                  data-action="blocked-share"
                  aria-label="${escapeHtml(t("shareBlockedReason"))}"
                >${escapeHtml(t("shareBlocked"))}</button>`}
          </div>
        </div>

        <div class="meter-block" aria-label="${escapeHtml(t("splitSummary", { amount: money(calculation.allocatedCents) }))}">
          <span>${escapeHtml(t("fromAmount", { amount: money(calculation.rentCents) }))}</span>
          <div class="meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
            <span style="width: ${percent}%"></span>
          </div>
        </div>

        ${renderReadiness(calculation)}

        <div class="totals-grid">
          ${calculation.totals
            .map((person) => {
              const payment = personPaymentInfo(findPerson(person.id), person.totalCents);
              const displayAmount = payment.isConverted && payment.convertedText ? payment.convertedText : payment.baseText;
              const amountDetail =
                payment.isConverted && payment.convertedText
                  ? `${payment.baseText} ${t("base")} · ${person.nightsPresent} ${nightWord(person.nightsPresent)}`
                  : payment.convertedText || `${person.nightsPresent} ${nightWord(person.nightsPresent)}`;
              return `
                <div class="total-tile">
                  <div class="total-tile-head">
                    <span class="person-avatar small" aria-hidden="true">${escapeHtml(personInitial(person.name))}</span>
                    <span>${escapeHtml(person.name)}</span>
                  </div>
                  <strong>${escapeHtml(displayAmount)}</strong>
                  <small>${escapeHtml(amountDetail)}</small>
                </div>
              `;
            })
            .join("")}
          ${calculation.unassignedCents > 0
            ? `
              <div class="total-tile warning">
                <span>${vacancyLabel(calculation)}</span>
                <strong>${money(calculation.unassignedCents)}</strong>
                <small>${escapeHtml(t("vacancyUnassigned"))}</small>
              </div>
            `
            : ""}
        </div>

        ${calculation.unassignedCents > 0
          ? `<div class="inline-alert">
              <strong>${money(calculation.unassignedCents)} ${escapeHtml(t("vacancy"))}</strong>
              <span>${escapeHtml(t("vacancyOpenSetup"))}</span>
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
            <h2 id="nights-title">${escapeHtml(t("nightPlan"))}</h2>
            <p class="section-note">${escapeHtml(t("occupiedEmptyAverage", {
              occupied: occupiedNightCount,
              empty: emptyNightCount,
              amount: money(averageNightRent),
            }))}</p>
          </div>
        </div>

        <div class="night-list">
          ${calculation.nightRows
            .map((night) => {
              const occupantText = night.occupants.length
                ? night.occupants.map((person) => person.name).join(", ")
                : t("empty");
              const shareText = night.shares.length
                ? night.shares
                    .map((share) => `${share.name}: ${money(share.cents)}`)
                    .join(" | ")
                : t("separateAmount", { amount: money(night.unassignedCents) });

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
          <h2 id="sheet-title" tabindex="-1" data-sheet-focus>${escapeHtml(title)}</h2>
        </div>
        <button class="icon-button" type="button" data-action="close-sheet" aria-label="${escapeHtml(t("close"))}" title="${escapeHtml(t("close"))}">×</button>
      </div>
    `;
  }

  function renderSettingsSheet(calculation) {
    const resetArmed = Date.now() <= resetArmedUntil;
    return `
      ${renderSheetHeader(t("monthlyData"), t("setup"))}
      <div class="sheet-body">
        <div class="control-grid">
          <label class="field">
            <span>${escapeHtml(t("apartment"))}</span>
            <input data-field="apartment-name" type="text" autocomplete="off" value="${escapeHtml(activeApartmentName())}">
          </label>

          <label class="field">
            <span>${escapeHtml(t("monthlyRent"))}</span>
            <input data-field="rent" inputmode="decimal" type="text" autocomplete="off" value="${escapeHtml(state.rent)}">
          </label>

          <label class="field">
            <span>${escapeHtml(t("month"))}</span>
            <input data-field="month" type="month" value="${escapeHtml(monthValue(state))}">
          </label>

          <label class="field">
            <span>${escapeHtml(t("currency"))}</span>
            <select data-field="currency">
              ${currencyOptions(state.currency)}
            </select>
          </label>

          <label class="field">
            <span>${escapeHtml(t("vacancy"))}</span>
            <select data-field="emptyNightPolicy">
              <option value="unassigned" ${state.emptyNightPolicy === "unassigned" ? "selected" : ""}>${escapeHtml(t("emptySeparate"))}</option>
              <option value="split_all" ${state.emptyNightPolicy === "split_all" ? "selected" : ""}>${escapeHtml(t("emptySplitAll"))}</option>
            </select>
          </label>
        </div>

        <div class="sheet-callout preference-callout">
          <div>
            <strong>${escapeHtml(t("lookAndFeel"))}</strong>
            <span>${escapeHtml(t("lookAndFeelBody"))}</span>
          </div>
        </div>

        <div class="control-grid preference-grid">
          <label class="field">
            <span>${escapeHtml(t("language"))}</span>
            <select data-field="language">
              ${languageOptions(state.language)}
            </select>
          </label>

          <label class="field">
            <span>${escapeHtml(t("theme"))}</span>
            <select data-field="appearance">
              ${appearanceOptions(state.appearance)}
            </select>
          </label>

          <label class="field">
            <span>${escapeHtml(t("contrast"))}</span>
            <select data-field="contrast">
              ${contrastOptions(state.contrast)}
            </select>
          </label>

          <label class="field">
            <span>${escapeHtml(t("visualMode"))}</span>
            <select data-field="transparency">
              ${transparencyOptions(state.transparency)}
            </select>
          </label>
        </div>

        <div class="sheet-stat-grid">
          <div>
            <span>${escapeHtml(t("month"))}</span>
            <strong>${calculation.monthNights} ${nightWord(calculation.monthNights)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("splitTotal"))}</span>
            <strong>${money(calculation.allocatedCents)}</strong>
          </div>
        </div>

        <div class="sheet-callout">
          <div>
            <strong>${escapeHtml(t("currencyConvert"))}</strong>
            <span>${escapeHtml(t("currencyConvertBody"))}</span>
          </div>
          <button class="secondary-button" type="button" data-action="open-currency-converter">${escapeHtml(t("currencyConvertRent"))}</button>
        </div>

        <div class="sheet-callout">
          <div>
            <strong>${escapeHtml(t("appUse"))}</strong>
            <span>${escapeHtml(t("appUseBody"))}</span>
          </div>
          <button class="ghost-button" type="button" data-action="open-install-help">${escapeHtml(t("appInstallHelp"))}</button>
        </div>

        <div class="sheet-callout">
          <div>
            <strong>${escapeHtml(t("apartmentsAndHistory"))}</strong>
            <span>${escapeHtml(t("multipleApartmentsBody"))}</span>
          </div>
          <button class="secondary-button" type="button" data-action="open-apartments">${escapeHtml(t("apartmentsOpen"))}</button>
        </div>

        <div class="sheet-actions">
          <button class="ghost-button danger-text ${resetArmed ? "danger-confirm" : ""}" type="button" data-action="reset">
            ${escapeHtml(resetArmed ? t("resetArmed") : t("reset"))}
          </button>
          <button class="primary-button" type="button" data-action="close-sheet">${escapeHtml(t("done"))}</button>
        </div>
      </div>
    `;
  }

  function renderApartmentCard(apartment) {
    const apartmentState = cleanStateForApartment(apartment.state, apartment.name);
    const summary = apartmentSummary(apartmentState);
    const isActive = apartment.id === apartmentStore.activeId;

    return `
      <article class="apartment-card ${isActive ? "is-active" : ""}" data-apartment-id="${escapeHtml(apartment.id)}">
        <div>
          <strong>${escapeHtml(apartment.name)}</strong>
          <span>${escapeHtml(summary.month)} · ${escapeHtml(summary.rent)} · ${escapeHtml(personCountLabel(summary.people))}</span>
          <small>${escapeHtml(t("apartmentSaved", { date: dateTimeLabel(apartment.updatedAt) }))}</small>
        </div>
        ${isActive
          ? `<span class="apartment-badge">${escapeHtml(t("apartmentActive"))}</span>`
          : `<button class="secondary-button" type="button" data-action="switch-apartment">${escapeHtml(t("open"))}</button>`}
      </article>
    `;
  }

  function renderHistoryRow(entry) {
    const summary = apartmentSummary(cleanStateForApartment(entry.state, activeApartmentName()));

    return `
      <article class="history-row" data-history-id="${escapeHtml(entry.id)}">
        <div>
          <strong>${escapeHtml(entry.reason)}</strong>
          <span>${escapeHtml(summary.month)} · ${escapeHtml(summary.rent)} · ${escapeHtml(personCountLabel(summary.people))}</span>
          <small>${escapeHtml(dateTimeLabel(entry.createdAt))}</small>
        </div>
        <button class="ghost-button" type="button" data-action="restore-history">${escapeHtml(t("restore"))}</button>
      </article>
    `;
  }

  function renderApartmentsSheet() {
    const apartment = activeApartment();
    const history = apartment && Array.isArray(apartment.history) ? apartment.history : [];

    return `
      ${renderSheetHeader(t("apartmentsAndHistory"), t("sheetStorage"))}
      <div class="sheet-body">
        <div class="sheet-note">
          <strong>${escapeHtml(activeApartmentName())}</strong>
          <span>${escapeHtml(t("privacyLocal"))}</span>
        </div>

        <div class="sheet-actions split">
          <button class="ghost-button" type="button" data-action="create-apartment">${escapeHtml(t("newApartment"))}</button>
          <button class="secondary-button" type="button" data-action="duplicate-apartment">${escapeHtml(t("createCopy"))}</button>
          <button class="primary-button" type="button" data-action="save-history">${escapeHtml(t("saveNow"))}</button>
        </div>

        <div class="sheet-section-head">
          <div>
            <h3>${escapeHtml(t("savedApartments"))}</h3>
            <p>${escapeHtml(t("storageSwitchHint"))}</p>
          </div>
        </div>

        <div class="apartment-list">
          ${apartmentStore.apartments.map(renderApartmentCard).join("")}
        </div>

        <div class="sheet-section-head">
          <div>
            <h3>${escapeHtml(t("history"))}</h3>
            <p>${escapeHtml(t("historyLatest", { count: MAX_HISTORY_ENTRIES }))}</p>
          </div>
        </div>

        <div class="history-list">
          ${history.length
            ? history.map(renderHistoryRow).join("")
            : `<div class="empty-state">
                <strong>${escapeHtml(t("historyEmpty"))}</strong>
                <span>${escapeHtml(t("historyEmptyHint"))}</span>
              </div>`}
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
      ${renderSheetHeader(t("currencyConvert"), t("currency"))}
      <div class="sheet-body">
        <div class="converter-card">
          <div>
            <span>${escapeHtml(t("currencyCurrentRent"))}</span>
            <strong>${escapeHtml(String(state.rent))} ${escapeHtml(state.currency)}</strong>
          </div>
          <span class="converter-arrow" aria-hidden="true">→</span>
          <div>
            <span>${escapeHtml(t("currencyTarget"))}</span>
            <strong>${escapeHtml(converted === null ? t("currencyLiveLoad") : `${converted.toFixed(2)} ${targetCurrency}`)}</strong>
          </div>
        </div>

        <label class="field">
          <span>${escapeHtml(t("currencyConvert"))}</span>
          <select data-field="fx-target-currency">
            ${currencyOptions(targetCurrency)}
          </select>
        </label>

        <div class="sheet-note">
          <strong>${escapeHtml(t("currencySource"))}</strong>
          <span>${escapeHtml(t("currencySourceBody"))}</span>
          ${rates
            ? `<span>${escapeHtml(t("currencyRateCurrent", {
                date: formatRateDate(rates.date),
                source: state.currency,
                rate: pairRate.toFixed(5),
                target: targetCurrency,
              }))}</span>`
            : `<span>${escapeHtml(t("currencyMissingLive", { source: state.currency, target: targetCurrency }))}</span>`}
        </div>

        ${fxState.status ? `<p class="sheet-status" aria-live="polite">${escapeHtml(fxState.status)}</p>` : ""}

        <div class="sheet-actions">
          <button class="ghost-button" type="button" data-action="refresh-ecb-rates" ${fxState.isLoading ? "disabled" : ""}>${escapeHtml(t("currencyLiveLoad"))}</button>
          <button class="primary-button" type="button" data-action="convert-currency" ${fxState.isLoading ? "disabled" : ""}>
            ${escapeHtml(fxState.isLoading ? t("loading") : t("currencyConvertRent"))}
          </button>
        </div>
      </div>
    `;
  }

  function renderInstallSheet() {
    const platform = installPlatform();
    const nativeInstallAvailable = Boolean(installPrompt);
    const isIos = platform === "ios";
    const title = isIos ? t("appUse") : t("appInstall");
    const body = nativeInstallAvailable
      ? t("installBody")
      : isIos
        ? t("installIosBody")
        : t("installBrowserBody");

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
              <li>${escapeHtml(t("installIosStep1"))}</li>
              <li>${escapeHtml(t("installIosStep2"))}</li>
              <li>${escapeHtml(t("installIosStep3"))}</li>
            </ol>`
          : ""}

        <div class="sheet-actions">
          <button class="ghost-button" type="button" data-action="dismiss-install-promo">${escapeHtml(t("later"))}</button>
          ${nativeInstallAvailable
            ? `<button class="primary-button" type="button" data-action="install-app">${escapeHtml(t("appInstall"))}</button>`
            : `<button class="primary-button" type="button" data-action="dismiss-install-promo">${escapeHtml(t("gotIt"))}</button>`}
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
    const deleteArmed = isPersonDeleteArmed(person.id);
    const displayAmount = payment.isConverted && payment.convertedText ? payment.convertedText : payment.baseText;
    const paymentStatus =
      personPayCurrency(person) !== state.currency
        ? payment.isConverted && fxState.peopleRates
          ? t("liveRateFrom", { date: formatRateDate(fxState.peopleRates.date) })
          : fxState.peopleStatus || t("liveRateAuto")
        : "";

    return `
      ${renderSheetHeader(person.name, t("person"))}
      <div class="sheet-body" data-person-id="${escapeHtml(person.id)}">
        <div class="control-grid">
          <label class="field">
            <span>${escapeHtml(t("name"))}</span>
            <input data-field="person-name" type="text" autocomplete="name" value="${escapeHtml(person.name)}">
          </label>

          <label class="field">
            <span>${escapeHtml(t("payIn"))}</span>
            <select data-field="person-currency">
              ${currencyOptions(personPayCurrency(person))}
            </select>
          </label>
        </div>

        <div class="sheet-stat-grid">
          <div>
            <span>${escapeHtml(t("paymentAmount"))}</span>
            <strong>${escapeHtml(displayAmount)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("base"))}</span>
            <strong>${money(total.totalCents)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("nightPlural"))}</span>
            <strong>${total.nightsPresent} ${nightWord(total.nightsPresent)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("solo"))}</span>
            <strong>${total.soloNights}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("shared"))}</span>
            <strong>${total.sharedNights}</strong>
          </div>
        </div>

        ${personPayCurrency(person) !== state.currency
          ? `<p class="sheet-status" aria-live="polite">${escapeHtml(payment.statusText)} · ${escapeHtml(paymentStatus)}</p>`
          : ""}

        <div class="sheet-section-head">
          <div>
            <h3>${escapeHtml(t("stayPlural"))}</h3>
            <p>${escapeHtml(t("arrivalCounts"))}</p>
          </div>
          <button
            class="secondary-button"
            type="button"
            data-action="add-stay"
            aria-label="${escapeHtml(t("nightsAddFor", { name: person.name }))}"
          >${escapeHtml(t("nightsAdd"))}</button>
        </div>

        <div class="preset-actions" aria-label="${escapeHtml(t("stayPlural"))}">
          <button class="ghost-button" type="button" data-action="first-half" aria-label="${escapeHtml(t("firstHalf"))}">${escapeHtml(t("firstHalf"))}</button>
          <button class="ghost-button" type="button" data-action="second-half" aria-label="${escapeHtml(t("secondHalf"))}">${escapeHtml(t("secondHalf"))}</button>
          <button class="ghost-button" type="button" data-action="full-month" aria-label="${escapeHtml(t("fullMonth"))}">${escapeHtml(t("fullMonth"))}</button>
        </div>

        <div class="stays">
          ${person.stays.length > 0
            ? person.stays.map((stay) => renderStayRow(person, stay, bounds)).join("")
            : `<div class="empty-state">
                <strong>${escapeHtml(t("emptyStay"))}</strong>
                <span>${escapeHtml(t("emptyStayHint"))}</span>
              </div>`}
        </div>

        <div class="sheet-actions split">
          ${state.people.length > 1
            ? `<button
                class="ghost-button danger-text ${deleteArmed ? "danger-confirm" : ""}"
                type="button"
                data-action="remove-person"
                aria-label="${escapeHtml(t("personRemove", { name: person.name }))}"
              >${escapeHtml(deleteArmed ? t("personDeleteConfirm") : t("deletePerson"))}</button>`
            : `<span></span>`}
          <button class="primary-button" type="button" data-action="close-sheet">${escapeHtml(t("done"))}</button>
        </div>
      </div>
    `;
  }

  function renderAddPersonSheet() {
    const existingNames = new Set(state.people.map((person) => person.name.trim().toLocaleLowerCase()));
    const savedNames = peopleLibrary.filter((name) => !existingNames.has(name.toLocaleLowerCase()));

    return `
      ${renderSheetHeader(t("personAdd"), t("peopleKicker"))}
      <div class="sheet-body">
        <label class="field">
          <span>${escapeHtml(t("name"))}</span>
          <input class="new-person-input" type="text" autocomplete="name" placeholder="${escapeHtml(t("name"))}">
        </label>

        ${savedNames.length
          ? `<div class="saved-people">
              <h3>${escapeHtml(t("savedPeople"))}</h3>
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
              <strong>${escapeHtml(t("noSavedPeople"))}</strong>
              <span>${escapeHtml(t("noSavedPeopleHint"))}</span>
            </div>`}

        <div class="sheet-actions">
          <button class="ghost-button" type="button" data-action="close-sheet">${escapeHtml(t("cancel"))}</button>
          <button class="primary-button" type="button" data-action="create-person">${escapeHtml(t("personAdd"))}</button>
        </div>
      </div>
    `;
  }

  function renderShareSheet(calculation) {
    const shareText = buildShareText(calculation);

    return `
      ${renderSheetHeader(t("splitSummary", { amount: money(calculation.allocatedCents) }), t("share"))}
      <div class="sheet-body">
        <label class="field share-field">
          <span>${escapeHtml(t("shareText"))}</span>
          <textarea readonly rows="10">${escapeHtml(shareText)}</textarea>
        </label>
        <div class="sheet-actions">
          <button class="secondary-button" type="button" data-action="copy">${escapeHtml(t("copy"))}</button>
          ${navigator.share
            ? `<button class="primary-button" type="button" data-action="native-share">${escapeHtml(t("shareSystem"))}</button>`
            : `<button class="primary-button" type="button" data-action="copy">${escapeHtml(t("shareToClipboard"))}</button>`}
        </div>
      </div>
    `;
  }

  function renderSheet(calculation) {
    if (!sheetState.type) return "";

    let content = "";
    if (sheetState.type === "settings") content = renderSettingsSheet(calculation);
    if (sheetState.type === "apartments") content = renderApartmentsSheet();
    if (sheetState.type === "currency") content = renderCurrencySheet();
    if (sheetState.type === "install") content = renderInstallSheet();
    if (sheetState.type === "person") content = renderPersonSheet(calculation);
    if (sheetState.type === "add-person") content = renderAddPersonSheet();
    if (sheetState.type === "share") content = renderShareSheet(calculation);
    if (!content) return "";

    return `
      <div class="sheet-layer" role="presentation">
        <button class="sheet-backdrop" type="button" data-action="close-sheet" aria-label="${escapeHtml(t("dialogClose"))}"></button>
        <section class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">
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
    applyPreferences();
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
      <nav class="bottom-tabs" aria-label="${escapeHtml(t("appAreas"))}">
        <a class="is-active" href="#result" aria-current="page">
          <span class="tab-icon tab-result" aria-hidden="true"></span>
          <span>${escapeHtml(t("result"))}</span>
        </a>
        <a href="#entry">
          <span class="tab-icon tab-entry" aria-hidden="true"></span>
          <span>${escapeHtml(t("people"))}</span>
        </a>
        <a href="#plan">
          <span class="tab-icon tab-plan" aria-hidden="true"></span>
          <span>${escapeHtml(t("nightPlan"))}</span>
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
      state.rent = parseRentInput(target.value);
      return true;
    }

    if (field === "apartment-name") {
      state.apartmentName = normalizeApartmentName(target.value, activeApartmentName());
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

    if (field === "language") {
      state.language = normalizeChoice(target.value, LANGUAGE_CODES, state.language || detectedLanguage());
      return true;
    }

    if (field === "appearance") {
      state.appearance = normalizeChoice(target.value, APPEARANCE_MODES, "system");
      return true;
    }

    if (field === "contrast") {
      state.contrast = normalizeChoice(target.value, CONTRAST_MODES, "standard");
      return true;
    }

    if (field === "transparency") {
      state.transparency = normalizeChoice(target.value, TRANSPARENCY_MODES, "glass");
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
    if (state.people.length <= 1) {
      showToast(t("personRequired"));
      return;
    }

    const index = state.people.findIndex((person) => person.id === personId);
    if (index === -1) return;

    recordActiveHistory(state, t("historyBeforeDelete"), { force: true });
    const [removed] = state.people.splice(index, 1);
    deletePersonArmedId = "";
    deletePersonArmedUntil = 0;
    closeSheet();
    showToast(t("personDeleted", { name: removed.name }), {
      actionLabel: t("undo"),
      onAction: () => {
        state.people.splice(Math.min(index, state.people.length), 0, removed);
      },
    });
  }

  function addStay(person) {
    const bounds = monthBounds(state);
    const monthStart = parseISODate(bounds.start);
    const monthEnd = parseISODate(bounds.checkout);
    const validStays = person.stays
      .map((stay) => ({
        start: parseISODate(stay.start),
        end: parseISODate(stay.end),
      }))
      .filter((stay) => stay.start !== null && stay.end !== null)
      .sort((a, b) => a.start - b.start);
    const lastStay = validStays[validStays.length - 1];
    const nextStart = Math.min(Math.max(lastStay ? lastStay.end : monthStart, monthStart), monthEnd - 1);
    const nextEnd = Math.min(monthEnd, nextStart + 7);

    const stay = {
      id: createId("stay"),
      start: formatISOFromDay(nextStart),
      end: formatISOFromDay(Math.max(nextStart + 1, nextEnd)),
    };
    person.stays.push(stay);
    return stay;
  }

  function fullMonth(person) {
    const bounds = monthBounds(state);
    person.stays = [{ id: createId("stay"), start: bounds.start, end: bounds.checkout }];
  }

  function firstHalf(person) {
    const bounds = monthBounds(state);
    const secondHalfStartDay = Math.floor(daysInMonth(state.year, state.month) / 2) + 1;
    person.stays = [
      {
        id: createId("stay"),
        start: bounds.start,
        end: formatISODate(state.year, state.month, secondHalfStartDay),
      },
    ];
  }

  function secondHalf(person) {
    const bounds = monthBounds(state);
    const secondHalfStartDay = Math.floor(daysInMonth(state.year, state.month) / 2) + 1;
    person.stays = [
      {
        id: createId("stay"),
        start: formatISODate(state.year, state.month, secondHalfStartDay),
        end: bounds.checkout,
      },
    ];
  }

  function removeStay(person, stayId) {
    const index = person.stays.findIndex((stay) => stay.id === stayId);
    if (index === -1) return;

    recordActiveHistory(state, t("historyBeforeDelete"), { force: true });
    const [removed] = person.stays.splice(index, 1);
    showToast(t("deletedStay"), {
      actionLabel: t("undo"),
      onAction: () => {
        const latestPerson = findPerson(person.id);
        if (latestPerson) latestPerson.stays.splice(Math.min(index, latestPerson.stays.length), 0, removed);
      },
    });
  }

  function refreshCurrencyState() {
    fxState.targetCurrency = state.currency === "EUR" ? "USD" : "EUR";
    fxState.rates = null;
    fxState.peopleRates = loadCachedFrankfurterRates(state.currency);
    fxState.peopleStatus = "";
  }

  function createApartment() {
    saveState({ historyReason: t("historyBeforeNewApartment") });
    const name = uniqueApartmentName(defaultApartmentName(apartmentStore.apartments.length + 1));
    const nextState = applyStoredPreferences(defaultState(name), preferencesFromState());
    const now = new Date().toISOString();
    const apartment = {
      id: createId("apartment"),
      name,
      createdAt: now,
      updatedAt: now,
      state: cleanStateForApartment(nextState, name),
      history: [],
    };

    apartmentStore.apartments.unshift(apartment);
    apartmentStore.apartments = apartmentStore.apartments.slice(0, MAX_APARTMENTS);
    apartmentStore.activeId = apartment.id;
    state = applyStoredPreferences(cleanStateForApartment(apartment.state, apartment.name), preferencesFromState());
    resetArmedUntil = 0;
    deletePersonArmedId = "";
    deletePersonArmedUntil = 0;
    refreshCurrencyState();
    saveState();
    openSheet("settings");
    showToast(t("apartmentCreated", { name }));
  }

  function duplicateApartment() {
    saveState({ historyReason: t("historyBeforeCopy") });
    const sourceName = activeApartmentName();
    const name = uniqueApartmentName(`${sourceName} ${t("duplicateSuffix")}`);
    const nextState = cleanStateForApartment(state, name);
    const now = new Date().toISOString();
    const apartment = {
      id: createId("apartment"),
      name,
      createdAt: now,
      updatedAt: now,
      state: nextState,
      history: [],
    };

    apartmentStore.apartments.unshift(apartment);
    apartmentStore.apartments = apartmentStore.apartments.slice(0, MAX_APARTMENTS);
    apartmentStore.activeId = apartment.id;
    state = applyStoredPreferences(cleanStateForApartment(apartment.state, apartment.name), preferencesFromState());
    refreshCurrencyState();
    saveState();
    openSheet("settings");
    showToast(t("apartmentOpened", { name }));
  }

  function switchApartment(apartmentId) {
    if (apartmentId === apartmentStore.activeId) return;
    const nextApartment = apartmentStore.apartments.find((apartment) => apartment.id === apartmentId);
    if (!nextApartment) return;

    saveState({ historyReason: t("historyBeforeSwitch") });
    apartmentStore.activeId = nextApartment.id;
    state = applyStoredPreferences(cleanStateForApartment(nextApartment.state, nextApartment.name), preferencesFromState());
    resetArmedUntil = 0;
    deletePersonArmedId = "";
    deletePersonArmedUntil = 0;
    refreshCurrencyState();
    saveState();
    closeSheet();
    showToast(t("apartmentOpened", { name: nextApartment.name }));
  }

  function saveManualHistory() {
    const recorded = recordActiveHistory(state, t("historyManual"), { force: true });
    saveState();
    showToast(recorded ? t("historySaved") : t("historySavedAlready"));
  }

  function restoreHistory(historyId) {
    const apartment = activeApartment();
    if (!apartment || !Array.isArray(apartment.history)) return;
    const entry = apartment.history.find((item) => item.id === historyId);
    if (!entry) return;

    const previousState = JSON.parse(JSON.stringify(state));
    recordActiveHistory(previousState, t("historyBeforeRestore"), { force: true });
    state = applyStoredPreferences(cleanStateForApartment(entry.state, entry.state.apartmentName || apartment.name), preferencesFromState());
    refreshCurrencyState();
    saveState();
    showToast(t("historyRestored"), {
      actionLabel: t("undo"),
      onAction: () => {
        state = applyStoredPreferences(sanitizeState(previousState), preferencesFromState());
        refreshCurrencyState();
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
      showToast(t("copied"));
      render();
    } catch (error) {
      const textarea = document.querySelector(".share-field textarea");
      if (textarea) {
        textarea.focus();
        textarea.select();
        const copied = document.execCommand && document.execCommand("copy");
        showToast(copied ? t("copied") : t("textMarked"));
        render();
        return;
      }
      showToast(t("copyUnavailable"));
      render();
    }
  }

  async function nativeShare() {
    const calculation = currentCalculation();
    const text = buildShareText(calculation);

    if (!navigator.share) {
      await copyShareText();
      return;
    }

    try {
      await navigator.share({
        title: t("shareBillTitle"),
        text,
      });
      showToast(t("shareOpened"));
      render();
    } catch (error) {
      showToast(t("shareCancelled"));
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
        showToast(t("appInstalled"));
      }
    } catch (error) {
      showToast(t("installImpossible"));
    }
    render();
  }

  function openReadinessTarget(status) {
    if (!status || !status.action || status.disabled) return;
    if (status.action === "open-settings") {
      openSheet("settings");
      render();
      focusSheet();
      return;
    }
    if (status.action === "open-add-person") {
      openSheet("add-person");
      render();
      focusSheet();
      return;
    }
    if (status.action === "open-person" && status.personId) {
      openSheet("person", { personId: status.personId });
      render();
      focusSheet();
      return;
    }
    if (status.action === "refresh-person-rates") {
      loadPersonPaymentRates();
    }
  }

  function guardShareReady() {
    const calculation = currentCalculation();
    const status = readinessState(calculation);
    if (status.tone === "success") return true;
    showToast(t("shareReadyGuard", { title: status.title }), { duration: 3600 });
    openReadinessTarget(status);
    return false;
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
    const personId = button.dataset.personId || (personElement ? personElement.dataset.personId : "");
    const person = personId ? findPerson(personId) : null;
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

    if (action === "open-apartments") {
      openSheet("apartments");
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

    if (action === "open-install-help") {
      openSheet("install");
      render();
      focusSheet();
      return;
    }

    if (action === "refresh-ecb-rates") {
      loadEcbRates(state.currency, fxState.targetCurrency || "EUR");
      return;
    }

    if (action === "refresh-person-rates") {
      loadPersonPaymentRates();
      return;
    }

    if (action === "create-apartment") {
      createApartment();
      saveState();
      render();
      focusSheet();
      return;
    }

    if (action === "duplicate-apartment") {
      duplicateApartment();
      saveState();
      render();
      focusSheet();
      return;
    }

    if (action === "save-history") {
      saveManualHistory();
      render();
      focusSheet();
      return;
    }

    if (action === "switch-apartment") {
      const apartmentElement = button.closest("[data-apartment-id]");
      switchApartment(apartmentElement ? apartmentElement.dataset.apartmentId : "");
      saveState();
      render();
      return;
    }

    if (action === "restore-history") {
      const historyElement = button.closest("[data-history-id]");
      restoreHistory(historyElement ? historyElement.dataset.historyId : "");
      render();
      focusSheet();
      return;
    }

    if (action === "convert-currency") {
      convertWithEcbRates();
      return;
    }

    if (action === "open-share") {
      if (!guardShareReady()) return;
      openSheet("share");
      render();
      focusSheet();
      return;
    }

    if (action === "open-add-person" || action === "add-person") {
      openSheet("add-person");
      pendingSheetFocus = ".new-person-input";
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
      saveState();
      render();
      focusSheet();
      return;
    }

    if (action === "use-saved-person") {
      const created = addPerson(button.dataset.name || "");
      closeSheet();
      openSheet("person", { personId: created.id });
      saveState();
      render();
      focusSheet();
      return;
    }

    if (action === "remove-person" && person) {
      if (!isPersonDeleteArmed(person.id)) {
        deletePersonArmedId = person.id;
        deletePersonArmedUntil = Date.now() + 5200;
        showToast(t("tapDeleteAgain"), { duration: 4200 });
        render();
        focusSheet();
        return;
      }
      removePerson(person.id);
      saveState();
      render();
      return;
    }
    if (action === "add-stay" && person) {
      const stay = addStay(person);
      focusedStayId = stay.id;
      pendingSheetFocus = "[data-focus-stay] input[data-field='stay-start']";
      openSheet("person", { personId: person.id });
      saveState();
      render();
      focusSheet();
      return;
    }
    if (action === "full-month" && person) {
      focusedStayId = "";
      fullMonth(person);
      saveState();
      render();
      focusSheet();
      return;
    }
    if (action === "first-half" && person) {
      focusedStayId = "";
      firstHalf(person);
      saveState();
      render();
      focusSheet();
      return;
    }
    if (action === "second-half" && person) {
      focusedStayId = "";
      secondHalf(person);
      saveState();
      render();
      focusSheet();
      return;
    }
    if (action === "remove-stay" && person && stayElement) {
      focusedStayId = "";
      removeStay(person, stayElement.dataset.stayId);
      saveState();
      render();
      focusSheet();
      return;
    }
    if (action === "reset") {
      const now = Date.now();
      if (now > resetArmedUntil) {
        resetArmedUntil = now + 4200;
        showToast(t("resetPrompt"), { duration: 4200 });
        render();
        return;
      }
      resetArmedUntil = 0;
      const previousState = JSON.parse(JSON.stringify(state));
      recordActiveHistory(previousState, t("historyBeforeReset"), { force: true });
      state = applyStoredPreferences(defaultState(activeApartmentName()), preferencesFromState(previousState));
      refreshCurrencyState();
      closeSheet();
      showToast(t("resetDone"), {
        actionLabel: t("undo"),
        onAction: () => {
          state = applyStoredPreferences(sanitizeState(previousState), preferencesFromState());
          fxState.peopleRates = loadCachedFrankfurterRates(state.currency);
        },
      });
    }
    if (action === "blocked-share") {
      guardShareReady();
      return;
    }
    if (action === "copy") {
      if (!guardShareReady()) return;
      copyShareText();
      return;
    }
    if (action === "native-share") {
      if (!guardShareReady()) return;
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
    const hadServiceWorkerController = Boolean(navigator.serviceWorker.controller);
    let serviceWorkerReloaded = false;

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "HOUSE_SPLIT_UPDATED") {
        showToast(t("newVersionAvailable"), {
          actionLabel: t("reload"),
          onAction: () => window.location.reload(),
          duration: 8000,
        });
        render();
      }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadServiceWorkerController || serviceWorkerReloaded) return;
      serviceWorkerReloaded = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then((registration) => registration.update())
        .catch(() => {});
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
    showToast(t("appInstalled"));
    render();
  });

  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleColorSchemeChange = () => {
    if (state.appearance === "system") render();
  };
  if (typeof colorSchemeQuery.addEventListener === "function") {
    colorSchemeQuery.addEventListener("change", handleColorSchemeChange);
  } else if (typeof colorSchemeQuery.addListener === "function") {
    colorSchemeQuery.addListener(handleColorSchemeChange);
  }

  window.addEventListener("online", () => {
    isOnline = true;
    render();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    showToast(t("offlineReady"));
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (trapSheetTab(event)) return;
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
