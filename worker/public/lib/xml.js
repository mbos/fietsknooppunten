// @ts-check
// Kleine, strikte XML-lezer: genoeg voor GPX, en werkt zowel in de browser als in Node
// (de tests), zonder DOMParser. Gooit een Error bij kapotte XML.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** @param {string} s */
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, ref) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return String.fromCodePoint(code);
    }
    const value = /** @type {Record<string, string>} */ (ENTITIES)[ref];
    if (value === undefined) throw new Error(`onbekende entiteit ${whole}`);
    return value;
  });
}

/**
 * Loopt door het document en roept per element en tekst een functie aan.
 * Elementnamen zonder namespace-prefix ("gpx:wpt" -> "wpt").
 * @param {string} xml
 * @param {{start?: (name: string, attributes: Record<string, string>) => void,
 *          end?: (name: string) => void, text?: (text: string) => void}} handler
 */
export function parseXml(xml, handler) {
  /** @type {string[]} */
  const stack = [];
  let sawRoot = false;
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    if (lt < 0) {
      if (xml.slice(i).trim()) throw new Error("tekst buiten het hoofdelement");
      break;
    }
    if (lt > i) {
      const text = xml.slice(i, lt);
      if (stack.length > 0) handler.text?.(decodeEntities(text));
      else if (text.trim()) throw new Error("tekst buiten het hoofdelement");
    }
    if (xml.startsWith("<!--", lt)) {
      i = indexAfter(xml, "-->", lt);
    } else if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt);
      if (end < 0) throw new Error("CDATA niet afgesloten");
      handler.text?.(xml.slice(lt + 9, end));
      i = end + 3;
    } else if (xml.startsWith("<?", lt)) {
      i = indexAfter(xml, "?>", lt);
    } else if (xml.startsWith("<!", lt)) {
      i = indexAfter(xml, ">", lt);
    } else if (xml.startsWith("</", lt)) {
      const end = indexAfter(xml, ">", lt);
      const name = localName(xml.slice(lt + 2, end - 1).trim());
      if (stack.pop() !== name) throw new Error(`onverwacht </${name}>`);
      handler.end?.(name);
      i = end;
    } else {
      const end = tagEnd(xml, lt);
      let body = xml.slice(lt + 1, end - 1);
      const selfClosing = body.endsWith("/");
      if (selfClosing) body = body.slice(0, -1);
      const match = /^([^\s/>]+)/.exec(body);
      if (!match) throw new Error("ongeldige tag");
      if (stack.length === 0 && sawRoot) throw new Error("meer dan één hoofdelement");
      sawRoot = true;
      const name = localName(match[1]);
      /** @type {Record<string, string>} */
      const attributes = {};
      const attr = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let a;
      while ((a = attr.exec(body.slice(match[0].length)))) {
        attributes[localName(a[1])] = decodeEntities(a[3] ?? a[4] ?? "");
      }
      stack.push(name);
      handler.start?.(name, attributes);
      if (selfClosing) {
        stack.pop();
        handler.end?.(name);
      }
      i = end;
    }
  }
  if (!sawRoot) throw new Error("leeg document");
  if (stack.length > 0) throw new Error(`<${stack.at(-1)}> niet afgesloten`);
}

/** Einde van een tag, rekening houdend met ">" binnen attribuutwaarden. @param {string} xml @param {number} from */
function tagEnd(xml, from) {
  let quote = "";
  for (let i = from + 1; i < xml.length; i++) {
    const c = xml[i];
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i + 1;
    }
  }
  throw new Error("tag niet afgesloten");
}

/** @param {string} xml @param {string} token @param {number} from */
function indexAfter(xml, token, from) {
  const end = xml.indexOf(token, from);
  if (end < 0) throw new Error(`${token} ontbreekt`);
  return end + token.length;
}

/** @param {string} name */
function localName(name) {
  return name.split(":").at(-1) ?? name;
}
