# Changelog

## 1.6.0

- Added local multi-apartment storage with apartment switching, duplication, manual snapshots, and restore history.
- Added a result readiness bar that guides users to the next needed action.
- Improved guardrails for comma rent input, accidental last-person deletion, and default new stay ranges.
- Added first-half, second-half, and full-month presets in person sheets.
- Clarified share, copy, install, and global rent-conversion actions.
- Refreshed cache-busted PWA assets for the premium usability pass.

## 1.5.0

- Added per-person payment currencies with live Frankfurter/ECB conversion display.
- Made the mobile layout more compact by hiding the hero on small screens and flattening nested result/person cards.
- Refreshed cache-busted PWA assets for the compact payment-currency UI.

## 1.4.0

- Reworked the frontend into a more native-app style interface with a sticky top bar, safer mobile spacing, and clearer desktop grids.
- Moved setup, person editing, adding people, and share text into large mobile-friendly sheets.
- Added local saved-person suggestions for recurring names.
- Added toast feedback with undo for destructive person and stay deletes.
- Added online Frankfurter API currency conversion using the `ECB` provider for rents entered in foreign currencies.
- Added a browser install prompt sheet with native PWA install support where available and platform-specific guidance elsewhere.
- Updated PWA theme colors and cache-busted static assets.

## 1.3.0

- Refined the frontend using the GitHub `ui-ux-pro-max-skill` design guidance.
- Added a clearer result-first hierarchy, compact mobile facts, and visible night-counting rule.
- Improved person cards with stronger identity, balance, and state structure.
- Added a skip link and strengthened accessibility, focus, motion, and touch-target behavior.
- Refreshed cache-busted PWA assets and offline download files.

## 1.2.0

- Added a mobile bottom tab bar for Ergebnis, Eingabe, and Nachtplan.
- Added active tab state while scrolling between app sections.
- Improved mobile section spacing so fixed navigation does not cover content.
- Added PNG install icons, corrected screenshot metadata, and removed the forced portrait orientation.
- Refreshed PWA assets and offline download files.

## 1.1.0

- Changed the calculation model from calendar days to nights.
- Renamed stay inputs to arrival and checkout dates.
- Added SEO metadata, Open Graph data, Twitter Card data, robots.txt, and sitemap.xml.
- Improved the mobile UI with a result-first layout and collapsible share text.
- Added versioned static assets for more reliable PWA updates.
- Refreshed repository preview assets.

## 1.0.0

- Initial mobile-first rent sharing app.
- Added night-by-night occupancy calculation.
- Added vacancy handling modes.
- Added local browser persistence.
- Added PWA manifest and service worker.
- Added GitHub Pages-ready repository structure.
