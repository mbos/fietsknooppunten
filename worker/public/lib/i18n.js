// @ts-check
// Teksten van de webapp in het Nederlands en Engels. Standaard Nederlands; de pagina kiest
// bij het starten de taal van de browser of de taal die de gebruiker eerder koos.

/** @typedef {"nl" | "en"} Language */

const nl = {
  "page.title": "Knooppunten",
  "page.description": "Fietsknooppuntenroutes naar je Garmin-horloge sturen.",
  "page.lead": "Stuur een fietsknooppuntenroute naar je Garmin-horloge.",
  "store.before": "Je hebt de gratis horloge-app nodig:",
  "store.link": "Knooppunten in de Connect IQ Store",
  "language.switch": "English",
  "language.switchLabel": "Switch to English",
  "code.title": "Je koppelcode",
  "code.intro": "Met deze code vindt het horloge jouw routes. Vul hem één keer in op je telefoon:",
  "code.path": "Garmin Connect › Apparaten › je horloge › Connect IQ-apps › Knooppunten › Instellingen › Koppelcode",
  "code.copy": "Kopieer",
  "code.copied": "Gekopieerd",
  "code.copyFailed": "Selecteer en kopieer zelf",
  "code.other": "Andere code gebruiken",
  "code.otherHint": "Gebruik je de app ook op een ander apparaat? Vul dan daar dezelfde code in, dan komen je routes bij hetzelfde horloge.",
  "code.otherLabel": "Koppelcode",
  "code.use": "Gebruik deze code",
  "code.invalid": "Dat is geen geldige koppelcode: 16 letters en cijfers, bv. k7m2-x9qp-4tvw-hc3d.",
  "plan.title": "Route plannen",
  "plan.before": "Plan je route in de",
  "plan.link": "ANWB Fietsknooppuntenplanner",
  "plan.after": "en exporteer hem als GPX. Importeer dat bestand hieronder: dan gaan ook de afslagen mee naar je horloge. Of typ zelf de knooppuntnummers in.",
  "routes.title": "Routes",
  "routes.import": "GPX importeren",
  "routes.new": "Nieuwe route",
  "routes.empty": "Nog geen routes. Maak een nieuwe route.",
  "routes.newName": "Nieuwe route",
  "routes.untitled": "Naamloos",
  /** @param {number} n */
  "routes.count": (n) => (n === 1 ? "1 knooppunt" : `${n} knooppunten`),
  "import.tooLarge": "Dit bestand is te groot voor een GPX-route (meer dan 20 MB).",
  /** @param {string} reason */
  "import.unreadable": (reason) => `Het bestand kon niet worden gelezen (${reason}).`,
  "editor.title": "Route bewerken",
  "editor.name": "Naam",
  "editor.addPlaceholder": "Knooppunten toevoegen, bv. 93 99 94",
  "editor.addLabel": "Knooppunten toevoegen",
  "editor.add": "Toevoegen",
  "editor.empty": "Nog geen knooppunten. Typ de nummers in volgorde en druk op Enter.",
  /** @param {string} tokens */
  "editor.invalidNumbers": (tokens) => `Geen geldig knooppuntnummer (1–99): ${tokens}`,
  "editor.track": "Met GPX-track: het horloge toont ook de afslagen en waarschuwt als je van de route raakt.",
  "step.noLocation": "geen locatie",
  /** @param {number} i */
  "step.label": (i) => `Knooppunt ${i}`,
  /** @param {number} i */
  "step.up": (i) => `Knooppunt ${i} omhoog`,
  /** @param {number} i */
  "step.down": (i) => `Knooppunt ${i} omlaag`,
  /** @param {number} i */
  "step.remove": (i) => `Knooppunt ${i} verwijderen`,
  /** @param {number} missing @param {number} total */
  "lookup.intro": (missing, total) => `${missing} van ${total} knooppunten hebben nog geen locatie.`,
  "lookup.introAnchor": "Een omgeving is niet nodig: de app zoekt rond de knooppunten die al een locatie hebben.",
  "lookup.introPlace": "Kies de omgeving waar de route ligt.",
  "lookup.placeLabel": "Omgeving",
  "lookup.placeholder": "Omgeving, bv. Rosmalen",
  "lookup.placeholderOptional": "Omgeving (niet nodig)",
  "lookup.button": "Zoek locaties",
  "lookup.hint": "Knooppuntnummers komen in elke regio terug. De app zoekt binnen 40 km van de omgeving en kiest bij dubbele nummers de kortste route.",
  "lookup.loading": "Knooppunten laden…",
  /** @param {string} name */
  "lookup.placeNotFound": (name) => `Plaats "${name}" niet gevonden in Nederland of België.`,
  "lookup.choosePlace": "Kies eerst de omgeving waar de route ligt.",
  /** @param {number} from @param {number} to */
  "lookup.noConnection": (from, to) => `Geen fietsverbinding bekend van ${from} naar ${to}; controleer de volgorde.`,
  /** @param {number} located @param {number} total */
  "lookup.located": (located, total) => `${located} van ${total} knooppunten hebben een locatie.`,
  /** @param {string} numbers */
  "lookup.notFound": (numbers) => `Niet gevonden binnen 40 km: ${numbers}.`,
  /** @param {string} pairs */
  "lookup.unconnected": (pairs) => `Geen verbinding bekend tussen ${pairs} (⚠ in de lijst); de route kan wel verstuurd worden.`,
  /** @param {string} reason */
  "lookup.loadFailed": (reason) => `Het knooppuntbestand kon niet worden geladen (${reason}). Controleer je internet.`,
  /** @param {string} place @param {string} other */
  "place.near": (place, other) => `${place}, bij ${other}`,
  "send.button": "Verstuur naar horloge",
  "send.delete": "Route verwijderen",
  "send.confirmDelete": "Echt verwijderen?",
  /** @param {number} missing @param {number} total */
  "send.missing": (missing, total) => `${missing} van ${total} knooppunten hebben nog geen locatie. Zoek ze hierboven op om de route te kunnen versturen.`,
  "send.ready": "Klaar om te versturen.",
  "send.sending": "Versturen…",
  /** @param {string} time */
  "send.sent": (time) => `Verstuurd om ${time}. Open Knooppunten op het horloge, of kies daar Route ophalen in het menu.`,
  "send.offline": "Geen verbinding met de server. Controleer je internet en probeer het opnieuw.",
  "send.unauthorized": "De koppelcode is ongeldig. Maak een nieuwe code of controleer de ingevulde code.",
  /** @param {string} reason */
  "send.rejected": (reason) => `De server weigert de route (${reason || "ongeldig formaat"}).`,
  "send.tooLarge": "De route is te groot om te versturen.",
  "send.tooMany": "Je hebt vandaag te vaak verstuurd. Probeer het morgen opnieuw.",
  /** @param {number} status */
  "send.server": (status) => `De server gaf een fout (HTTP ${status}). Probeer het later opnieuw.`,
  "gpx.noJunctions": 'Dit GPX-bestand bevat geen knooppunten. Verwacht worden waypoints met een naam als "Knooppunt 93".',
  /** @param {string} reason */
  "gpx.invalid": (reason) => `Dit is geen leesbaar GPX-bestand (${reason}).`,
  "gpx.noRoot": "geen <gpx>-element",
  "footer.privacy": "Privacy",
  "footer.privacyHref": "privacy.html",
  "footer.data": "Knooppuntdata ©",
  "footer.contributors": "OpenStreetMap-bijdragers",
  "time.locale": "nl-NL",
};

