# Contributing

HouseSplit is intentionally small: plain HTML, CSS, and JavaScript with no build step.

## Local Checks

```powershell
npm test
npm run check
```

## Guidelines

- Keep the app usable on small phone screens first.
- Keep calculation logic in `calc.js` and cover behavior with tests.
- Avoid dependencies unless they remove real complexity.
- Do not add telemetry or server-side storage.
