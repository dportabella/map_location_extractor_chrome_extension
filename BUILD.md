## Local development

Requirements: `node >= 18`.

```bash
cd chrome_ext
npm install
npm test
```

## Load unpacked (developer mode)

1. Open `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode**.
3. Click **“Load unpacked”**.
4. Select the `map_location_extractor_chrome_extension` folder.
5. Open a page with maps or coordinates and click the extension icon.

## Packaging and publishing to Chrome Web Store

### 1 Create the `.zip` package

```bash
npm run build:zip
```

This creates `map_location_extractor_chrome_extension.zip` in the project root.


## Architecture

- `manifest.json`: MV3 config, `content_scripts`, `action` with popup.
- `src/extractor-core.js`:
  - Pure functions to extract:
    - Locations (Google Maps, OSM, schema.org, data-attrs, text).
    - Routes (links to GPX/KML/...).
  - Exports `collectLocationsFromPage` and `collectRoutesFromPage`.
- `src/content-script.js`:
  - Listens for `{ type: "collectLocations" }`.
  - Calls `MapLocationExtractor.collectLocationsFromPage` and `collectRoutesFromPage`.
  - Responds with `{ locations, routes }`.
- `src/popup.html` / `src/popup.js` / `src/styles.css`:
  - UI to show lists, bulk copy and debug mode.
