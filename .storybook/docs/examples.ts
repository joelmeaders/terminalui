import manifest from '../../dist/custom-elements.json';
import { guides, type ExampleNode } from './catalog';

export const frameworks = {
  html: 'HTML / JS / CSS',
  angular: 'Angular',
  vue: 'Vue',
  react: 'React',
} as const;
export type Framework = keyof typeof frameworks;
export interface ApiMember {
  name: string;
  kind?: string;
  privacy?: string;
  static?: boolean;
  readonly?: boolean;
  description?: string;
  type?: { text: string };
  default?: string;
  fieldName?: string;
  parameters?: { name: string; type?: { text: string }; optional?: boolean; default?: string }[];
  return?: { type?: { text: string } };
}
export interface ComponentApi {
  tagName: string;
  name: string;
  description?: string;
  members: ApiMember[];
  attributes: ApiMember[];
  events: ApiMember[];
  slots: ApiMember[];
  cssParts: ApiMember[];
  cssProperties: ApiMember[];
}
// Normalize the generated modules before flattening their different declaration shapes.
const modules: { declarations?: Partial<ComponentApi>[] }[] = manifest.modules;
export const components = modules
  .flatMap((module) => module.declarations ?? [])
  .filter((item) => typeof item.tagName === 'string')
  .map((item) => ({
    members: [],
    attributes: [],
    events: [],
    slots: [],
    cssParts: [],
    cssProperties: [],
    ...item,
  })) as ComponentApi[];
export const apiFor = (tag: string) => components.find((item) => item.tagName === tag);
const json = (value: unknown) => JSON.stringify(value, null, 2);
const escapeHtml = (value: unknown) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
export const className = (tag: string) => apiFor(tag)?.name ?? tag;
const attribute = (tag: string, property: string) =>
  apiFor(tag)?.attributes.find((a) => a.fieldName === property)?.name ?? property;
const isData = (value: unknown) => value !== null && typeof value === 'object';
const componentImports = (node: ExampleNode): string[] => [
  ...new Set([
    ...(node.tag.startsWith('t-') ? [node.tag] : []),
    ...(node.children ?? []).flatMap((child) =>
      typeof child === 'string' ? [] : componentImports(child),
    ),
  ]),
];
export const exampleCss = `.example {
  padding: 1rem;
  color: var(--t-text);
  background: var(--t-bg);
  font-family: var(--t-font);
}
/* Set shared tokens on the region, or use documented ::part() names. */
.example { --t-space: 16px; }`;

export function markup(
  node: ExampleNode,
  framework: Framework,
  root: boolean,
  additions: string[] = [],
  omit: string[] = [],
): string {
  const tag = framework === 'react' ? className(node.tag) : node.tag;
  const attrs = Object.entries(node.attrs ?? {}).map(([key, value]) => {
    if (framework === 'react' && key === 'style') {
      const style = Object.fromEntries(
        value
          .split(';')
          .filter(Boolean)
          .map((entry) => entry.trim().split(/:\s*/, 2)),
      );
      return `style={${json(style)} as React.CSSProperties}`;
    }
    return `${key === 'class' && framework === 'react' ? 'className' : key}="${escapeHtml(value)}"`;
  });
  for (const [key, value] of Object.entries(node.props ?? {})) {
    if (omit.includes(key)) continue;
    const attr = attribute(node.tag, key);
    if (framework === 'react') attrs.push(`${key}={${json(value)}}`);
    else if (isData(value)) {
      if (framework === 'angular') attrs.push(`[${key}]="${key}"`);
      if (framework === 'vue') attrs.push(`:${key}.prop="${key}"`);
    } else if (framework === 'angular' && (typeof value !== 'string' || attr !== key)) {
      attrs.push(`[${key}]="${escapeHtml(typeof value === 'string' ? `'${value}'` : value)}"`);
    } else if (framework === 'vue' && typeof value !== 'string')
      attrs.push(`:${key}.prop="${escapeHtml(value)}"`);
    else if (typeof value === 'boolean') {
      if (value) attrs.push(attr);
    } else attrs.push(`${attr}="${escapeHtml(value)}"`);
  }
  if (root) attrs.push(...additions);
  const opening = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
  if (
    [
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr',
    ].includes(node.tag)
  ) {
    if (node.children?.length) throw new Error(`Void element ${node.tag} cannot have children.`);
    return `${opening}${framework === 'react' ? ' />' : '>'}`;
  }
  const children = (node.children ?? []).map((child) =>
    typeof child === 'string' ? escapeHtml(child) : markup(child, framework, false),
  );
  return `${opening}>${children.length ? `\n${children.map((c) => '  ' + c.replaceAll('\n', '\n  ')).join('\n')}\n` : ''}</${tag}>`;
}

