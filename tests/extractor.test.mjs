import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import { JSDOM, VirtualConsole } from "jsdom";

const require = createRequire(import.meta.url);
const { collectLocationsFromPage, collectRoutesFromPage } = require("../src/extractor-core.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readFixture(filename) {
  const filePath = path.join(__dirname, "fixtures", filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

function buildDom(html, url) {
  if (typeof html !== "string" || html.length === 0) {
    throw new Error("HTML buit.");
  }
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("URL buida.");
  }
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => { });
  return new JSDOM(html, { url, virtualConsole });
}

describe("collectLocationsFromPage (fixtures)", () => {
  it("Google Maps /maps/dir: retorna com a mínim el center del URL i no retorna 0,0", () => {
    const html = readFixture(
      "Carrer del Ginjoler, 6 to Calders, 08275, Barcelona - Google Maps.html"
    );
    const url =
      "https://www.google.com/maps/dir/Carrer+del+Ginjoler,+6,+08242+Manresa,+Barcelona/Calders,+08275,+Barcelona/@41.7665852,1.8262441,12z/data=!4m14!4m13!3e0";
    const dom = buildDom(html, url);

    const locations = collectLocationsFromPage(dom.window.document, dom.window.location);
    expect(locations.length).toBeGreaterThan(0);

    expect(Array.isArray(locations)).toBe(true);
    expect(locations.some((l) => l.id === "ll:0,0")).toBe(false);
    expect(locations.some((l) => l.id === "ll:41.766585,1.826244")).toBe(true);
  });

  it("Enestudio: no genera coordenades 0,0 i detecta el q= del mapa embed", () => {
    const html = readFixture("Contacto – Enestudio.html");
    const url = "https://enestudio.info/contacto/";
    const dom = buildDom(html, url);

    const locations = collectLocationsFromPage(dom.window.document, dom.window.location);
    expect(locations.length).toBeGreaterThan(0);

    expect(Array.isArray(locations)).toBe(true);
    expect(locations.some((l) => l.id === "ll:0,0")).toBe(false);

    const hasEnestudioQuery = locations.some((l) => {
      if (typeof l.query !== "string") {
        return false;
      }
      return l.query.toLowerCase().includes("enestudio");
    });
    expect(hasEnestudioQuery).toBe(true);
  });

  it("Google Maps dir Manresa -> enestudio: extreu origen i destí a partir del path", () => {
    const html = readFixture(
      "Manresa, Barcelona a enestudio_ Google Maps.html"
    );
    const url = "https://www.google.com/maps/dir/Manresa,+Barcelona/enestudio/";
    const dom = buildDom(html, url);

    const locations = collectLocationsFromPage(dom.window.document, dom.window.location);

    const hasOrigin = locations.some(
      (l) => typeof l.description === "string" && l.description.startsWith("Origin:")
    );
    const hasDestination = locations.some(
      (l) => typeof l.description === "string" && l.description.startsWith("Destination:")
    );

    expect(Array.isArray(locations)).toBe(true);
    expect(hasOrigin).toBe(true);
    expect(hasDestination).toBe(true);
  });

  it("Extreu rutes GPX des d'enllaços simples", () => {
    const html = `
      <!doctype html>
      <html>
        <body>
          <a href="https://example.com/routes/track1.gpx">Ruta 1</a>
          <a href="/download?file=track2.gpx">Baixa GPX</a>
        </body>
      </html>
    `;
    const url = "https://example.com/page";
    const dom = buildDom(html, url);
    const routes = collectRoutesFromPage(dom.window.document);

    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThanOrEqual(2);
    expect(routes.some((r) => r.url.endsWith(".gpx"))).toBe(true);
  });

  it("Detecta coordenades en text lliure", () => {
    const html = `
      <!doctype html>
      <html>
        <body>
          <p>Ens trobem a 41.7305697, 1.8224983 per començar la ruta.</p>
        </body>
      </html>
    `;
    const url = "https://example.com/coords";
    const dom = buildDom(html, url);
    const locations = collectLocationsFromPage(dom.window.document, dom.window.location);

    expect(locations.some((l) => l.id.startsWith("ll:41.73057"))).toBe(true);
  });
});


describe("Contact - ACME Worldwide.html", () => {
  it("Extreu els mapes", () => {
    const html = readFixture("contact_acme.html");
    const url = "https://www.acme-worldwide.com/contact-us/";
    const dom = buildDom(html, url);

    const locations = collectLocationsFromPage(dom.window.document, dom.window.location);
    expect(locations.length).toBeGreaterThan(0);
  });
});
