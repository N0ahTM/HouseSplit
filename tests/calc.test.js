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
    emptyDayPolicy: "unassigned",
    people: [
      { id: "a", name: "A", stays: [{ start: "2026-06-01", end: "2026-06-30" }] },
      { id: "b", name: "B", stays: [{ start: "2026-06-01", end: "2026-06-30" }] },
    ],
  });

  assert.strictEqual(byName(calculation, "A").totalCents, 15000);
  assert.strictEqual(byName(calculation, "B").totalCents, 15000);
  assert.strictEqual(calculation.unassignedCents, 0);
  assert.strictEqual(totalPeopleCents(calculation), 30000);
}

{
  const calculation = calculateRentShare({
    rent: 300,
    year: 2026,
    month: 6,
    emptyDayPolicy: "split_all",
    people: [
      { id: "a", name: "A", stays: [{ start: "2026-06-01", end: "2026-06-10" }] },
      { id: "b", name: "B", stays: [{ start: "2026-06-06", end: "2026-06-10" }] },
    ],
  });

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
    emptyDayPolicy: "unassigned",
    people: [
      { id: "a", name: "A", stays: [{ start: "2026-06-01", end: "2026-06-10" }] },
      { id: "b", name: "B", stays: [{ start: "2026-06-06", end: "2026-06-10" }] },
    ],
  });

  assert.strictEqual(byName(calculation, "A").totalCents, 7500);
  assert.strictEqual(byName(calculation, "B").totalCents, 2500);
  assert.strictEqual(calculation.unassignedCents, 20000);
  assert.strictEqual(totalPeopleCents(calculation) + calculation.unassignedCents, 30000);
}

{
  const calculation = calculateRentShare({
    rent: 100,
    year: 2026,
    month: 7,
    emptyDayPolicy: "split_all",
    people: [
      { id: "a", name: "A", stays: [{ start: "2026-07-01", end: "2026-07-31" }] },
      { id: "b", name: "B", stays: [{ start: "2026-07-01", end: "2026-07-31" }] },
      { id: "c", name: "C", stays: [{ start: "2026-07-01", end: "2026-07-01" }] },
    ],
  });

  assert.strictEqual(calculation.rentCents, 10000);
  assert.strictEqual(totalPeopleCents(calculation), 10000);
  calculation.dayRows.forEach((day) => {
    const dailyShareTotal =
      day.shares.reduce((sum, share) => sum + share.cents, 0) + day.unassignedCents;
    assert.strictEqual(dailyShareTotal, day.dayRentCents);
  });
}

{
  const calculation = calculateRentShare({
    rent: 90,
    year: 2026,
    month: 6,
    emptyDayPolicy: "unassigned",
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

  assert.strictEqual(byName(calculation, "A").daysPresent, 7);
  assert.strictEqual(byName(calculation, "A").totalCents, 1800);
  assert.strictEqual(byName(calculation, "B").totalCents, 300);
  assert.strictEqual(calculation.unassignedCents, 6900);
}

console.log("Alle Rechentests bestanden.");
