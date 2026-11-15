// Draait de echte pagina (index.html + app.js) in jsdom: vangt fouten die de
// unittests van lib/ niet zien, zoals een renderfout waardoor knoppen ontbreken.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const publicDir = new URL("../../public/", import.meta.url);
const dataFile = new URL("data/knooppunten.json", publicDir);

async function openPage(state) {
  const dom = new JSDOM(readFileSync(new URL("index.html", publicDir), "utf8"), { url: "https://fietsknooppunten.deboskes.eu/" });
  const { window } = dom;
  if (state) window.localStorage.setItem("fietsknooppunten.v1", JSON.stringify(state));
  const sent = [];
  for (const [key, value] of Object.entries({ window, document: window.document, localStorage: window.localStorage, navigator: window.navigator })) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  globalThis.fetch = async (url, init = {}) => {
    if (url === "/data/knooppunten.json") return new Response(readFileSync(dataFile, "utf8"), { status: 200 });
    if (url === "/route" && init.method === "PUT") { sent.push(init); return new Response('{"ok":true}', { status: 200 }); }
    return new Response("not found", { status: 404 });
  };
  const errors = [];
  window.addEventListener("error", (e) => errors.push(e.error));
  await import(`../../public/app.js?${Math.random()}`);
  return { window, document: window.document, sent, errors };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

test("a manual route shows the lookup, finds locations and can be sent", { skip: !existsSync(dataFile) }, async () => {
  const steps = [93, 99, 94, 80, 5].map((number, i) => ({ id: `s${i}`, number, coordinate: null }));
  const { document, window, sent } = await openPage({ code: "k7m2x9qp4tvwhc3d", routes: [{ id: "r1", name: "Test", steps }], selected: "r1", lang: "nl" });

  assert.equal(document.getElementById("code").textContent, "k7m2-x9qp-4tvw-hc3d");
  assert.equal(document.getElementById("editor").hidden, false);
  assert.equal(document.getElementById("lookup").hidden, false, "opzoekblok zichtbaar");
  assert.equal(document.getElementById("lookup-button").textContent, "Zoek locaties");
  assert.equal(document.getElementById("store-link").textContent, "Knooppunten in de Connect IQ Store");
  assert.equal(document.getElementById("send").disabled, true);
  assert.equal(document.querySelectorAll("#steps li").length, 5);

  // Suggesties tijdens het typen.
  const place = document.getElementById("place-input");
  place.value = "Rosma";
  place.dispatchEvent(new window.Event("input"));
  await settle();
  const suggestions = [...document.querySelectorAll("#place-list li")].map((li) => li.textContent);
  assert.ok(suggestions.includes("Rosmalen"), suggestions.join(", "));
  document.querySelector("#place-list li").click();

  document.getElementById("lookup-form").dispatchEvent(new window.Event("submit", { cancelable: true }));
  await settle();
  assert.equal(document.getElementById("lookup").hidden, true, "na opzoeken is alles gevonden");
  assert.match(document.getElementById("lookup-status").textContent, /5 van 5 knooppunten hebben een locatie/);
  assert.equal(document.querySelectorAll("#steps .location.missing").length, 0);

  const send = document.getElementById("send");
  assert.equal(send.disabled, false);
  send.click();
  await settle();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].headers.Authorization, "Bearer k7m2x9qp4tvwhc3d");
  assert.deepEqual(JSON.parse(sent[0].body).j.map((s) => s[0]), [93, 99, 94, 80, 5]);
  assert.match(document.getElementById("send-status").textContent, /Verstuurd om/);
});

test("follows the browser language and can switch between English and Dutch", async () => {
  const steps = [{ id: "s0", number: 93, coordinate: null }];
  const { document, window } = await openPage({ code: "k7m2x9qp4tvwhc3d", routes: [{ id: "r1", name: "Test", steps }], selected: "r1" });
  // jsdom meldt de browsertaal en-US: dus Engels.
  assert.equal(document.documentElement.lang, "en");
  assert.equal(document.getElementById("lookup-button").textContent, "Find locations");
  assert.equal(document.getElementById("send").textContent, "Send to watch");
  assert.equal(document.querySelector("#steps .location").textContent, "no location");
  assert.equal(document.getElementById("privacy-link").getAttribute("href"), "privacy-en.html");
  assert.equal(document.getElementById("store-link").textContent, "Knooppunten in the Connect IQ Store");
  assert.match(document.getElementById("store-link").getAttribute("href"), /^https:\/\/apps\.garmin\.com\/apps\/421c9b52-/);
  assert.match(document.getElementById("lookup-intro").textContent, /^1 of 1 junctions have no location yet\./);

  document.getElementById("language").click();
  assert.equal(document.documentElement.lang, "nl");
  assert.equal(document.getElementById("lookup-button").textContent, "Zoek locaties");
  assert.equal(document.getElementById("store-link").textContent, "Knooppunten in de Connect IQ Store");
  assert.equal(document.querySelector("#steps .location").textContent, "geen locatie");
  assert.equal(document.getElementById("add-input").getAttribute("placeholder"), "Knooppunten toevoegen, bv. 93 99 94");
  assert.equal(JSON.parse(window.localStorage.getItem("fietsknooppunten.v1")).lang, "nl");
});