/** @type {typeof nl} */
const en = {
  "page.title": "Knooppunten",
  "page.description": "Send cycling junction routes to your Garmin watch.",
  "page.lead": "Send a cycling junction route (fietsknooppunten) to your Garmin watch.",
  "store.before": "You need the free watch app:",
  "store.link": "Knooppunten in the Connect IQ Store",
  "language.switch": "Nederlands",
  "language.switchLabel": "Schakel naar Nederlands",
  "code.title": "Your pairing code",
  "code.intro": "With this code your watch finds your routes. Enter it once on your phone:",
  "code.path": "Garmin Connect › Devices › your watch › Connect IQ apps › Knooppunten › Settings › Pairing code",
  "code.copy": "Copy",
  "code.copied": "Copied",
  "code.copyFailed": "Select and copy it yourself",
  "code.other": "Use another code",
  "code.otherHint": "Using the app on another device too? Enter the same code there, so your routes go to the same watch.",
  "code.otherLabel": "Pairing code",
  "code.use": "Use this code",
  "code.invalid": "That is not a valid pairing code: 16 letters and digits, e.g. k7m2-x9qp-4tvw-hc3d.",
  "plan.title": "Plan a route",
  "plan.before": "Plan your route in the",
  "plan.link": "ANWB cycling junction planner",
  "plan.after": "(Dutch) and export it as GPX. Import that file below: the turns then go to your watch as well. Or type the junction numbers yourself.",
  "routes.title": "Routes",
  "routes.import": "Import GPX",
  "routes.new": "New route",
  "routes.empty": "No routes yet. Create a new route.",
  "routes.newName": "New route",
  "routes.untitled": "Untitled",
  "routes.count": (n) => (n === 1 ? "1 junction" : `${n} junctions`),
  "import.tooLarge": "This file is too large for a GPX route (more than 20 MB).",
  "import.unreadable": (reason) => `The file could not be read (${reason}).`,
  "editor.title": "Edit route",
  "editor.name": "Name",
  "editor.addPlaceholder": "Add junctions, e.g. 93 99 94",
  "editor.addLabel": "Add junctions",
  "editor.add": "Add",
  "editor.empty": "No junctions yet. Type the numbers in order and press Enter.",
  "editor.invalidNumbers": (tokens) => `Not a valid junction number (1–99): ${tokens}`,
  "editor.track": "With GPX track: the watch also shows the turns and warns you when you go off route.",
  "step.noLocation": "no location",
  "step.label": (i) => `Junction ${i}`,
  "step.up": (i) => `Move junction ${i} up`,
  "step.down": (i) => `Move junction ${i} down`,
  "step.remove": (i) => `Remove junction ${i}`,
  "lookup.intro": (missing, total) => `${missing} of ${total} junctions have no location yet.`,
  "lookup.introAnchor": "No area needed: the app searches around the junctions that already have a location.",
  "lookup.introPlace": "Choose the area where the route is.",
  "lookup.placeLabel": "Area",
  "lookup.placeholder": "Area, e.g. Rosmalen",
  "lookup.placeholderOptional": "Area (not needed)",
  "lookup.button": "Find locations",
  "lookup.hint": "Junction numbers repeat in every region. The app searches within 40 km of the area and, for duplicate numbers, picks the shortest route.",
  "lookup.loading": "Loading junctions…",
  "lookup.placeNotFound": (name) => `Place "${name}" not found in the Netherlands or Belgium.`,
  "lookup.choosePlace": "First choose the area where the route is.",
  "lookup.noConnection": (from, to) => `No known cycling connection from ${from} to ${to}; check the order.`,
  "lookup.located": (located, total) => `${located} of ${total} junctions have a location.`,
  "lookup.notFound": (numbers) => `Not found within 40 km: ${numbers}.`,
  "lookup.unconnected": (pairs) => `No known connection between ${pairs} (⚠ in the list); you can still send the route.`,
  "lookup.loadFailed": (reason) => `The junction file could not be loaded (${reason}). Check your internet connection.`,
  "place.near": (place, other) => `${place}, near ${other}`,
  "send.button": "Send to watch",
  "send.delete": "Delete route",
  "send.confirmDelete": "Really delete?",
  "send.missing": (missing, total) => `${missing} of ${total} junctions have no location yet. Find them above to be able to send the route.`,
  "send.ready": "Ready to send.",
  "send.sending": "Sending…",
  "send.sent": (time) => `Sent at ${time}. Open Knooppunten on your watch, or choose Get route in its menu.`,
  "send.offline": "No connection to the server. Check your internet connection and try again.",
  "send.unauthorized": "The pairing code is invalid. Create a new code or check the code you entered.",
  "send.rejected": (reason) => `The server rejected the route (${reason || "invalid format"}).`,
  "send.tooLarge": "The route is too large to send.",
  "send.tooMany": "You have sent too often today. Please try again tomorrow.",
  "send.server": (status) => `The server returned an error (HTTP ${status}). Please try again later.`,
  "gpx.noJunctions": 'This GPX file contains no junctions. Expected waypoints named like "Knooppunt 93".',
  "gpx.invalid": (reason) => `This is not a readable GPX file (${reason}).`,
  "gpx.noRoot": "no <gpx> element",
  "footer.privacy": "Privacy",
  "footer.privacyHref": "privacy-en.html",
  "footer.data": "Junction data ©",
  "footer.contributors": "OpenStreetMap contributors",
  "time.locale": "en-GB",
};

export const dictionaries = { nl, en };

/** @type {Language} */
let current = "nl";

/** @param {Language} language */
export function setLanguage(language) {
  current = language;
}

export function language() {
  return current;
}

/** Nederlands voor nl-* (ook Vlaams), anders Engels. @param {readonly string[]} preferred */
export function detectLanguage(preferred) {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "nl") return "nl";
    if (base === "en") return "en";
  }
  return "en";
}

/**
 * Tekst in de huidige taal. Teksten met parameters zijn functies.
 * @template {keyof typeof nl} K
 * @param {K} key
 * @param {...any} args
 * @returns {string}
 */
export function t(key, ...args) {
  const value = dictionaries[current][key];
  return typeof value === "function" ? /** @type {(...a: any[]) => string} */ (value)(...args) : /** @type {string} */ (value);
}
