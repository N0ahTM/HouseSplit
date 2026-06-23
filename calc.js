(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.RentShareCalculator = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function parseISODate(value) {
    if (typeof value !== "string") return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const time = Date.UTC(year, month - 1, day);
    const date = new Date(time);

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return Math.floor(time / MS_PER_DAY);
  }

  function formatISODate(year, month, day) {
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  function formatISOFromDay(dayNumber) {
    return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
  }

  function normalizeYearMonth(input) {
    const now = new Date();
    const year = Number.isInteger(Number(input.year))
      ? Number(input.year)
      : now.getFullYear();
    const month = Number.isInteger(Number(input.month))
      ? Number(input.month)
      : now.getMonth() + 1;

    return {
      year: Math.min(Math.max(year, 1900), 2200),
      month: Math.min(Math.max(month, 1), 12),
    };
  }

  function normalizeRentCents(rent) {
    const amount = Number(rent);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.round(amount * 100);
  }

  function allocateCents(totalCents, slots, offset) {
    if (!Number.isInteger(slots) || slots <= 0) return [];

    const sign = totalCents < 0 ? -1 : 1;
    const total = Math.abs(totalCents);
    const base = Math.floor(total / slots);
    const remainder = total % slots;
    const values = Array.from({ length: slots }, () => base);
    const start = Number.isInteger(offset) ? offset : 0;

    for (let index = 0; index < remainder; index += 1) {
      values[(start + index) % slots] += 1;
    }

    return values.map((value) => value * sign);
  }

  function normalizePeople(people) {
    if (!Array.isArray(people)) return [];

    return people.map((person, index) => {
      const fallbackName = `Person ${index + 1}`;
      const id =
        person && person.id !== undefined && person.id !== null
          ? String(person.id)
          : `person-${index + 1}`;
      const name =
        person && typeof person.name === "string" && person.name.trim()
          ? person.name.trim()
          : fallbackName;
      const stays = Array.isArray(person && person.stays) ? person.stays : [];

      return {
        id,
        name,
        stays: stays
          .map((stay) => {
            const start = parseISODate(stay && stay.start);
            const end = parseISODate(stay && stay.end);
            if (start === null || end === null) return null;
            return {
              start: Math.min(start, end),
              end: Math.max(start, end),
              rawStart: stay.start,
              rawEnd: stay.end,
            };
          })
          .filter(Boolean),
      };
    });
  }

  function personIsPresent(person, dayNumber) {
    return person.stays.some(
      (stay) => dayNumber >= stay.start && dayNumber <= stay.end,
    );
  }

  function calculateRentShare(input) {
    const options = input || {};
    const { year, month } = normalizeYearMonth(options);
    const people = normalizePeople(options.people);
    const rentCents = normalizeRentCents(options.rent);
    const monthDays = daysInMonth(year, month);
    const monthStart = parseISODate(formatISODate(year, month, 1));
    const dailyRentCents = allocateCents(rentCents, monthDays, 0);
    const emptyDayPolicy =
      options.emptyDayPolicy === "split_all" ? "split_all" : "unassigned";

    const totalsById = new Map(
      people.map((person) => [
        person.id,
        {
          id: person.id,
          name: person.name,
          totalCents: 0,
          daysPresent: 0,
          soloDays: 0,
          sharedDays: 0,
          emptyShareCents: 0,
        },
      ]),
    );
    const dayRows = [];
    let unassignedCents = 0;

    for (let dayIndex = 0; dayIndex < monthDays; dayIndex += 1) {
      const dayNumber = monthStart + dayIndex;
      const date = formatISOFromDay(dayNumber);
      const dayRentCents = dailyRentCents[dayIndex];
      const occupants = people.filter((person) => personIsPresent(person, dayNumber));
      const isEmpty = occupants.length === 0;
      const recipients = isEmpty && emptyDayPolicy === "split_all" ? people : occupants;
      const shares = [];

      occupants.forEach((person) => {
        const total = totalsById.get(person.id);
        total.daysPresent += 1;
        if (occupants.length === 1) total.soloDays += 1;
        if (occupants.length > 1) total.sharedDays += 1;
      });

      if (recipients.length > 0) {
        const split = allocateCents(dayRentCents, recipients.length, dayIndex % recipients.length);

        recipients.forEach((person, recipientIndex) => {
          const cents = split[recipientIndex];
          const total = totalsById.get(person.id);
          total.totalCents += cents;
          if (isEmpty) total.emptyShareCents += cents;
          shares.push({
            id: person.id,
            name: person.name,
            cents,
          });
        });
      } else {
        unassignedCents += dayRentCents;
      }

      dayRows.push({
        date,
        dayOfMonth: dayIndex + 1,
        dayRentCents,
        isEmpty,
        occupants: occupants.map((person) => ({
          id: person.id,
          name: person.name,
        })),
        shares,
        unassignedCents: recipients.length === 0 ? dayRentCents : 0,
      });
    }

    const totals = people.map((person) => totalsById.get(person.id));
    const allocatedCents = totals.reduce((sum, person) => sum + person.totalCents, 0);

    return {
      year,
      month,
      monthDays,
      rentCents,
      allocatedCents,
      unassignedCents,
      emptyDayPolicy,
      totals,
      dayRows,
    };
  }

  function formatMoney(cents, currency, locale) {
    const code = typeof currency === "string" && currency ? currency : "USD";
    const language = typeof locale === "string" && locale ? locale : "de-DE";

    try {
      return new Intl.NumberFormat(language, {
        style: "currency",
        currency: code,
      }).format(cents / 100);
    } catch (error) {
      const amount = (cents / 100).toFixed(2);
      return `${amount} ${code}`;
    }
  }

  return {
    allocateCents,
    calculateRentShare,
    daysInMonth,
    formatISODate,
    formatMoney,
    parseISODate,
  };
});
