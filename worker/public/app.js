// @ts-check
// De webapp: koppelcode, routes bewerken en versturen. Alles blijft in de browser,
// behalve de route die je verstuurt (naar de Worker, voor het horloge).
import { sendRoute } from "./lib/api.js";
import { formatCode, generateCode, normalizeCode } from "./lib/code.js";
import { GpxError, importGpx } from "./lib/gpx.js";
import { detectLanguage, setLanguage, t } from "./lib/i18n.js";
import { loadJunctionFile } from "./lib/junctions.js";
import { clusters, findPlaces, nodesAround, resolve, unconnectedSteps } from "./lib/resolver.js";
import { parseNumber, parseSequence } from "./lib/numbers.js";
import { appendNumbers, createRoute, encode, missingLocations, moveStep, removeStep, setNumber } from "./lib/route.js";
import { load, save } from "./lib/storage.js";

/** Een ANWB-export is zo'n 100 KB; dit is ruim, maar voorkomt dat de browser vastloopt. */
const MAX_GPX_BYTES = 20 * 1024 * 1024;

const state = load();
setLanguage(state.lang ?? detectLanguage(navigator.languages ?? [navigator.language ?? "nl"]));
/** Waarschuwingen uit de laatste verbindingscontrole, per stap; vervallen bij elke wijziging. */
/** @type {Map<string, string>} */
let warnings = new Map();
/** Gekozen omgeving voor het opzoeken. */
/** @type {{label: string, coordinate: import("./lib/route.js").Coordinate} | null} */
let place = null;
if (!state.code) state.code = generateCode();
persist();

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** @param {string} id */
const input = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));

function persist() {
  save(state);
}

function current() {
  return state.routes.find((r) => r.id === state.selected) ?? null;
}

// MARK: taal

/** Vaste teksten op de pagina (data-i18n*) in de gekozen taal. */
function applyLanguage() {
  const lang = /** @type {"nl" | "en"} */ (state.lang ?? detectLanguage(navigator.languages ?? []));
  setLanguage(lang);
  document.documentElement.lang = lang;
  document.title = t("page.title");
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(/** @type {any} */ (/** @type {HTMLElement} */ (el).dataset.i18n));
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.setAttribute("placeholder", t(/** @type {any} */ (/** @type {HTMLElement} */ (el).dataset.i18nPlaceholder)));
  for (const el of document.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(/** @type {any} */ (/** @type {HTMLElement} */ (el).dataset.i18nAria)));
  for (const el of document.querySelectorAll("[data-i18n-content]")) el.setAttribute("content", t(/** @type {any} */ (/** @type {HTMLElement} */ (el).dataset.i18nContent)));
  $("privacy-link").setAttribute("href", t("footer.privacyHref"));
}

$("language").addEventListener("click", () => {
  state.lang = document.documentElement.lang === "en" ? "nl" : "en";
  persist();
  applyLanguage();
  delete $("send-status").dataset.result;
  $("lookup-status").textContent = "";
  render();
});

// MARK: koppelcode

function renderCode() {
  $("code").textContent = formatCode(/** @type {string} */ (state.code));
}

$("copy-code").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(formatCode(/** @type {string} */ (state.code)));
    flash($("copy-code"), t("code.copied"));
  } catch {
    flash($("copy-code"), t("code.copyFailed"));
  }
});

$("code-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const code = normalizeCode(input("code-input").value);
  const error = $("code-error");
  if (!code) {
    error.textContent = t("code.invalid");
    error.hidden = false;
    return;
  }
  error.hidden = true;
  state.code = code;
  input("code-input").value = "";
  persist();
  renderCode();
  /** @type {HTMLDetailsElement} */ ($("code-form").closest("details")).open = false;
});

// MARK: routes

function renderRoutes() {
  const list = $("route-list");
  list.replaceChildren(...state.routes.map((route) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "route-item" + (route.id === state.selected ? " selected" : "");
    button.setAttribute("aria-pressed", String(route.id === state.selected));
    const name = document.createElement("span");
    name.textContent = route.name || t("routes.untitled");
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = t("routes.count", route.steps.length);
    button.append(name, meta);
    button.addEventListener("click", () => {
      state.selected = route.id;
      delete $("send-status").dataset.result;
      warnings = new Map();
      $("lookup-status").textContent = "";
      persist();
      render();
    });
    li.append(button);
    return li;
  }));
  $("no-routes").hidden = state.routes.length > 0;
}

input("gpx-file").addEventListener("change", async () => {
  const file = input("gpx-file").files?.[0];
  input("gpx-file").value = "";
  if (!file) return;
  const error = $("import-error");
  if (file.size > MAX_GPX_BYTES) {
    error.textContent = t("import.tooLarge");
    error.hidden = false;
    return;
  }
  try {
    const route = importGpx(await file.text(), file.name.replace(/\.gpx$/i, ""));
    state.routes.push(route);
    state.selected = route.id;
    error.hidden = true;
    changed();
  } catch (e) {
    error.textContent = e instanceof GpxError ? e.message : t("import.unreadable", /** @type {Error} */ (e).message);
    error.hidden = false;
  }
});

