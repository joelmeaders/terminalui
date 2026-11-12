import { cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { format } from 'prettier';

const source = resolve('docs/icon-licenses');
const providers = (await readdir(source, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const labels = {
  bootstrap: 'Bootstrap Icons',
  'font-awesome': 'Font Awesome Free',
  heroicons: 'Heroicons',
  ionicons: 'Ionicons',
  lucide: 'Lucide and Feather',
  'material-symbols': 'Google Material Symbols',
  tabler: 'Tabler Icons',
};
const escapeHtml = (text) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
for (const provider of providers) {
  const file = await stat(resolve(source, provider, 'NOTICE'));
  if (!file.isFile()) throw new Error(`Missing NOTICE for ${provider}.`);
}
const html = await format(
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hullframe icon credits</title>
  <style>
    :root { color-scheme: dark; font: 16px/1.6 system-ui, sans-serif; }
    body { max-width: 52rem; margin: auto; padding: 2rem 1.25rem; background: #101318; color: #edf1f5; }
    a { color: #a6d9ff; text-underline-offset: .2em; }
    a:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
    li { margin-block: .65rem; }
    h1 { line-height: 1.2; }
  </style>
</head>
<body>
  <main>
    <h1>Icon credits</h1>
    <p>The Hullframe demonstration uses selected icons from these providers. Each notice includes package versions, sample names, conversion notes, and the upstream license text.</p>
    <ul>
      ${providers.map((provider) => `<li><a href="${encodeURIComponent(provider)}/NOTICE">${escapeHtml(labels[provider] ?? provider)}</a></li>`).join('\n      ')}
    </ul>
    <p>Font Awesome SVG and JavaScript icon data uses CC BY 4.0. Lucide includes ISC and applicable Feather MIT notices. The other notices describe their individual licenses.</p>
    <p>Names and marks belong to their respective owners. These notices cover the included icon assets, not the Hullframe application code.</p>
    <p><a href="../">Return to the demonstration</a></p>
  </main>
</body>
</html>
`,
  { parser: 'html', printWidth: 100, singleQuote: true },
);

await writeFile(resolve(source, 'index.html'), html.replace('href="../"', 'href="/"'));
for (const output of ['demo-dist', 'storybook-static']) {
  const directory = resolve(output);
  try {
    if (!(await stat(directory)).isDirectory()) throw new Error(`${output} is not a directory.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.log(`Skipped icon credits: ${output} does not exist. Build it first.`);
    continue;
  }
  const target = resolve(directory, 'icon-licenses');
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
  await writeFile(resolve(target, 'index.html'), html);
  console.log(
    `Copied ${providers.length} provider notices and readable credits to ${output}/icon-licenses/.`,
  );
}
