# VS Code Extension Publishing Best Practices

## Summary

Publishing a VS Code extension involves packaging with `vsce`, creating a publisher on the Visual Studio Marketplace, and optimizing the listing for discoverability. Key success factors include proper bundling, high-quality visuals (icon, banner, screenshots), strategic keyword/category selection, and maintaining a clean pre-publish workflow. As of December 2026, Microsoft is retiring global PATs in favor of Microsoft Entra ID–based authentication with workload identity federation for automated publishing.

---

## Publishing Workflow (vsce)

### Installation

```bash
npm install -g @vscode/vsce
```

### Core Commands

| Command | Purpose |
|---------|---------|
| `vsce package` | Create a `.vsix` file locally |
| `vsce publish` | Publish to the Marketplace |
| `vsce publish minor` | Auto-increment minor version and publish |
| `vsce publish 1.2.3` | Set specific version and publish |
| `vsce login <publisher>` | Authenticate with a PAT |
| `vsce unpublish <publisher>.<name>` | Remove from Marketplace (irreversible) |
| `vsce package --pre-release` | Package as pre-release |
| `vsce publish --pre-release` | Publish as pre-release |
| `vsce publish --target win32-x64` | Publish platform-specific build |
| `vsce publish --azure-credential` | Publish via Entra ID (recommended) |

### Authentication (Current Best Practice)

**Recommended (2026+):** Microsoft Entra ID with workload identity federation and managed identities — eliminates PATs entirely. Use `vsce publish --azure-credential` in CI/CD pipelines.

**Legacy (deprecated Dec 2026):** Personal Access Token (PAT) from Azure DevOps with "All accessible organizations" scope and Marketplace > Manage permission.

### Package Flow

1. Run `vscode:prepublish` script (typically compiles/bundles)
2. Validate `package.json` required fields
3. Check SVG restrictions (icon MUST NOT be SVG; README images must be HTTPS)
4. Package files (respects `.vscodeignore`)
5. Upload to Marketplace

---

## Marketplace Listing Optimization

### Icon

- **Minimum size:** 128×128 px (256×256 for Retina)
- **Format:** PNG only (SVG is explicitly forbidden)
- **Tips:** Simple, recognizable at small sizes, consistent with brand
- Set in `package.json`: `"icon": "images/icon.png"`

### Gallery Banner

Controls the header background on the Marketplace page:

```json
"galleryBanner": {
  "color": "#1e1e2e",
  "theme": "dark"
}
```

- `color`: hex value matching/complementing your icon
- `theme`: `"dark"` or `"light"` — controls text color in the banner

### Screenshots & Visuals

- High-quality screenshots can increase conversions by up to 80%
- Each image should focus on a single feature
- Use sharp, high-contrast graphics
- Remove distracting UI elements (taskbars, etc.)
- Standard dimensions: 1280×720 px (or 1366×768)
- Rename files with keywords (e.g., `code-sync-diff-view.png` not `screenshot1.png`)
- Include in README.md with relative paths (vsce resolves them via GitHub repo)

### Badges

Array of approved badges displayed in sidebar. Only trusted providers allowed:

```json
"badges": [
  {
    "url": "https://img.shields.io/visual-studio-marketplace/v/publisher.extension",
    "href": "https://marketplace.visualstudio.com/items?itemName=publisher.extension",
    "description": "VS Marketplace Version"
  }
]
```

**Approved badge domains include:** img.shields.io, badgen.net, codecov.io, snyk.io, circleci.com, travis-ci.com, app.fossa.io, badge.fury.io, vsmarketplacebadges.dev, and others.

### README & CHANGELOG

- `README.md` renders as the extension details page body
- `CHANGELOG.md` shows in a dedicated tab
- `SUPPORT.md` provides support information
- All image URLs must use HTTPS
- Relative links auto-resolve when `repository` field points to public GitHub repo

### Resource Links

```json
{
  "homepage": "https://github.com/user/repo",
  "bugs": { "url": "https://github.com/user/repo/issues" },
  "repository": { "type": "git", "url": "https://github.com/user/repo.git" }
}
```

---

## Categories and Tags Strategy

### Allowed Categories

Choose from this fixed list (use only those that genuinely apply):

- Programming Languages
- Snippets
- Linters
- Themes
- Debuggers
- Formatters
- Keymaps
- SCM Providers
- Other
- Extension Packs
- Language Packs
- Data Science
- Machine Learning
- Visualization
- Notebooks
- Education
- Testing

**Guidance:** Extensions in the same category are grouped together, improving filtering and discovery. You can specify multiple categories. `Language Packs` is reserved for localization extensions.

### Keywords (Tags)

- Max **30 keywords** (Marketplace hard limit — exceeding causes publish error)
- Keywords appear as "Tags" on the Marketplace page
- Include terms developers would search for
- Mix specific technical terms with broader use-case terms
- Don't repeat words already in your `displayName` or `description`
- Think about synonyms and abbreviations

**Example strategy for a sync extension:**
```json
"keywords": ["sync", "synchronize", "file sync", "backup", "multi-device", "settings sync", "workspace"]
```

---

## Version Management

### SemVer Required

All versions must be `major.minor.patch` format. SemVer pre-release tags (e.g., `1.0.0-beta.1`) are NOT supported by the Marketplace.

### Auto-Increment

```bash
vsce publish major    # 1.0.0 → 2.0.0
vsce publish minor    # 1.0.0 → 1.1.0
vsce publish patch    # 1.0.0 → 1.0.1
```

In a git repo, `vsce publish` also creates a version commit and tag automatically (via npm-version).

### Pre-Release Convention

VS Code auto-updates to the highest version number. Recommended convention:

| Channel | Minor Version | Example |
|---------|--------------|---------|
| Release | EVEN | `1.2.x`, `1.4.x` |
| Pre-release | ODD | `1.3.x`, `1.5.x` |

Always publish a new pre-release with a higher version than the latest release to prevent pre-release users from being downgraded.

### VS Code Engine Compatibility

```json
"engines": {
  "vscode": "^1.80.0"
}
```

- Use `^` prefix for minimum version compatibility
- Cannot be `*`
- Pre-release features require `>= 1.63.0`

---

## Pre-Publish Checklist

### Required Fields in package.json

- [ ] `name` — lowercase, no spaces, unique on Marketplace
- [ ] `displayName` — human-readable, unique on Marketplace
- [ ] `description` — concise explanation of what the extension does
- [ ] `version` — valid SemVer
- [ ] `publisher` — your publisher ID
- [ ] `engines.vscode` — minimum VS Code version (not `*`)

### Recommended Fields

- [ ] `icon` — PNG, 128×128+ px
- [ ] `galleryBanner` — color + theme
- [ ] `categories` — from allowed list
- [ ] `keywords` — up to 30 relevant terms
- [ ] `repository` — GitHub URL (enables relative link resolution)
- [ ] `license` — `"SEE LICENSE IN LICENSE.md"` or SPDX identifier
- [ ] `homepage`, `bugs` — resource links

### Files & Content

- [ ] `README.md` exists with good documentation and screenshots
- [ ] `CHANGELOG.md` exists with version history
- [ ] `LICENSE` file present
- [ ] `.vscodeignore` configured to exclude dev files
- [ ] Extension is bundled (webpack/esbuild) to reduce file count
- [ ] All README/CHANGELOG images use HTTPS URLs
- [ ] No SVG images (except from approved badge providers)
- [ ] No secrets, personal info, or development artifacts in package

### Build & Test

- [ ] `vscode:prepublish` script compiles/bundles successfully
- [ ] Extension activates and runs correctly
- [ ] All tests pass
- [ ] `vsce package` succeeds without warnings
- [ ] Resulting `.vsix` file size is reasonable
- [ ] Tested on minimum supported VS Code version

### Marketplace

- [ ] Publisher account created and verified via `vsce login`
- [ ] Extension name not already taken
- [ ] displayName not already taken
- [ ] Consider verified publisher status (requires 6 months + eligible domain)

---

## Common Mistakes to Avoid

| Mistake | Impact | Fix |
|---------|--------|-----|
| Using SVG as icon | Publish rejected | Use PNG 128×128+ |
| Not bundling (thousands of files) | Slow install, poor UX, warning | Use webpack/esbuild, add `.vscodeignore` |
| Exceeding 30 keywords | Publish error | Trim to most relevant 30 |
| Using `*` for `engines.vscode` | Publish rejected | Specify minimum version with `^` |
| Selecting specific org for PAT | 403 Forbidden on publish | Use "All accessible organizations" |
| Wrong PAT scope | 401 Unauthorized | Set Marketplace > Manage scope |
| Forgetting `.vscodeignore` | Huge package with source, tests, node_modules | Add comprehensive ignore patterns |
| Not setting `vscode:prepublish` | Shipping uncompiled code | Add build/bundle step |
| Ignoring the entrypoint in `.vscodeignore` | "Extension entrypoint(s) missing" error | Ensure `!out/**` or `!dist/**` is in `.vscodeignore` |
| Using same version for release and pre-release | Users get wrong channel | Use even/odd minor convention |
| Publishing from Windows | POSIX file attributes lost | Publish from Linux/macOS, or test on target OS |
| Reusing a removed extension name | Publish error | Names are permanently reserved after removal |
| Not testing minimum VS Code version | Extension fails for some users | Test with the version in `engines.vscode` |
| HTTP image URLs in README | Images blocked/broken | Use HTTPS only |

---

## Sources

| Source | URL | Notes |
|--------|-----|-------|
| VS Code Publishing Extensions (official) | https://code.visualstudio.com/api/working-with-extensions/publishing-extension/ | Definitive guide, covers vsce, PAT, Entra ID, pre-release |
| VS Code Extension Manifest (official) | https://code.visualstudio.com/api/references/extension-manifest/ | All package.json fields, categories, badges, icon specs |
| VS Code Bundling Extensions (official) | https://code.visualstudio.com/api/working-with-extensions/bundling-extension | Webpack/esbuild bundling guide |
| Developer Marketplace Optimization (daily.dev) | https://business.daily.dev/resources/developer-marketplace-optimization-aws-azure-vs-code-stores/ | Cross-marketplace optimization tips, visuals, pricing |
| Pre-Release Convention (intersystems wiki) | https://github.com/intersystems-community/vscode-objectscript/wiki/Pre-Releases | Even/odd minor version strategy example |
| DIY VS Code Extension: Publish (dev.to) | https://dev.to/256hz/diy-vs-code-extension-2-publish-1d00 | Practical walkthrough of publishing flow |
| Publishing Your Extensions (dev.to) | https://dev.to/shiftescape/publishing-your-extensions-to-visual-studio-marketplace-49ma | Step-by-step guide |
| Mintlify VS Code Publishing Mirror | https://microsoft-vscode-10.mintlify.app/extensions/publishing | Alternative formatting of official docs |
| VS Code Marketplace Management | https://marketplace.visualstudio.com/manage | Publisher portal for managing extensions |
| PAT Retirement Notice (Microsoft) | https://devblogs.microsoft.com/devops/retirement-of-global-personal-access-tokens-in-azure-devops/ | Dec 2026 deadline for PAT retirement |
