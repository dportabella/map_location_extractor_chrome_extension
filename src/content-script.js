(() => {
  "use strict";

  function handleMessage(request, _sender, sendResponse) {
    if (!request || request.type !== "collectLocations") {
      return;
    }
    try {
      const extractor = globalThis.MapLocationExtractor;
      if (
        !extractor ||
        typeof extractor.collectLocationsFromPage !== "function" ||
        typeof extractor.collectRoutesFromPage !== "function"
      ) {
        sendResponse({ locations: [], routes: [], error: "Extractor no disponible." });
        return;
      }
      const locations = extractor.collectLocationsFromPage(document, window.location);
      const routes = extractor.collectRoutesFromPage(document);
      sendResponse({ locations, routes });
    } catch (error) {
      sendResponse({
        locations: [],
        routes: [],
        error: String(error && error.message ? error.message : error)
      });
    }
  }

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const maybePromise = handleMessage(request, sender, sendResponse);
      return Boolean(maybePromise);
    });
  }
})();