$("new-route").addEventListener("click", () => {
  const route = createRoute(t("routes.newName"));
  state.routes.push(route);
  state.selected = route.id;
  persist();
  render();
  input("route-name").select();
});

// MARK: editor

function renderEditor() {
  const route = current();
  $("editor").hidden = !route;
  if (!route) return;
  if (document.activeElement !== input("route-name")) input("route-name").value = route.name;

  const steps = $("steps");
  steps.replaceChildren(...route.steps.map((step, index) => {
    const li = document.createElement("li");
    li.className = "step";

    const position = document.createElement("span");
    position.className = "position";
    position.textContent = `${index + 1}.`;

    const number = document.createElement("input");
    number.className = "number";
    number.inputMode = "numeric";
    number.value = String(step.number);
    number.setAttribute("aria-label", t("step.label", index + 1));
    number.addEventListener("change", () => {
      const n = parseNumber(number.value);
      if (n === null) {
        number.value = String(step.number);
        return;
      }
      setNumber(route, step.id, n);
      changed();
    });

    const location = document.createElement("span");
    location.className = "location" + (step.coordinate ? "" : " missing");
    location.textContent = step.coordinate
      ? `${step.coordinate.lat.toFixed(5)}, ${step.coordinate.lon.toFixed(5)}`
      : t("step.noLocation");

    const actions = document.createElement("span");
    actions.className = "actions";
    actions.append(
      iconButton("↑", t("step.up", index + 1), index === 0, () => { moveStep(route, step.id, -1); changed(); }),
      iconButton("↓", t("step.down", index + 1), index === route.steps.length - 1, () => { moveStep(route, step.id, 1); changed(); }),
      iconButton("✕", t("step.remove", index + 1), false, () => { removeStep(route, step.id); changed(); }),
    );
    const warning = warnings.get(step.id);
    if (warning) {
      const mark = document.createElement("span");
      mark.className = "warning";
      mark.textContent = " ⚠";
      mark.title = warning;
      mark.setAttribute("aria-label", warning);
      location.append(mark);
    }
    li.append(position, number, location, actions);
    return li;
  }));
  $("no-steps").hidden = route.steps.length > 0;
  const missing = missingLocations(route);
  const lookup = $("lookup");
  lookup.hidden = missing === 0;
  const hasAnchor = route.steps.some((s) => s.coordinate);
  $("lookup-intro").textContent = `${t("lookup.intro", missing, route.steps.length)} ${hasAnchor ? t("lookup.introAnchor") : t("lookup.introPlace")}`;
  input("place-input").placeholder = hasAnchor ? t("lookup.placeholderOptional") : t("lookup.placeholder");
  const trackInfo = $("track-info");
  trackInfo.hidden = !route.track;
  trackInfo.textContent = route.track ? t("editor.track") : "";

  const send = /** @type {HTMLButtonElement} */ ($("send"));
  send.disabled = route.steps.length === 0 || missing > 0;
  const status = $("send-status");
  if (!status.dataset.result) {
    status.className = "status";
    status.textContent = route.steps.length === 0
      ? ""
      : missing > 0
        ? t("send.missing", missing, route.steps.length)
        : t("send.ready");
  }
}

input("route-name").addEventListener("input", () => {
  const route = current();
  if (!route) return;
  route.name = input("route-name").value;
  persist();
  renderRoutes();
});

$("add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const route = current();
  if (!route) return;
  const { numbers, invalid } = parseSequence(input("add-input").value);
  const error = $("add-error");
  if (invalid.length > 0) {
    error.textContent = t("editor.invalidNumbers", invalid.join(", "));
    error.hidden = false;
    return;
  }
  error.hidden = true;
  appendNumbers(route, numbers);
  input("add-input").value = "";
  changed();
});

$("delete-route").addEventListener("click", () => {
  const route = current();
  if (!route) return;
  const button = $("delete-route");
  if (button.dataset.confirm !== "1") {
    // Tweede klik bevestigt; geen browserdialoog.
    button.dataset.confirm = "1";
    button.textContent = t("send.confirmDelete");
    setTimeout(() => { delete button.dataset.confirm; button.textContent = t("send.delete"); }, 4000);
    return;
  }
  delete button.dataset.confirm;
  button.textContent = t("send.delete");
  state.routes = state.routes.filter((r) => r.id !== route.id);
  state.selected = state.routes[0]?.id ?? null;
  persist();
  render();
});

$("send").addEventListener("click", async () => {
  const route = current();
  if (!route || missingLocations(route) > 0) return;
  const send = /** @type {HTMLButtonElement} */ ($("send"));
  const status = $("send-status");
  send.disabled = true;
  status.className = "status";
  status.textContent = t("send.sending");
  const result = await sendRoute(/** @type {string} */ (state.code), encode(route));
  status.dataset.result = "1";
  if (result.ok) {
    const time = new Date().toLocaleTimeString(t("time.locale"), { hour: "2-digit", minute: "2-digit" });
    status.className = "status ok";
    status.textContent = t("send.sent", time);
  } else {
    status.className = "status error";
    status.textContent = result.message;
  }
  send.disabled = false;
});

