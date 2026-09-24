/** Static SVG data. Provider code and icon packs are never fetched by the library. */
export interface IconData {
  body: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  rotate?: number;
  hFlip?: boolean;
  vFlip?: boolean;
}
export interface IconSet extends Omit<IconData, 'body'> {
  prefix: string;
  icons: Record<string, IconData>;
  aliases?: Record<string, Omit<IconData, 'body'> & { parent: string }>;
}
export interface FontAwesomeDefinition {
  icon: readonly [number, number, unknown, string, string | readonly string[]];
}
export type LucideNode = readonly (readonly [
  string,
  Readonly<Record<string, string | number | undefined>>,
])[];
export interface RegisteredIcon {
  readonly body: string;
  readonly viewBox: string;
}
const registry = new Map<string, RegisteredIcon>();
const listeners = new Set<(name: string) => void>();
const elements = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'defs',
  'clipPath',
  'mask',
  'linearGradient',
  'radialGradient',
  'stop',
  'use',
]);
const attributes = new Set([
  'd',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'points',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'transform',
  'vector-effect',
  'clip-rule',
  'clip-path',
  'mask',
  'id',
  'href',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'fx',
  'fy',
  'fr',
  'maskUnits',
  'maskContentUnits',
  'clipPathUnits',
  'viewBox',
  'preserveAspectRatio',
]);
const styleAttributes = new Set([
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'clip-path',
  'mask',
  'stop-color',
  'stop-opacity',
]);
function numeric(value: number | undefined, fallback: number, positive = false) {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || (positive && result <= 0))
    throw new TypeError('Icon dimensions must be finite, with positive width and height.');
  return result;
}
function validName(name: string) {
  if (!/^[a-zA-Z0-9][\w:.-]*$/.test(name))
    throw new TypeError(
      'Icon names must contain letters, digits, colons, dots, underscores or hyphens.',
    );
}
function safeAttribute(element: Element, name: string, value: string) {
  if (!attributes.has(name)) throw new TypeError(`Unsupported SVG attribute: ${name}`);
  if (/\\|\/\*|\*\/|(?:var|env|attr)\s*\(/i.test(value))
    throw new TypeError('Icon attributes must use explicit static values.');
  if (/url\s*\(/i.test(value) && !/^url\(#[\w.-]+\)$/.test(value))
    throw new TypeError('Icon URLs must be local fragment references.');
  if (name === 'href' && !/^#[\w.-]+$/.test(value))
    throw new TypeError('Icon references must be local fragments.');
  if (name === 'id' && !/^[\w.-]+$/.test(value))
    throw new TypeError('Invalid icon fragment identifier.');
  element.setAttribute(name, value);
}
function sanitize(svg: string): RegisteredIcon {
  if (svg.startsWith('data:')) {
    const comma = svg.indexOf(',');
    const format = svg.slice(0, comma);
    if (!/^data:image\/svg\+xml(?:;charset=utf-8)?(?:;(?:utf8|base64))?$/i.test(format))
      throw new TypeError('Only static SVG data URIs are supported.');
    const value = svg.slice(comma + 1);
    try {
      svg = format.endsWith(';base64')
        ? new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)))
        : value.trimStart().startsWith('<')
          ? value
          : decodeURIComponent(value);
    } catch {
      throw new TypeError('Invalid SVG data URI.');
    }
  }
  if (svg.length > 250_000 || /<!DOCTYPE|<!ENTITY/i.test(svg))
    throw new TypeError('Invalid or oversized SVG icon.');
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const source = document.documentElement;
  if (source.localName !== 'svg' || document.querySelector('parsererror'))
    throw new TypeError('Icon must be valid SVG.');
  const viewBox =
    source.getAttribute('viewBox') ??
    `0 0 ${parseFloat(source.getAttribute('width') ?? '24')} ${parseFloat(source.getAttribute('height') ?? '24')}`;
  const box = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box.length !== 4 || box.some((v) => !Number.isFinite(v)) || box[2] <= 0 || box[3] <= 0)
    throw new TypeError('Icon requires a valid viewBox.');
  const copy = (node: Element, root = false): Element => {
    if (!elements.has(node.localName))
      throw new TypeError(`Unsupported SVG element: ${node.localName}`);
    const clean = document.createElementNS(
      'http://www.w3.org/2000/svg',
      root ? 'g' : node.localName,
    );
    for (const attribute of node.attributes) {
      const { name, value } = attribute;
      if (
        name.startsWith('xmlns') ||
        name === 'class' ||
        name === 'role' ||
        name === 'focusable' ||
        name.startsWith('aria-') ||
        (root && ['viewBox', 'width', 'height', 'version'].includes(name))
      )
        continue;
      if (name === 'style') {
        for (const entry of value.split(';').filter((part) => part.trim())) {
          const index = entry.indexOf(':');
          const property = entry.slice(0, index).trim();
          if (!styleAttributes.has(property))
            throw new TypeError(`Unsupported SVG style: ${property}`);
          safeAttribute(clean, property, entry.slice(index + 1).trim());
        }
      } else safeAttribute(clean, name === 'xlink:href' ? 'href' : name, value);
    }
    for (const child of node.children) {
      // Accessible names belong to t-icon.label, not provider metadata.
      if (['title', 'desc', 'metadata'].includes(child.localName)) continue;
      clean.append(copy(child));
    }
    return clean;
  };
  return Object.freeze({
    body: new XMLSerializer().serializeToString(copy(source, true)),
    viewBox: box.join(' '),
  });
}
function svgForData(data: IconData): string {
  const width = numeric(data.width, 16, true),
    height = numeric(data.height, 16, true);
  const left = numeric(data.left, 0),
    top = numeric(data.top, 0);
  const rotate = ((numeric(data.rotate, 0) % 4) + 4) % 4;
  if (!Number.isInteger(rotate)) throw new TypeError('Icon rotation must use quarter turns.');
  let body = data.body;
  if (data.hFlip || data.vFlip)
    body = `<g transform="translate(${data.hFlip ? width + 2 * left : 0} ${data.vFlip ? height + 2 * top : 0}) scale(${data.hFlip ? -1 : 1} ${data.vFlip ? -1 : 1})">${body}</g>`;
  if (rotate)
    body = `<g transform="rotate(${rotate * 90} ${left + width / 2} ${top + height / 2})">${body}</g>`;
  const x = rotate % 2 ? left + (width - height) / 2 : left;
  const y = rotate % 2 ? top + (height - width) / 2 : top;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${rotate % 2 ? height : width} ${rotate % 2 ? width : height}">${body}</svg>`;
}
/** Register one local SVG or Iconify icon. Existing mounted icons update immediately. */
export function registerIcon(name: string, data: string | IconData) {
  validName(name);
  const icon = sanitize(typeof data === 'string' ? data : svgForData(data));
  registry.set(name, icon);
  for (const listener of listeners) listener(name);
}
/** Remove an application icon. Components return to their built-in fallback. */
export function unregisterIcon(name: string) {
  if (registry.delete(name)) for (const listener of listeners) listener(name);
}
/** Accept official Font Awesome icon definitions without its rendering runtime. */
export function registerFontAwesomeIcon(name: string, definition: FontAwesomeDefinition) {
  const [width, height, , , paths] = definition.icon;
  const values = typeof paths === 'string' ? [paths] : paths;
  const document = new DOMParser().parseFromString(
    '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'image/svg+xml',
  );
  for (const path of values) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    node.setAttribute('d', path);
    document.documentElement.append(node);
  }
  registerIcon(name, { width, height, body: document.documentElement.innerHTML });
}
/** Accept Lucide's exported IconNode arrays. */
export function registerLucideIcon(name: string, nodes: LucideNode) {
  const document = new DOMParser().parseFromString(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'image/svg+xml',
  );
  for (const [tag, attrs] of nodes) {
    if (!elements.has(tag)) throw new TypeError(`Unsupported SVG element: ${tag}`);
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs))
      if (key !== 'key' && value !== undefined) safeAttribute(element, key, String(value));
    document.documentElement.append(element);
  }
  registerIcon(name, new XMLSerializer().serializeToString(document.documentElement));
}
/** Register selected names, or an entire local Iconify JSON set. No network requests. */
export function registerIconSet(
  set: IconSet,
  names = [...Object.keys(set.icons), ...Object.keys(set.aliases ?? {})],
) {
  validName(set.prefix);
  const resolve = (name: string, seen = new Set<string>()): IconData => {
    if (seen.has(name)) throw new TypeError(`Circular icon alias: ${name}`);
    seen.add(name);
    const icon = Object.hasOwn(set.icons, name) ? set.icons[name] : undefined;
    if (icon) return { ...set, ...icon };
    const alias = set.aliases && Object.hasOwn(set.aliases, name) ? set.aliases[name] : undefined;
    if (!alias) throw new TypeError(`Unknown icon: ${name}`);
    const parent = resolve(alias.parent, seen);
    return {
      ...parent,
      ...alias,
      body: parent.body,
      rotate: (parent.rotate ?? 0) + (alias.rotate ?? 0),
      hFlip: !!parent.hFlip !== !!alias.hFlip,
      vFlip: !!parent.vFlip !== !!alias.vFlip,
    };
  };
  // Validate all selected data before replacing any registry entries.
  const entries = names.map((name) => {
    const key = `${set.prefix}:${name}`;
    validName(key);
    return [key, sanitize(svgForData(resolve(name)))] as const;
  });
  for (const [name, icon] of entries) registry.set(name, icon);
  for (const [name] of entries) for (const listener of listeners) listener(name);
}
/** @internal */
export const getRegisteredIcon = (name: string) => registry.get(name);
/** @internal */
export function subscribeIcons(listener: (name: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
