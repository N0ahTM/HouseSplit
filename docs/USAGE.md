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
2. Add each person. Previously used names are offered again locally.
3. Open a person sheet to add one or more arrival and checkout ranges. Choose `Zahlt in` if that person wants to pay in another currency.
4. Open setup to choose vacancy behavior:
   - `Separat anzeigen`: empty nights remain separate.
   - `Auf alle Personen verteilen`: empty nights are split across everyone.
5. If the rent is in another currency, open `EZB umrechnen`, choose the target currency, and convert it with the online Frankfurter/ECB reference rate.
6. Copy the summary text and send it to the group.

Data and saved person names are stored locally in the browser that opened the app.

Exchange rates are loaded online from the Frankfurter API with the `ECB` provider. The request contains only source and target currency codes, not the rent amount, names, or stay dates. The last successful rate is cached locally as a fallback if the device is later offline.

Arrival dates count as occupied nights. Checkout dates do not count.

On phones, the first screen focuses on the result. Use the bottom tabs to switch between result, people, and night plan. Larger edits open in bottom sheets.
