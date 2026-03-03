(() => {
  "use strict";

  const STATUS_ID = "status";
  const LIST_ID = "locations-list";
  const ROUTES_LIST_ID = "routes-list";
  const TEMPLATE_ID = "location-item-template";
  const ROUTE_TEMPLATE_ID = "route-item-template";
  const COPY_LOCATIONS_ID = "copy-all-locations";
  const COPY_ROUTES_ID = "copy-all-routes";
  const TOGGLE_DEBUG_ID = "toggle-debug";

  let lastLocations = [];
  let lastRoutes = [];
  let debugEnabled = false;

  function getElementByIdOrNull(id) {
    const node = document.getElementById(id);
    return node || null;
  }

  function setStatus(message, type) {
    const statusEl = getElementByIdOrNull(STATUS_ID);
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.className = "status";
    if (type === "error") {
      statusEl.classList.add("status--error");
    } else if (type === "success") {
      statusEl.classList.add("status--success");
    } else {
      statusEl.classList.add("status--info");
    }
  }

  function clearList() {
    const listEl = getElementByIdOrNull(LIST_ID);
    if (!listEl) {
      return;
    }
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }
  }

  function renderLocations(locations) {
    const listEl = getElementByIdOrNull(LIST_ID);
    const template = document.getElementById(TEMPLATE_ID);
    if (!listEl || !(template instanceof HTMLTemplateElement)) {
      return;
    }
    clearList();
    if (!Array.isArray(locations) || locations.length === 0) {
      setStatus("No locations found on this page.", "info");
      return;
    }
    for (const loc of locations) {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector(".location-item");
      const descEl = clone.querySelector(".location-description");
      const coordsEl = clone.querySelector(".location-coords");
      const debugEl = clone.querySelector(".location-debug");
      const linkEl = clone.querySelector(".location-link");
      const copyBtn = clone.querySelector(".location-copy");

      const description =
        typeof loc.description === "string" && loc.description.trim().length > 0
          ? loc.description.trim()
          : "(No description)";
      const coordsText = (() => {
        if (typeof loc.lat === "number" && typeof loc.lng === "number") {
          return `${loc.lat}, ${loc.lng}`;
        }
        if (typeof loc.query === "string" && loc.query.trim().length > 0) {
          return `Search: ${loc.query.trim()}`;
        }
        return "";
      })();
      const mapsUrl = typeof loc.mapsUrl === "string" ? loc.mapsUrl : "";
      const source =
        typeof loc.source === "string" && loc.source.trim().length > 0
          ? loc.source.trim()
          : "";

      if (descEl) {
        descEl.textContent = description;
      }
      if (coordsEl) {
        coordsEl.textContent = coordsText;
      }
      if (debugEl) {
        if (debugEnabled) {
          const parts = [];
          if (source) {
            parts.push(`source=${source}`);
          }
          if (typeof loc.id === "string") {
            parts.push(`id=${loc.id}`);
          }
          if (typeof loc.query === "string" && loc.query.trim().length > 0) {
            parts.push(`query=${loc.query.trim()}`);
          }
          debugEl.textContent = parts.join(" · ");
        } else {
          debugEl.textContent = "";
        }
      }
      if (linkEl) {
        linkEl.textContent = "Obre a Google Maps";
        if (mapsUrl) {
          linkEl.href = mapsUrl;
        } else {
          linkEl.removeAttribute("href");
        }
      }
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          if (!mapsUrl) {
            return;
          }
          if (!navigator.clipboard || !navigator.clipboard.writeText) {
            return;
          }
          navigator.clipboard.writeText(mapsUrl).catch(() => {});
        });
      }

      if (item) {
        if (debugEnabled) {
          item.classList.add("debug-enabled");
        } else {
          item.classList.remove("debug-enabled");
        }
        listEl.appendChild(item);
      }
    }
    setStatus(`Found ${locations.length} locations.`, "success");
  }

  function clearRoutesList() {
    const listEl = getElementByIdOrNull(ROUTES_LIST_ID);
    if (!listEl) {
      return;
    }
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }
  }

  function renderRoutes(routes) {
    const listEl = getElementByIdOrNull(ROUTES_LIST_ID);
    const template = document.getElementById(ROUTE_TEMPLATE_ID);
    if (!listEl || !(template instanceof HTMLTemplateElement)) {
      return;
    }
    clearRoutesList();
    if (!Array.isArray(routes) || routes.length === 0) {
      return;
    }
    for (const route of routes) {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector(".route-item");
      const descEl = clone.querySelector(".route-description");
      const metaEl = clone.querySelector(".route-meta");
      const linkEl = clone.querySelector(".route-link");
      const copyBtn = clone.querySelector(".route-copy");

      const description =
        typeof route.description === "string" && route.description.trim().length > 0
          ? route.description.trim()
          : "(No description)";
      const url = typeof route.url === "string" ? route.url : "";
      const format =
        typeof route.format === "string" && route.format.trim().length > 0
          ? route.format.toUpperCase()
          : "RUTA";

      if (descEl) {
        descEl.textContent = description;
      }
      if (metaEl) {
        metaEl.textContent = url ? `${format} · ${url}` : format;
      }
      if (linkEl) {
        if (url) {
          linkEl.href = url;
        } else {
          linkEl.removeAttribute("href");
        }
      }
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          if (!url) {
            return;
          }
          if (!navigator.clipboard || !navigator.clipboard.writeText) {
            return;
          }
          navigator.clipboard.writeText(url).catch(() => {});
        });
      }

      if (item) {
        listEl.appendChild(item);
      }
    }
  }

  function requestLocationsForActiveTab() {
    if (!chrome.tabs || !chrome.tabs.query) {
      setStatus("Cannot access active tab.", "error");
      return;
    }
    setStatus("Collecting locations…", "info");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!Array.isArray(tabs) || tabs.length === 0) {
        setStatus("Cannot identify the active tab.", "error");
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab || typeof activeTab.id !== "number") {
        setStatus("Cannot identify the active tab.", "error");
        return;
      }
      chrome.tabs.sendMessage(activeTab.id, { type: "collectLocations" }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus("No content script in this page or it did not respond.", "error");
          clearList();
          clearRoutesList();
          lastLocations = [];
          lastRoutes = [];
          return;
        }
        if (!response || !Array.isArray(response.locations)) {
          setStatus("No locations returned by the page.", "info");
          clearList();
          clearRoutesList();
          lastLocations = [];
          lastRoutes = [];
          return;
        }
        const routes = Array.isArray(response.routes) ? response.routes : [];
        lastLocations = response.locations;
        lastRoutes = routes;
        renderLocations(lastLocations);
        renderRoutes(lastRoutes);
        if (lastLocations.length === 0 && lastRoutes.length > 0) {
          setStatus("No locations found, but downloadable routes were detected.", "info");
        }
      });
    });
  }

  function copyAllLocations() {
    if (!Array.isArray(lastLocations) || lastLocations.length === 0) {
      return;
    }
    const lines = lastLocations.map((loc) => {
      const description =
        typeof loc.description === "string" && loc.description.trim().length > 0
          ? loc.description.trim()
          : "(No description)";
      const url = typeof loc.mapsUrl === "string" ? loc.mapsUrl : "";
      const coords =
        typeof loc.lat === "number" && typeof loc.lng === "number"
          ? `${loc.lat},${loc.lng}`
          : "";
      const parts = [description];
      if (coords) {
        parts.push(`(${coords})`);
      }
      if (url) {
        parts.push(url);
      }
      return parts.join(" - ");
    });
    const text = lines.join("\n");
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function copyAllRoutes() {
    if (!Array.isArray(lastRoutes) || lastRoutes.length === 0) {
      return;
    }
    const lines = lastRoutes
      .map((route) => {
        const description =
          typeof route.description === "string" && route.description.trim().length > 0
            ? route.description.trim()
            : "(No description)";
        const url = typeof route.url === "string" ? route.url : "";
        const format =
          typeof route.format === "string" && route.format.trim().length > 0
            ? route.format.toUpperCase()
            : "RUTA";
        if (!url) {
          return "";
        }
        return `${description} [${format}] - ${url}`;
      })
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      return;
    }
    const text = lines.join("\n");
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function attachToolbarHandlers() {
    const copyLocBtn = getElementByIdOrNull(COPY_LOCATIONS_ID);
    if (copyLocBtn) {
      copyLocBtn.addEventListener("click", () => {
        copyAllLocations();
      });
    }
    const copyRoutesBtn = getElementByIdOrNull(COPY_ROUTES_ID);
    if (copyRoutesBtn) {
      copyRoutesBtn.addEventListener("click", () => {
        copyAllRoutes();
      });
    }
    const toggleDebugInput = getElementByIdOrNull(TOGGLE_DEBUG_ID);
    if (toggleDebugInput instanceof HTMLInputElement) {
      toggleDebugInput.addEventListener("change", () => {
        debugEnabled = Boolean(toggleDebugInput.checked);
        renderLocations(lastLocations);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    attachToolbarHandlers();
    requestLocationsForActiveTab();
  });
})();

