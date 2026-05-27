# Workout Tracker

[![Pages and Release](https://github.com/savutro/workout-tracker/actions/workflows/pages-release.yml/badge.svg)](https://github.com/savutro/workout-tracker/actions/workflows/pages-release.yml)
[![App Version](https://img.shields.io/github/v/tag/savutro/workout-tracker?label=app%20version&sort=semver)](https://github.com/savutro/workout-tracker/tags)
[![No Build](https://img.shields.io/badge/build-none-brightgreen)](#deployment)
[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

Workout Tracker is a small static web app for maintaining an exercise library, building reusable training plans, logging workouts, and reviewing progress over time. It is designed for GitHub Pages and runs directly from `index.html`; no package install or build step is required.

The app is published at [fit.savutro.dev](https://fit.savutro.dev) when GitHub Pages is configured for this repository.

## Features

- Exercise library with setup notes and a tracking type: reps x weight or time.
- Plan editor that references exercises from the library and stores target sets.
- Workout logging that starts from a plan, lets the user update sets, then updates the source plan after saving.
- Collapsible plan and history sections for mobile-friendly scanning.
- Progress view with metrics that only enable when they match the exercise type.
- Local JSON backup export/import.
- Light and dark mode.
- Schema-versioned local storage and import migrations.

## Data And Privacy

Workout data stays in the browser via `localStorage`. Nothing is sent to a server by the app.

Use **Backup** > **Export JSON** to download a backup and **Import JSON** to restore one. The current data schema is documented in [DATA_SCHEMA.md](DATA_SCHEMA.md).

## Project Layout

```text
index.html                       Static app entrypoint for GitHub Pages
CNAME                            Custom GitHub Pages domain
assets/css/styles.css            Application styling
assets/js/config.js              Version, schema, storage keys, metrics, links
assets/js/icons.js               Inline icon registry
assets/js/app.js                 Main application controller and data logic
DATA_SCHEMA.md                   Backup and local-storage schema
CHANGELOG.md                     Release notes generated/maintained for tags
VERSION                          Plain semantic version for release tooling
.github/workflows/pages-release.yml
                                  Validation, GitHub Pages deploys, releases
```

This structure keeps the app buildless while separating project metadata, icons, styles, and the main controller.

## Run Locally

Open `index.html` in a browser.

For a closer GitHub Pages preview, serve the folder with any static file server:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Development Checks

There is no build pipeline. The main automated check is JavaScript syntax validation:

```powershell
node --check assets/js/config.js
node --check assets/js/icons.js
node --check assets/js/app.js
```

The GitHub Actions workflow runs the same checks before deploying or creating releases.

## Deployment

Deployment is handled by [.github/workflows/pages-release.yml](.github/workflows/pages-release.yml).

The flow:

- Pull requests to `main`: validate only.
- Pushes to `main`: validate, upload the repository as a Pages artifact, deploy GitHub Pages.
- Tags like `v1.1.1`: validate and create a GitHub release from `CHANGELOG.md`.

The release job intentionally uploads no downloadable app artifacts because this project is a static GitHub Pages site.

## Release Workflow

This repository follows the release pattern introduced in `go-commit-tooling`:

1. Keep a plain semantic version in `VERSION`.
2. Maintain release notes in `CHANGELOG.md`.
3. Create release commits and annotated `vX.Y.Z` tags.
4. Let CI create the GitHub release from the tag and changelog section.

With `gct` from `go-commit-tooling`, the normal flow is:

```powershell
gct add
gct commit
gct release
```

`gct release` updates `VERSION`, updates `CHANGELOG.md`, creates the release commit, creates the tag, and pushes the branch and tag. The pushed tag triggers the GitHub release workflow.

For a manual release without `gct`:

```powershell
# update VERSION and CHANGELOG.md first
git add VERSION CHANGELOG.md
git commit -m "chore(release): v1.1.1"
git tag -a v1.1.1 -m "v1.1.1"
git push origin main
git push origin v1.1.1
```

## Versioning

Use semantic versioning:

- Patch: small fixes or UX polish.
- Minor: new app capabilities or schema-compatible data changes.
- Major: incompatible data schema or behavior changes.

When the data schema changes, update:

- `SCHEMA_VERSION` in `assets/js/config.js`
- storage key/migration logic when needed
- [DATA_SCHEMA.md](DATA_SCHEMA.md)
- `VERSION` and `CHANGELOG.md`

## License

GPLv3. See [LICENSE](LICENSE).