/** Complete examples, generated from the same recipe for every framework. */
export function exampleFor(tag: string, framework: Framework): string {
  const guide = guides[tag];
  if (!guide) throw new Error(`Missing component guide: ${tag}`);
  const node = { tag, ...guide.example };
  const imports = componentImports(node);
  const type = className(tag);
  const module = `@joelmeaders/hullframe/components/${tag.slice(2)}`;
  const data = Object.entries(node.props ?? {}).filter(([, value]) => isData(value));
  const form = guide.form;
  const initial =
    form === 'files'
      ? null
      : form === 'checked'
        ? (node.props?.checked ?? false)
        : form === 'values'
          ? (node.props?.values ?? [])
          : tag === 't-tags-input'
            ? JSON.stringify(node.props?.values ?? [])
            : (node.props?.value ?? '');
  const omitted = form ? [form, ...(tag === 't-tags-input' ? ['values'] : [])] : [];
  const event = guide.event;
  const needsElementType =
    (framework !== 'angular' && !!form) ||
    !!guide.action ||
    (!form && !!event?.read.startsWith('target.'));
  const typeImport = needsElementType ? `import type { ${type} } from '${module}';\n` : '';
  const customDetail = event?.read.startsWith('detail.') ? event.read.slice(7) : undefined;
  const eventRead = event?.read.startsWith('target.')
    ? `(event.target as ${type}).${event.read.slice(7)}`
    : customDetail
      ? `(event as CustomEvent<{ ${customDetail}: unknown }>).detail.${customDetail}`
      : event?.read === 'detail'
        ? '(event as CustomEvent<unknown>).detail'
        : `event.${event?.read ?? 'type'}`;
  const showArgs = (opener: string) => (tag === 't-toast' ? `undefined, ${opener}` : opener);
  const registration = imports
    .map((name) => `import '@joelmeaders/hullframe/components/${name.slice(2)}';`)
    .join('\n');
  if (framework === 'html') {
    const setup = [
      `import '/assets/hullframe.js';`,
      ...(event || data.length || guide.action
        ? [`const element = document.querySelector('${tag}');`]
        : []),
      ...data.map(([key, value]) => `element.${key} = ${json(value)};`),
      ...(event
        ? [
            `element.addEventListener('${event.name}', (event) => {\n  console.log(event.${event.read});\n});`,
          ]
        : []),
      ...(guide.action
        ? [
            `document.querySelector('#open-example').addEventListener('click', (event) => {\n  element.show(${showArgs('event.currentTarget')});\n});`,
          ]
        : []),
    ].join('\n\n');
    return `<!-- Copy dist/hullframe.js and dist/themes.css to your public /assets directory. -->\n<link rel="stylesheet" href="/assets/themes.css">\n<style>\n${exampleCss}\n</style>\n<main class="example" data-theme="amber">\n${guide.action ? `  <button id="open-example" type="button">${guide.action.label}</button>\n` : ''}${markup(
      node,
      framework,
      true,
    )
      .split('\n')
      .map((l) => '  ' + l)
      .join('\n')}\n</main>\n<script type="module">\n${setup}\n</script>`;
  }
  if (framework === 'react') {
    const additions: string[] = [];
    if (form)
      additions.push(
        `${form}={value}`,
        `${form === 'value' || form === 'values' ? 'onInput' : 'onChange'}={(event) => setValue((event.target as ${type}).${form})}`,
      );
    else if (event)
      additions.push(
        `on${event.name
          .split('-')
          .map((p) => p[0].toUpperCase() + p.slice(1))
          .join(
            '',
          )}={(event) => console.log(${event.read.startsWith('detail') ? `event.${event.read}` : eventRead})}`,
      );
    if (guide.action) additions.push('ref={element}');
    const hooks = [form && 'useState', guide.action && 'useRef'].filter(Boolean);
    const declarations = [
      form &&
        `const [value, setValue] = useState${form === 'files' ? '<FileList | null>' : form === 'values' ? '<string[]>' : ''}(${json(initial)});`,
      guide.action && `const element = useRef<${type} | null>(null);`,
    ]
      .filter(Boolean)
      .join('\n  ');
    const wrappers = imports
      .map(
        (tag) =>
          `import { ${className(tag)} as ${className(tag)}View } from '@joelmeaders/hullframe/react/${tag.slice(2)}';`,
      )
      .join('\n');
    return `${hooks.length ? `import { ${hooks.join(', ')} } from 'react';\n` : ''}${JSON.stringify(node).includes('style') ? "import type * as React from 'react';\n" : ''}${wrappers}\n${typeImport}import '@joelmeaders/hullframe/themes.css';\nimport './example.css';\n\nexport function Example() {\n  ${declarations}\n  return (\n    <main className="example" data-theme="amber">\n      ${guide.action ? `<button type="button" onClick={(event) => element.current?.show(${showArgs('event.currentTarget')})}>${guide.action.label}</button>\n      ` : ''}${markup(node, framework, true, additions, omitted).replace(/<(\/?)(T\w+)/g, '<$1$2View')}\n    </main>\n  );\n}`;
  }
  if (framework === 'vue') {
    const usesRef = form || guide.action;
    const additions = usesRef ? ['ref="element"'] : [];
    if (event && !form) additions.push(`@${event.name}="onEvent"`);
    const declarations = [
      ...data
        .filter(([key]) => !omitted.includes(key))
        .map(([key, value]) => `const ${key} = ${json(value)};`),
      usesRef && `const element = ref<${type} | null>(null);`,
      form &&
        `const value = ref${form === 'files' ? '<FileList | null>' : ''}(${json(initial)});\nuseHullframeModel(element, value, '${form}');`,
      event && !form && `function onEvent(event: Event) { console.log(${eventRead}); }`,
      guide.action &&
        `function show(event: Event) { element.value?.show(${showArgs('event.currentTarget as HTMLElement')}); }`,
    ]
      .filter(Boolean)
      .join('\n');
    return `<script setup lang="ts">\n${usesRef ? "import { ref } from 'vue';\n" : ''}${form ? "import { useHullframeModel } from '@joelmeaders/hullframe/vue';\n" : ''}${registration}\n${typeImport}import '@joelmeaders/hullframe/themes.css';\n${declarations}\n</script>\n\n<template>\n  <main class="example" data-theme="amber">\n    ${guide.action ? `<button type="button" @click="show">${guide.action.label}</button>\n    ` : ''}${markup(node, framework, true, additions, omitted)}\n  </main>\n</template>\n\n<style>\n${exampleCss}\n</style>`;
  }
  const additions = form ? ['[formControl]="control"'] : [];
  if (event && !form) additions.push(`(${event.name})="onEvent($event)"`);
  if (guide.action) additions.push('#example');
  const declarations = [
    ...data
      .filter(([key]) => !omitted.includes(key))
      .map(([key, value]) => `${key} = ${json(value)};`),
    form &&
      `control = new FormControl${form === 'files' ? '<FileList | null>' : ''}(${json(initial)}${form === 'files' ? '' : ', { nonNullable: true }'});`,
    guide.action &&
      `@ViewChild('example', { read: ElementRef }) example?: ElementRef<${type}>;\n  show(event: Event) { this.example?.nativeElement.show(${showArgs('event.currentTarget as HTMLElement')}); }`,
    event && !form && `onEvent(event: Event) { console.log(${eventRead}); }`,
  ]
    .filter(Boolean)
    .join('\n  ');
  return `import { Component, CUSTOM_ELEMENTS_SCHEMA${guide.action ? ', ElementRef, ViewChild' : ''} } from '@angular/core';\n${form ? "import { FormControl, ReactiveFormsModule } from '@angular/forms';\nimport { HullframeValueAccessor } from '@joelmeaders/hullframe/angular';\n" : ''}${registration}\n${typeImport}\n@Component({\n  selector: 'app-example',\n  standalone: true,\n  schemas: [CUSTOM_ELEMENTS_SCHEMA],\n  ${form ? 'imports: [ReactiveFormsModule, HullframeValueAccessor],\n  ' : ''}template: \`\n    <main class="example" data-theme="amber">\n      ${guide.action ? `<button type="button" (click)="show($event)">${guide.action.label}</button>\n      ` : ''}${markup(node, framework, true, additions, omitted)}\n    </main>\n  \`,\n  styles: [\`${exampleCss}\`],\n})\nexport class Example {\n  ${declarations}\n}`;
}
