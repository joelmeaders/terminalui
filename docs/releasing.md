# Release preparation

This repository remains private and unpublished. Terminal Kit uses the [PolyForm Perimeter License 1.0.1](../LICENSE), a source-available license that bars competing products. It is not an OSI open source license. Third-party icon assets retain their own terms in [icon credits](icons.md).
No workflow publishes a package. A public release needs an owner-approved package name, registry, and version.

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

Linux CI runs formatting, types, behavior in three browsers, Storybook interactions, package installation, size, and site builds.
Windows CI runs production screenshot comparisons against Windows baselines.
Do not regenerate baselines to hide a defect. Review intended visual changes before accepting new images.
The workflow files require a connected repository before remote CI results exist.

## Public release decision

An owner must approve the registry identity and legal distribution details before publication.
Confirm that the license reflects the copyright holders' intended terms. Select a release version and remove `private` only after that decision.
Review the complete tarball and rerun all checks for that version. Publish only with explicit release authorization.
This preparation does not create a registry release, Git tag, deployment, or publishing credential.
