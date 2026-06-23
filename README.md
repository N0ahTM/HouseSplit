[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-0f766e?logo=githubpages&logoColor=white)](https://n0ahtm.github.io/HouseSplit/)
[![License](https://img.shields.io/github/license/N0ahTM/HouseSplit)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-static-f7df1e?logo=javascript&logoColor=111)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

<p align="center">
  <img width="75%" alt="HouseSplit repository preview" src="docs/assets/repository-open-graph.jpg">
</p>

<p align="center">
  <a href="https://github.com/N0ahTM/HouseSplit">
    <img src="https://img.shields.io/badge/Star_this_project-2d333b?style=for-the-badge&logo=github&logoColor=white&labelColor=1f2328" alt="Star this project">
  </a>
</p>

HouseSplit is a small mobile-first rent calculator for housemates. It splits a monthly rent by calendar day and by the number of people present on each day, so solo days, shared days, and vacancy days are handled explicitly.

Open the live app: **[n0ahtm.github.io/HouseSplit](https://n0ahtm.github.io/HouseSplit/)**

Built with **plain JavaScript**, **HTML**, and **CSS**. No backend, no accounts, no build step.

## Quick Start

1. Open [HouseSplit](https://n0ahtm.github.io/HouseSplit/) on your phone.
2. Enter the monthly rent, month, currency, and housemates.
3. Add date ranges for each person's stays.
4. Choose how empty days should be handled.
5. Copy the summary and send it to your group chat.

On iPhone or Android, add the site to your home screen to use it like a small app. See [Usage](docs/USAGE.md).

## Features

- Mobile-first interface for iOS and Android browsers.
- Installable PWA when opened from the GitHub Pages HTTPS URL.
- Per-person stay ranges with multiple ranges per person.
- Daily rent splitting by actual occupancy.
- Vacancy handling: show separately or distribute across all people.
- Exact cent-based rounding so totals remain consistent.
- Shareable text summary for messages.
- Local browser storage only.
- Offline support after the first hosted load.
- Single-file offline copy can be generated locally for file sharing.

## Calculation Model

HouseSplit first splits the monthly rent across every day in the selected month. For each day:

- if one person is present, that person pays the full daily amount;
- if multiple people are present, the daily amount is split equally;
- if nobody is present, the amount is either shown as vacancy or split across all people, depending on the selected setting.

The app calculates in cents and distributes rounding leftovers deterministically.

## Preview

<p align="center">
  <img width="320" alt="HouseSplit mobile preview" src="docs/assets/mobile-preview.png">
</p>

## Development

Run locally with any static server:

```powershell
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

Run checks:

```powershell
npm test
npm run check
```

## Documentation

- [Usage](docs/USAGE.md)
- [Development](docs/DEVELOPMENT.md)
- [Privacy](docs/PRIVACY.md)
- [Changelog](CHANGELOG.md)

## Privacy

HouseSplit stores data locally in your browser. It does not send rent data, names, dates, or calculations to a server. See [Privacy](docs/PRIVACY.md).

## License

MIT License. See [LICENSE](LICENSE).
