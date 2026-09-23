# Release preparation

This repository remains private and unpublished. `UNLICENSED` records the absence of an approved distribution license.
No workflow publishes a package. A public release needs an owner-approved package name, license, registry, and version.

## Local verification

Use Node 24.15 or newer within Node 24, Node 22.22.3 or newer within Node 22, or Node 26.
The Angular build uses TypeScript 6.0 and Angular compiler 22.1.

1. Run `npm ci`.
2. Run `npx playwright install`.
3. Run `npm run build` to create ESM, declarations, themes, standalone code, metadata, and adapters.
4. Run `npm run check` for formatting, types, browser behavior, stories, production visuals, size, and package checks.
5. Inspect the generated artifact with `npm pack --dry-run`.
6. Run `npm pack` to create a local installable tarball.

The external package test installs the tarball outside this repository. It verifies all component exports and strict NodeNext type resolution.
It also tests optional adapter imports, compiles an Angular AOT consumer, and checks standalone browser registration.
The test preserves its temporary consumer path in the output for inspection.

The runtime package depends only on Lit. Framework peers are optional and remain outside the core and standalone bundles.
The standalone bundle includes Lit. Its gzip budget is 35 KB for the complete catalog.
The separate button and original three-control form scenarios retain 8 KB and 9.5 KB gzip budgets.
These budgets exclude theme CSS and fonts. Run `npm run size` for current measurements.

## CI

Linux CI runs formatting, types, behavior in three browsers, Storybook interactions, package installation, size, and site builds.
Windows CI runs production screenshot comparisons against Windows baselines.
Do not regenerate baselines to hide a defect. Review intended visual changes before accepting new images.
The workflow files require a connected repository before remote CI results exist.

## Public release decision

An owner must approve the distribution license and registry identity before publication.
Set the approved license, select a release version, and remove `private` only after that decision.
Review the complete tarball and rerun all checks for that version. Publish only with explicit release authorization.
This preparation does not create a registry release, Git tag, deployment, or publishing credential.
