# Development

HouseSplit is a static app. It has no package dependencies and no build step.

## Files

- `index.html`: app shell and asset links.
- `styles.css`: responsive interface styling.
- `app.js`: UI state, rendering, persistence, and user interactions.
- `calc.js`: rent calculation logic.
- `tests/calc.test.js`: calculation tests.
- `manifest.webmanifest`: PWA metadata.
- `service-worker.js`: offline cache.

## Run Locally

```powershell
python -m http.server 4173
```

Open:

```text
http://localhost:4173
```

## Checks

```powershell
npm test
npm run check
```

## Offline Single File

The repo intentionally keeps the hosted app as separate static files. A local single-file HTML copy can be generated when needed, but generated offline bundles are ignored by Git.