// MARK: locaties opzoeken

input("place-input").addEventListener("input", async () => {
  place = null;
  const text = input("place-input").value;
  if (text.trim().length < 2) return showPlaces([]);
  try {
    const file = await loadJunctionFile();
    if (input("place-input").value === text) showPlaces(findPlaces(file, text));
  } catch {
    showPlaces([]);
  }
});

input("place-input").addEventListener("keydown", (event) => {
  const items = [...$("place-list").children];
  if ($("place-list").hidden || items.length === 0) return;
  const active = items.findIndex((li) => li.getAttribute("aria-selected") === "true");
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const next = (active + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items.forEach((li, i) => li.setAttribute("aria-selected", String(i === next)));
  } else if (event.key === "Enter" && active >= 0) {
    event.preventDefault();
    /** @type {HTMLElement} */ (items[active]).click();
  } else if (event.key === "Escape") {
    showPlaces([]);
  }
});

input("place-input").addEventListener("blur", () => setTimeout(() => showPlaces([]), 150));

/** @param {{label: string, coordinate: import("./lib/route.js").Coordinate}[]} places */
function showPlaces(places) {
  const list = $("place-list");
  list.replaceChildren(...places.map((p, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.id = `place-${i}`;
    li.textContent = p.label;
    li.setAttribute("aria-selected", "false");
    li.addEventListener("mousedown", (e) => e.preventDefault()); // focus houden
    li.addEventListener("click", () => {
      place = p;
      input("place-input").value = p.label;
      showPlaces([]);
    });
    return li;
  }));
  list.hidden = places.length === 0;
  input("place-input").setAttribute("aria-expanded", String(places.length > 0));
}

$("lookup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const route = current();
  if (!route) return;
  const status = $("lookup-status");
  const button = /** @type {HTMLButtonElement} */ ($("lookup-button"));
  status.className = "status";
  status.textContent = t("lookup.loading");
  button.disabled = true;
  try {
    const file = await loadJunctionFile();
    let anchor = route.steps.find((s) => s.coordinate)?.coordinate ?? place?.coordinate ?? null;
    if (!anchor && input("place-input").value.trim()) {
      const [first] = findPlaces(file, input("place-input").value);
      if (first) {
        place = first;
        input("place-input").value = first.label;
        anchor = first.coordinate;
      }
    }
    if (!anchor) {
      status.className = "status error";
      status.textContent = input("place-input").value.trim()
        ? t("lookup.placeNotFound", input("place-input").value.trim())
        : t("lookup.choosePlace");
      return;
    }
    const numbers = new Set(route.steps.filter((s) => !s.coordinate).map((s) => s.number));
    const missing = resolve(route, anchor, clusters(nodesAround(file, numbers, anchor)));
    warnings = new Map();
    const problems = [];
    for (const i of unconnectedSteps(route, file)) {
      const from = route.steps[i - 1].number, to = route.steps[i].number;
      warnings.set(route.steps[i].id, t("lookup.noConnection", from, to));
      problems.push(`${from}→${to}`);
    }
    const located = route.steps.filter((s) => s.coordinate).length;
    const parts = [t("lookup.located", located, route.steps.length)];
    if (missing.length > 0) parts.push(t("lookup.notFound", missing.join(", ")));
    if (problems.length > 0) parts.push(t("lookup.unconnected", problems.join(", ")));
    status.className = missing.length > 0 || problems.length > 0 ? "status warn" : "status ok";
    status.textContent = parts.join(" ");
    persist();
    delete $("send-status").dataset.result;
    render();
  } catch (error) {
    status.className = "status error";
    status.textContent = t("lookup.loadFailed", /** @type {Error} */ (error).message);
  } finally {
    button.disabled = false;
  }
});

/** Na elke wijziging aan de route: bewaren, opnieuw tekenen, oude meldingen weg. */
function changed() {
  delete $("send-status").dataset.result;
  warnings = new Map();
  $("lookup-status").textContent = "";
  persist();
  render();
}

/** @param {string} label @param {string} title @param {boolean} disabled @param {() => void} action */
function iconButton(label, title, disabled, action) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon";
  b.textContent = label;
  b.title = title;
  b.setAttribute("aria-label", title);
  b.disabled = disabled;
  b.addEventListener("click", action);
  return b;
}

/** @param {HTMLElement} element @param {string} text */
function flash(element, text) {
  const original = element.textContent;
  element.textContent = text;
  setTimeout(() => { element.textContent = original; }, 1500);
}

function render() {
  renderCode();
  renderRoutes();
  renderEditor();
}

if (!current() && state.routes.length > 0) state.selected = state.routes[0].id;
applyLanguage();
render();
