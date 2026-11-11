# Release preparation

The [GitHub repository](https://github.com/joelmeaders/terminalui) is public. Terminal Kit uses the [MIT License](../LICENSE). Third-party assets retain their own terms in [icon credits](icons.md).
The package name is `@joelmeaders/terminalui`. Version tags publish to GitHub Packages after CI passes.

## Local verification

Use Node 24.15 or newer within Node 24, Node 22.22.3 or newer within Node 22, or Node 26.
The Angular build uses TypeScript 6.0 and Angular compiler 22.1.

1. Run `npm ci`.
2. Run `npx playwright install`.
3. Run `npm run build` to create ESM, declarations, themes, standalone code, metadata, and adapters.
4. Run `npm run check` for formatting, types, browser behavior, stories, production visuals, size, and package checks.
5. Inspect the generated artifact with `npm pack --dry-run`.
6. Run `npm pack` to create a local installable tarball.

The external package test installs the tarball outside this repository. It verifies the license, all component exports, and strict NodeNext type resolution.
It also verifies all 57 React wrapper subpaths, their compatibility with the existing barrel, and retained bundle modules and required dependency closures for every native and React component, including named imports from the React barrel. It tests optional adapter imports, compiles an Angular AOT consumer, and checks standalone browser registration.
The test preserves its temporary consumer path in the output for inspection.

The runtime package depends only on Lit. Framework peers are optional and remain outside the core and standalone bundles.
The standalone bundle includes Lit. Report the complete catalog size without a fixed ceiling. Preserve features and use measurements to find unnecessary code.
The separate button and original three-control form scenarios use 8.5 KB and 10.5 KB gzip guards. The 2026-09-26 document-adoption and form fixes raised measured imports from 7,968 to 8,155 bytes and from 9,904 to 10,112 bytes. This is reviewed shared behavior; all component dependency closures remain independently checked from the installed package.
The React button scenarios use a 9,500-byte gzip guard for both direct and named barrel imports. They include Lit and the React adapter, but exclude the shared React runtime. Review these guards when features change; preserve features and use measurements to identify unnecessary code or unrelated retained modules.
These budgets exclude theme CSS and fonts. Run `npm run size` for current measurements.

## CI

Linux CI runs Oxlint, Prettier, types, behavior in three browsers, Storybook interactions, package installation, size, and site builds. Run `npm run lint` and `npm run format:check` locally for the same lint and format checks.
Windows CI runs production screenshot comparisons against Windows baselines.
Do not regenerate baselines to hide a defect. Review intended visual changes before accepting new images.
On `main`, both jobs must pass before the built Storybook deploys to [GitHub Pages](https://joelmeaders.github.io/terminalui/). Pull requests run the checks without publishing.

## Publish a version

1. Update the version in `package.json` and `package-lock.json`.
2. Run `npm run check` and inspect `npm pack --dry-run`.
3. Commit the version change and merge it into `main`.
4. Create and push a matching version tag, such as `v0.1.0`.

The tag workflow runs both CI jobs again. The publish job checks that the tag matches the package version and belongs to `main` history. It then builds and publishes with the repository's `GITHUB_TOKEN`. No stored npm publishing token is needed.

Publish each version only once. To release another change, increase the version and create a new tag. GitHub Packages requires a GitHub login and `read:packages` token for installation, even when the package is public. See [framework setup](frameworks.md).
