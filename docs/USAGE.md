# Usage

Open the hosted app at:

```text
https://n0ahtm.github.io/HouseSplit/
```

When the app is opened in a normal browser tab, HouseSplit may show an install sheet. Browsers that support a native PWA prompt can install from that sheet. iPhone Safari shows the manual home-screen steps because iOS does not expose a one-click web install prompt.

## Install On iPhone

1. Open the link in Safari.
2. Tap the share button.
3. Choose `Add to Home Screen`.
4. Confirm the name.

## Install On Android

1. Open the link in Chrome.
2. Open the three-dot menu.
3. Choose `Add to Home screen` or `Install app`.
4. Confirm the install.

## Calculate A Month

1. Enter the monthly rent and select the month.
2. Keep the first person, rename them, or add each additional person. Previously used names are offered again locally.
3. Open a person sheet to add one or more arrival and checkout ranges. Choose `Zahlt in` if that person wants to pay in another currency.
4. Open `Wohnung & Abrechnung` in setup to choose whether the home bills by `Nächte` or `Tage`.
5. In the same billing sheet, choose vacancy behavior:
   - `Separat anzeigen`: empty units remain separate.
   - `Auf alle Personen verteilen`: empty units are split across everyone.
6. Open `App & Darstellung` in setup to choose the app language, light/dark/system theme, normal or high contrast, and Liquid Glass or solid surfaces.
7. If the rent is in another currency, open `Miete umrechnen`, choose the target currency, and convert it with the online Frankfurter/ECB reference rate.
8. When the result says it is ready, copy or share the summary text and send it to the group.

Data and saved person names are stored locally in the browser that opened the app.

Exchange rates are loaded online from the Frankfurter API with the `ECB` provider. The request contains only source and target currency codes, not the rent amount, names, or stay dates. The last successful rate is cached locally as a fallback if the device is later offline.

With `Nächte`, arrival dates count as occupied nights and checkout dates do not count. With `Tage`, arrival and checkout dates both count when they fall inside the selected month.

On phones, the bottom tabs switch between separate result, people, plan, and setup screens. Larger edits open in bottom sheets.
