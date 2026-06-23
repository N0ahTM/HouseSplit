# Privacy

HouseSplit does not require accounts and does not send app data to a server.

## Stored Locally

The following data is stored in the browser's `localStorage`:

- monthly rent;
- selected month and currency;
- people names;
- arrival and checkout date ranges;
- vacancy setting.

## Network Use

When opened from GitHub Pages, the browser downloads the static app files from GitHub Pages. After that, the service worker can cache the app for offline use.

When you use currency conversion, the browser requests current reference rates from the Frankfurter API with the `ECB` provider. Those requests include only source and target currency codes.

The app does not upload rent calculations, names, or stay dates.

## Clearing Data

Clear the browser's site data for `n0ahtm.github.io` to remove saved HouseSplit data from that device.
