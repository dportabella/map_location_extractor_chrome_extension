(() => {
  "use strict";

  const ROUND_DECIMALS = 6;
  const EMPTY_DESCRIPTION = "(Without description)";

  function hasValidWindowLocation(loc) {
    return Boolean(loc && typeof loc.href === "string" && typeof loc.hostname === "string");
  }

  function isFiniteNumber(value) {
    if (value == null) {
      return false;
    }
    if (typeof value === "number") {
      return Number.isFinite(value);
    }
    if (typeof value === "string") {
      const normalized = normalizeQueryText(value);
      if (!normalized) {
        return false;
      }
      return Number.isFinite(Number(normalized));
    }
    return false;
  }

  function safeTrim(text) {
    if (typeof text !== "string") {
      return "";
    }
    return text.trim();
  }

  function normalizeQueryText(text) {
    const trimmed = safeTrim(text);
    if (!trimmed) {
      return "";
    }
    return trimmed.replace(/\s+/g, " ");
  }

  function isGoogleMapsHostname(hostname) {
    if (typeof hostname !== "string") {
      return false;
    }
    const lower = hostname.toLowerCase();
    return lower.includes("google.") && lower.includes("maps");
  }

  function isOpenStreetMapUrlString(url) {
    if (typeof url !== "string" || url.length === 0) {
      return false;
    }
    const lower = url.toLowerCase();
    return lower.includes("openstreetmap.org");
  }

  function parseOpenStreetMapUrl(rawUrl) {
    if (typeof rawUrl !== "string" || rawUrl.length === 0) {
      return { lat: null, lng: null, description: null };
    }
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return { lat: null, lng: null, description: null };
    }
    const hash = url.hash || "";
    let lat = null;
    let lng = null;
    const mapMatch = hash.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);
    if (mapMatch) {
      lat = Number(mapMatch[1]);
      lng = Number(mapMatch[2]);
    }
    if ((!isFiniteNumber(lat) || !isFiniteNumber(lng)) && url.searchParams) {
      const mlat = url.searchParams.get("mlat");
      const mlon = url.searchParams.get("mlon");
      if (mlat != null && mlon != null) {
        const latText = normalizeQueryText(String(mlat));
        const lonText = normalizeQueryText(String(mlon));
        if (latText && lonText) {
          lat = Number(latText);
          lng = Number(lonText);
        }
      }
    }
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
      return { lat: null, lng: null, description: null };
    }
    let description = null;
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 1) {
      const last = decodeURIComponent(pathParts[pathParts.length - 1] || "");
      if (last && last !== "map") {
        description = last.replace(/\+/g, " ");
      }
    }
    return { lat, lng, description };
  }

  function isGoogleMapsUrlLocation(loc) {
    if (!hasValidWindowLocation(loc)) {
      return false;
    }
    const hostname = loc.hostname.toLowerCase();
    const pathname = (loc.pathname || "").toLowerCase();
    if (!isGoogleMapsHostname(hostname) && !hostname.includes("google.")) {
      return false;
    }
    return pathname.startsWith("/maps");
  }

  function isGoogleMapsUrlString(url) {
    if (typeof url !== "string" || url.length === 0) {
      return false;
    }
    const lower = url.toLowerCase();
    return lower.includes("google.com/maps") || lower.includes("maps.google.");
  }

  function roundCoordinate(value) {
    if (!isFiniteNumber(value)) {
      return null;
    }
    const num = Number(value);
    const factor = Math.pow(10, ROUND_DECIMALS);
    return Math.round(num * factor) / factor;
  }

  function buildGoogleMapsPointUrl(lat, lng) {
    const roundedLat = roundCoordinate(lat);
    const roundedLng = roundCoordinate(lng);
    if (!isFiniteNumber(roundedLat) || !isFiniteNumber(roundedLng)) {
      return null;
    }
    return `https://www.google.com/maps?q=${roundedLat},${roundedLng}`;
  }

  function buildGoogleMapsQueryUrl(query) {
    const normalizedQuery = normalizeQueryText(query);
    if (!normalizedQuery) {
      return null;
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(normalizedQuery)}`;
  }

  function extractCoordsFromAtFragment(fragment) {
    if (typeof fragment !== "string" || fragment.length === 0) {
      return null;
    }
    const parts = fragment.replace(/^@/, "").split(",");
    if (parts.length < 2) {
      return null;
    }
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
      return null;
    }
    return { lat, lng };
  }

  function extractCoordsFromQueryParams(searchParams) {
    if (!searchParams) {
      return null;
    }

    const pb = searchParams.get("pb");
    if (typeof pb === "string" && pb.length > 0) {
      const matchLat = pb.match(/!3d(-?\d+\.\d+)/);
      const matchLng = pb.match(/!2d(-?\d+\.\d+)/);
      if (matchLat && matchLng) {
        const lat = Number(matchLat[1]);
        const lng = Number(matchLng[1]);
        if (isFiniteNumber(lat) && isFiniteNumber(lng)) {
          return { lat, lng };
        }
      }
    }

    const q = searchParams.get("q") || searchParams.get("query");
    if (typeof q === "string" && q.length > 0) {
      const match = q.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (match) {
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (isFiniteNumber(lat) && isFiniteNumber(lng)) {
          return { lat, lng };
        }
      }
    }

    const center = searchParams.get("center");
    if (typeof center === "string" && center.length > 0) {
      const centerMatch = center.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (centerMatch) {
        const lat = Number(centerMatch[1]);
        const lng = Number(centerMatch[2]);
        if (isFiniteNumber(lat) && isFiniteNumber(lng)) {
          return { lat, lng };
        }
      }
    }

    const latParam = searchParams.get("lat") || searchParams.get("latitude");
    const lngParam =
      searchParams.get("lng") || searchParams.get("lon") || searchParams.get("longitude");
    if (latParam != null && lngParam != null) {
      const latText = normalizeQueryText(String(latParam));
      const lngText = normalizeQueryText(String(lngParam));
      if (!latText || !lngText) {
        return null;
      }
      const lat = Number(latText);
      const lng = Number(lngText);
      if (isFiniteNumber(lat) && isFiniteNumber(lng)) {
        return { lat, lng };
      }
    }

    return null;
  }

  function extractQueryFromSearchParams(searchParams) {
    if (!searchParams) {
      return null;
    }
    const q = searchParams.get("q") || searchParams.get("query");
    const normalized = normalizeQueryText(q || "");
    if (!normalized) {
      return null;
    }
    return normalized;
  }

  function parseGoogleMapsUrl(rawUrl) {
    if (typeof rawUrl !== "string" || rawUrl.length === 0) {
      return { lat: null, lng: null, query: null, description: null };
    }
    let url;
    try {
      url = new URL(rawUrl);
    } catch (error) {
      return { lat: null, lng: null, query: null, description: null };
    }

    let coords = null;

    const atIndex = url.pathname.indexOf("@");
    if (atIndex !== -1) {
      const fragment = url.pathname.slice(atIndex + 1);
      coords = extractCoordsFromAtFragment(fragment);
    }

    if (!coords) {
      coords = extractCoordsFromQueryParams(url.searchParams);
    }

    const query = extractQueryFromSearchParams(url.searchParams);

    let description = null;
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const potentialName = decodeURIComponent(pathParts[pathParts.length - 1] || "");
      if (potentialName && !potentialName.startsWith("@")) {
        description = potentialName.replace(/\+/g, " ");
      }
    }

    if (!coords) {
      return { lat: null, lng: null, query, description };
    }

    return {
      lat: coords.lat,
      lng: coords.lng,
      query,
      description
    };
  }

  function parseDirectionsWaypointsFromUrl(rawUrl) {
    if (typeof rawUrl !== "string" || rawUrl.length === 0) {
      return [];
    }
    let url;
    try {
      url = new URL(rawUrl);
    } catch (error) {
      return [];
    }
    const pathParts = url.pathname.split("/").filter(Boolean);
    const dirIndex = pathParts.indexOf("dir");
    if (dirIndex === -1) {
      return [];
    }
    const waypoints = [];
    for (let i = dirIndex + 1; i < pathParts.length; i += 1) {
      const segment = decodeURIComponent(pathParts[i] || "");
      if (!segment || segment.startsWith("@")) {
        continue;
      }
      const coordMatch = segment.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      let lat = null;
      let lng = null;
      if (coordMatch) {
        lat = Number(coordMatch[1]);
        lng = Number(coordMatch[2]);
      }
      if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
        continue;
      }
      waypoints.push({
        lat,
        lng,
        label: segment.replace(/\+/g, " ")
      });
    }
    return waypoints;
  }

  function extractTitleOrPlaceNameFromDom(doc) {
    if (!doc) {
      return null;
    }

    const titleText = safeTrim(doc.title);
    if (titleText) {
      const stripped = titleText.replace(/\s*-\s*Google\s+Maps\s*$/i, "");
      if (stripped) {
        return stripped;
      }
      return titleText;
    }

    const h1 = doc.querySelector("h1");
    if (h1) {
      const text = safeTrim(h1.textContent || "");
      if (text) {
        return text;
      }
    }

    return null;
  }

  function extractDirectionsWaypointsFromDom(doc) {
    if (!doc) {
      return [];
    }
    const inputs = Array.from(
      doc.querySelectorAll(
        "#directions-searchbox-0 input, #directions-searchbox-1 input, [id^='directions-searchbox-'] input"
      )
    );
    if (inputs.length === 0) {
      return [];
    }
    const waypoints = [];
    for (const input of inputs) {
      const parent = input.closest("[id^=\"directions-searchbox-\"]");
      const id = parent ? parent.id : "";

      let type = null;
      if (id.includes("-0")) {
        type = "origin";
      } else if (id.includes("-1")) {
        type = "destination";
      } else {
        continue;
      }

      const rawValue = input.value || input.getAttribute("value") || input.getAttribute("aria-label") || "";
      const value = normalizeQueryText(rawValue);

      if (!value) {
        continue;
      }

      let extractedValue = value;
      // If we fall back to aria-label, it might still have "Starting point: " prefix
      const prefixes = [
        /^(starting point|start|from|origin|origen|punt de partida)\s*[:\-]?\s*/i,
        /^(destination|to|destí|destino)\s*[:\-]?\s*/i
      ];
      for (const re of prefixes) {
        if (extractedValue.match(re)) {
          extractedValue = normalizeQueryText(extractedValue.replace(re, ""));
        }
      }

      if (extractedValue) {
        waypoints.push({
          type,
          query: extractedValue
        });
      }
    }
    return waypoints;
  }

  function parseDirQueriesFromPath(pathname) {
    if (typeof pathname !== "string" || pathname.length === 0) {
      return [];
    }
    const parts = pathname.split("/").filter(Boolean);
    const dirIndex = parts.indexOf("dir");
    if (dirIndex === -1) {
      return [];
    }
    const results = [];
    const originSegment = parts[dirIndex + 1];
    const destSegment = parts[dirIndex + 2];
    if (originSegment) {
      const origin = normalizeQueryText(
        decodeURIComponent(originSegment || "").replace(/\+/g, " ")
      );
      if (origin) {
        results.push({ type: "origin", query: origin });
      }
    }
    if (destSegment) {
      const dest = normalizeQueryText(decodeURIComponent(destSegment || "").replace(/\+/g, " "));
      if (dest) {
        results.push({ type: "destination", query: dest });
      }
    }
    return results;
  }

  function extractLocationsFromAnchors(doc) {
    if (!doc) {
      return [];
    }
    const anchors = Array.from(doc.querySelectorAll("a[href]"));
    if (anchors.length === 0) {
      return [];
    }
    const results = [];
    for (const anchor of anchors) {
      const href = anchor.href;
      const isGmaps = isGoogleMapsUrlString(href);
      const isOsm = isOpenStreetMapUrlString(href);
      if (!isGmaps && !isOsm) {
        continue;
      }
      const parsed = isGmaps ? parseGoogleMapsUrl(href) : parseOpenStreetMapUrl(href);
      const text = safeTrim(anchor.textContent || "");
      const description = text || parsed.description || null;
      if (isFiniteNumber(parsed.lat) && isFiniteNumber(parsed.lng)) {
        results.push({
          description,
          lat: parsed.lat,
          lng: parsed.lng,
          source: isGmaps ? "anchor-gmaps" : "anchor-osm"
        });
        continue;
      }
      if (isGmaps && parsed.query) {
        results.push({
          description,
          query: parsed.query,
          source: "anchor-gmaps"
        });
      }
    }
    return results;
  }

  function extractLocationsFromIframes(doc) {
    if (!doc) {
      return [];
    }
    const iframes = Array.from(doc.querySelectorAll("iframe[src]"));
    if (iframes.length === 0) {
      return [];
    }
    const results = [];
    for (const iframe of iframes) {
      const src = iframe.src;
      const isGmaps = isGoogleMapsUrlString(src);
      const isOsm = isOpenStreetMapUrlString(src);
      if (!isGmaps && !isOsm) {
        continue;
      }
      const parsed = isGmaps ? parseGoogleMapsUrl(src) : parseOpenStreetMapUrl(src);
      let description = parsed.description || null;
      if (!description) {
        const ariaLabel = iframe.getAttribute("aria-label");
        const title = iframe.getAttribute("title");
        description = safeTrim(ariaLabel || title || "");
        if (!description) {
          description = null;
        }
      }
      if (isFiniteNumber(parsed.lat) && isFiniteNumber(parsed.lng)) {
        results.push({
          description,
          lat: parsed.lat,
          lng: parsed.lng,
          source: isGmaps ? "iframe-gmaps" : "iframe-osm"
        });
        continue;
      }
      if (isGmaps && parsed.query) {
        results.push({
          description,
          query: parsed.query,
          source: "iframe-gmaps"
        });
      }
    }
    return results;
  }

  function extractLocationsFromSchemaOrg(doc) {
    if (!doc) {
      return [];
    }
    const geoNodes = Array.from(doc.querySelectorAll("[itemtype*='schema.org'] [itemprop='geo']"));
    if (geoNodes.length === 0) {
      return [];
    }
    const results = [];
    for (const node of geoNodes) {
      const latNode = node.querySelector("[itemprop='latitude']");
      const lngNode = node.querySelector("[itemprop='longitude']");
      if (!latNode || !lngNode) {
        continue;
      }
      const lat = Number(latNode.getAttribute("content") || latNode.textContent || "");
      const lng = Number(lngNode.getAttribute("content") || lngNode.textContent || "");
      if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
        continue;
      }
      let description = null;
      const parentWithName =
        node.closest("[itemprop='name']") ||
        node.closest("[itemtype*='Place']") ||
        node.closest("[itemtype*='LocalBusiness']");
      if (parentWithName) {
        const nameNode = parentWithName.querySelector("[itemprop='name']") || parentWithName;
        const nameText = safeTrim(nameNode.textContent || "");
        if (nameText) {
          description = nameText;
        }
      }
      results.push({
        description,
        lat,
        lng,
        source: "schema"
      });
    }
    return results;
  }

  function extractLocationsFromDataAttributes(doc) {
    if (!doc) {
      return [];
    }
    const nodes = Array.from(
      doc.querySelectorAll("[data-lat][data-lng], [data-latitude][data-longitude]")
    );
    if (nodes.length === 0) {
      return [];
    }
    const results = [];
    for (const node of nodes) {
      const latRaw = node.getAttribute("data-lat") || node.getAttribute("data-latitude");
      const lngRaw = node.getAttribute("data-lng") || node.getAttribute("data-longitude");
      if (!normalizeQueryText(latRaw || "") || !normalizeQueryText(lngRaw || "")) {
        continue;
      }
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
        continue;
      }
      const text = safeTrim(node.textContent || "");
      const description = text || null;
      results.push({
        description,
        lat,
        lng,
        source: "data-attrs"
      });
    }
    return results;
  }

  function extractLocationsFromGoogleMaps(loc, doc) {
    if (!hasValidWindowLocation(loc)) {
      return [];
    }
    const results = [];
    const parsedFromCurrent = parseGoogleMapsUrl(loc.href);
    {
      const title = extractTitleOrPlaceNameFromDom(doc);
      const description = title || parsedFromCurrent.description || null;
      if (isFiniteNumber(parsedFromCurrent.lat) && isFiniteNumber(parsedFromCurrent.lng)) {
        results.push({
          description,
          lat: parsedFromCurrent.lat,
          lng: parsedFromCurrent.lng,
          source: "current-url"
        });
      } else if (parsedFromCurrent.query) {
        results.push({
          description,
          query: parsedFromCurrent.query,
          source: "current-url"
        });
      }
    }

    const anchors = Array.from(doc.querySelectorAll("a[href*='/maps/']"));
    for (const anchor of anchors) {
      const href = anchor.href;
      if (!isGoogleMapsUrlString(href)) {
        continue;
      }
      const parsed = parseGoogleMapsUrl(href);
      const text = safeTrim(anchor.textContent || "");
      const description = text || parsed.description || null;
      if (isFiniteNumber(parsed.lat) && isFiniteNumber(parsed.lng)) {
        results.push({
          description,
          lat: parsed.lat,
          lng: parsed.lng,
          source: "gmaps-anchor"
        });
        continue;
      }
      if (parsed.query) {
        results.push({
          description,
          query: parsed.query,
          source: "gmaps-anchor"
        });
      }
    }

    const pathnameLower = (loc.pathname || "").toLowerCase();
    if (pathnameLower.startsWith("/maps/dir")) {
      const waypoints = parseDirectionsWaypointsFromUrl(loc.href);
      for (const waypoint of waypoints) {
        if (!isFiniteNumber(waypoint.lat) || !isFiniteNumber(waypoint.lng)) {
          continue;
        }
        const label = safeTrim(waypoint.label || "");
        results.push({
          description: label || null,
          lat: waypoint.lat,
          lng: waypoint.lng,
          source: "gmaps-dir"
        });
      }

      const domWaypoints = extractDirectionsWaypointsFromDom(doc);
      for (const wp of domWaypoints) {
        if (!wp || !wp.query) {
          continue;
        }
        const typeLabel =
          wp.type === "origin" ? "Origin" : wp.type === "destination" ? "Destination" : null;
        const description = typeLabel ? `${typeLabel}: ${wp.query}` : wp.query;
        results.push({
          description,
          query: wp.query,
          source: "gmaps-dir-dom"
        });
      }

      const pathQueries = parseDirQueriesFromPath(loc.pathname || "");
      for (const pq of pathQueries) {
        if (!pq || !pq.query) {
          continue;
        }
        const typeLabel =
          pq.type === "origin" ? "Origin" : pq.type === "destination" ? "Destination" : null;
        const description = typeLabel ? `${typeLabel}: ${pq.query}` : pq.query;
        results.push({
          description,
          query: pq.query,
          source: "gmaps-dir-path"
        });
      }
    }

    return results;
  }

  function extractLocationsFromText(doc) {
    if (!doc || !doc.body) {
      return [];
    }
    const text = (doc.body.textContent || doc.body.innerText || "").trim();
    if (!text || text.length < 10) {
      return [];
    }
    const results = [];
    const regex = /(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
        continue;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        continue;
      }
      results.push({
        description: "Coordenades en text",
        lat,
        lng,
        source: "text"
      });
    }
    return results;
  }

  function extractRoutesFromLinks(doc) {
    if (!doc) {
      return [];
    }
    const anchors = Array.from(doc.querySelectorAll("a[href]"));
    if (anchors.length === 0) {
      return [];
    }
    const results = [];
    const routeExtRe = /\.(gpx|kml|kmz|fit|tcx)(?:$|[?#])/i;
    for (const anchor of anchors) {
      const href = anchor.href || "";
      if (!href) {
        continue;
      }
      const match = href.match(routeExtRe);
      if (!match) {
        continue;
      }
      const format = match[1].toLowerCase();
      const text = safeTrim(anchor.textContent || "");
      let description = text || null;
      if (!description) {
        try {
          const url = new URL(href);
          const pathname = url.pathname || "";
          const filename = pathname.split("/").filter(Boolean).pop() || "";
          description = filename || null;
        } catch {
          description = null;
        }
      }
      results.push({
        description,
        url: href,
        format,
        source: "route-link"
      });
    }
    return results;
  }

  function normalizeAndDeduplicateLocations(rawLocations) {
    if (!Array.isArray(rawLocations) || rawLocations.length === 0) {
      return [];
    }
    const filtered = rawLocations.filter((entry) => {
      const hasCoords = isFiniteNumber(entry && entry.lat) && isFiniteNumber(entry && entry.lng);
      const hasQuery = Boolean(entry && typeof entry.query === "string" && normalizeQueryText(entry.query));
      return hasCoords || hasQuery;
    });
    if (filtered.length === 0) {
      return [];
    }
    const mapped = filtered.map((entry) => {
      const hasDescription =
        entry && typeof entry.description === "string" && entry.description.trim().length > 0;
      const description = hasDescription ? entry.description.trim() : EMPTY_DESCRIPTION;
      const source = entry && typeof entry.source === "string" ? entry.source : undefined;

      const hasCoords = isFiniteNumber(entry && entry.lat) && isFiniteNumber(entry && entry.lng);
      if (hasCoords) {
        const roundedLat = roundCoordinate(entry.lat);
        const roundedLng = roundCoordinate(entry.lng);
        if (!isFiniteNumber(roundedLat) || !isFiniteNumber(roundedLng)) {
          return null;
        }
        const id = `ll:${roundedLat},${roundedLng}`;
        const mapsUrl = buildGoogleMapsPointUrl(roundedLat, roundedLng);
        if (!mapsUrl) {
          return null;
        }
        return {
          id,
          description,
          lat: roundedLat,
          lng: roundedLng,
          mapsUrl,
          source
        };
      }

      const query = normalizeQueryText(entry && entry.query ? entry.query : "");
      if (!query) {
        return null;
      }
      const id = `q:${query.toLowerCase()}`;
      const mapsUrl = buildGoogleMapsQueryUrl(query);
      if (!mapsUrl) {
        return null;
      }
      return {
        id,
        description,
        query,
        mapsUrl,
        source
      };
    });
    const compact = mapped.filter(Boolean);
    if (compact.length === 0) {
      return [];
    }
    const dedupMap = new Map();
    for (const loc of compact) {
      const existing = dedupMap.get(loc.id);
      if (!existing) {
        dedupMap.set(loc.id, loc);
        continue;
      }
      const existingHasRealDescription = existing.description !== EMPTY_DESCRIPTION;
      const locHasRealDescription = loc.description !== EMPTY_DESCRIPTION;
      if (!existingHasRealDescription && locHasRealDescription) {
        dedupMap.set(loc.id, loc);
      }
    }
    return Array.from(dedupMap.values());
  }

  function collectLocationsFromPage(doc, loc) {
    if (!doc || !loc) {
      return [];
    }
    const locationsFromAnchors = extractLocationsFromAnchors(doc);
    const locationsFromIframes = extractLocationsFromIframes(doc);
    const locationsFromSchema = extractLocationsFromSchemaOrg(doc);
    const locationsFromDataAttributes = extractLocationsFromDataAttributes(doc);
    const locationsFromText = extractLocationsFromText(doc);
    let locationsFromGoogleMaps = [];

    if (isGoogleMapsUrlLocation(loc)) {
      locationsFromGoogleMaps = extractLocationsFromGoogleMaps(loc, doc);
    }

    const all = []
      .concat(locationsFromAnchors)
      .concat(locationsFromIframes)
      .concat(locationsFromSchema)
      .concat(locationsFromDataAttributes)
      .concat(locationsFromText)
      .concat(locationsFromGoogleMaps);

    return normalizeAndDeduplicateLocations(all);
  }

  const api = {
    collectLocationsFromPage,
    collectRoutesFromPage: extractRoutesFromLinks,
    parseGoogleMapsUrl
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  globalThis.MapLocationExtractor = api;
})();

