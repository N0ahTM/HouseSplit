const assert = require("assert");
const { calculateRentShare } = require("../calc");

function totalPeopleCents(calculation) {
  return calculation.totals.reduce((sum, person) => sum + person.totalCents, 0);
}

function byName(calculation, name) {
  return calculation.totals.find((person) => person.name === name);
}

{
  const calculation = calculateRentShare({
    rent: 300,
    year: 2026,
    month: 6,
    emptyNightPolicy: "unassigned",
    people: [
      { id: "a", name: "A", stays: [{ start: "2026-06-01", end: "2026-07-01" }] },
      { id: "b", name: "B", stays: [{ start: "2026-06-01", end: "2026-07-01" }] },
    ],
  });

  assert.strictEqual(calculation.monthNights, 30);
  assert.strictEqual(byName(calculation, "A").totalCents, 15000);
  assert.strictEqual(byName(calculation, "B").totalCents, 15000);
  assert.strictEqual(byName(calculation, "A").nightsPresent, 30);
  assert.strictEqual(calculation.unassignedCents, 0);
  assert.strictEqual(totalPeopleCents(calculation), 30000);
}

{
  const calculation = calculateRentShare({
    rent: 300,
    year: 2026,
    month: 6,
    emptyNightPolicy: "split_all",
    people: [
      { id: "a", name: "A", stays: [{ start: "2026-06-01", end: "2026-06-10" }] },
      { id: "b", name: "B", stays: [{ start: "2026-06-06", end: "2026-06-10" }] },
    ],
  });

  assert.strictEqual(byName(calculation, "A").nightsPresent, 9);
  assert.strictEqual(byName(calculation, "B").nightsPresent, 4);
  assert.strictEqual(byName(calculation, "A").totalCents, 17500);
  assert.strictEqual(byName(calculation, "B").totalCents, 12500);
  assert.strictEqual(calculation.unassignedCents, 0);
  assert.strictEqual(totalPeopleCents(calculation), 30000);
}

{
  const calculation = calculateRentShare({
    rent: 300,
    year: 2026,
    month: 6,
    emptyNightPolicy: "unassigned",
    people: [
      { id: "a", name: "A", stays: [{ start: "2026-06-01", end: "2026-06-10" }] },
      { id: "b", name: "B", stays: [{ start: "2026-06-06", end: "2026-06-10" }] },
    ],
  });

  assert.strictEqual(byName(calculation, "A").totalCents, 7000);
  assert.strictEqual(byName(calculation, "B").totalCents, 2000);
  assert.strictEqual(calculation.unassignedCents, 21000);
  assert.strictEqual(totalPeopleCents(calculation) + calculation.unassignedCents, 30000);
}

{
  const calculation = calculateRentShare({
    rent: 100,
    year: 2026,
    month: 7,
    emptyNightPolicy: "split_all",
    people: [
      { id: "a", name: "A", stays: [{ start: "2026-07-01", end: "2026-08-01" }] },
      { id: "b", name: "B", stays: [{ start: "2026-07-01", end: "2026-08-01" }] },
      { id: "c", name: "C", stays: [{ start: "2026-07-01", end: "2026-07-02" }] },
    ],
  });

  assert.strictEqual(calculation.rentCents, 10000);
  assert.strictEqual(calculation.monthNights, 31);
  assert.strictEqual(totalPeopleCents(calculation), 10000);
  calculation.nightRows.forEach((night) => {
    const nightlyShareTotal =
      night.shares.reduce((sum, share) => sum + share.cents, 0) + night.unassignedCents;
    assert.strictEqual(nightlyShareTotal, night.nightRentCents);
  });
}

{
  const calculation = calculateRentShare({
    rent: 90,
    year: 2026,
    month: 6,
    emptyNightPolicy: "unassigned",
    people: [
      {
        id: "a",
        name: "A",
        stays: [
          { start: "2026-06-01", end: "2026-06-05" },
          { start: "2026-06-03", end: "2026-06-07" },
        ],
      },
      { id: "b", name: "B", stays: [{ start: "2026-06-06", end: "2026-06-07" }] },
    ],
  });

  assert.strictEqual(byName(calculation, "A").nightsPresent, 6);
  assert.strictEqual(byName(calculation, "B").nightsPresent, 1);
  assert.strictEqual(byName(calculation, "A").totalCents, 1650);
  assert.strictEqual(byName(calculation, "B").totalCents, 150);
  assert.strictEqual(calculation.unassignedCents, 7200);
}

{
  const calculation = calculateRentShare({
    rent: 30,
    year: 2026,
    month: 6,
    people: [{ id: "a", name: "A", stays: [{ start: "2026-06-10", end: "2026-06-10" }] }],
  });

  assert.strictEqual(byName(calculation, "A").nightsPresent, 0);
  assert.strictEqual(byName(calculation, "A").totalCents, 0);
  assert.strictEqual(calculation.unassignedCents, 3000);
}

console.log("Alle Nächte-Rechentests bestanden.");
