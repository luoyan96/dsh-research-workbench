# Release workflow · DSH Research Workbench

Current package name: **`dsh-research-workbench`**. This project is a native DSH plugin (not a generic npm library).

## Installing

Once `dsh-research-workbench` is **actually published** to the public npm registry:

```powershell
dsh plugin --profile web add dsh-research-workbench@latest
dsh web
```

Before the first npm publication, **a GitHub repository with the code pushed** also supports one-command installation:

```powershell
dsh plugin --profile web add "github:luoyan96/dsh-research-workbench#main"
dsh web
```

Do not use `@latest` until npm shows a published version. A local `npm pack` tarball is an npm package, but `npm pack` does **not** publish it to the registry.

## First npm publication (one-time, owner action)

The first publication needs an npmjs.com account authorized to claim this package name. Verify the name is available and never share your npm credentials or access token in chats or commits.

1. Push `main` to the GitHub repository; CI should pass. From a Windows terminal with Node/npm configured, run `npm login` in your project directory and complete npm's interactive browser/2FA flow.
2. Verify the package name and version: `npm pkg get name version`; then `npm run check` and `npm pack --dry-run`.
3. Publish the first version: `npm publish --access public`. This is an explicit, public, irreversible release of this version; use your own npm account.
4. On npmjs.com open the published package's **Settings → Trusted Publishing** and choose GitHub Actions. Enter:
   - Owner: `luoyan96`
   - Repository: `dsh-research-workbench`
   - Workflow filename: **`publish.yml`**
   - Allowed action: **`npm publish`**
   - Optional GitHub Environment: none (unless you separately configure one)
5. For later versions, update `package.json` / `package-lock.json`, merge tested changes into `main`, and create/push a matching version tag. The GitHub workflow publishes through OIDC; no long-lived `NPM_TOKEN` secret is required.

`publish.yml` deliberately triggers only on a version tag. It checks that the tag matches `package.json` before publishing and runs the same local tests and packing steps. `ci.yml` validates normal pushes to `main`.

Example for **a future new version**, after the version is incremented and committed:

```powershell
npm version patch
git push origin main --follow-tags
```

Do **not** run `npm version patch` before the **first** publish, otherwise npm will treat the initial version as skipped. Do not push a a version tag that triggers automatic publishing until the npm trusted publisher is configured.

## Repo permissions / limitations

- GitHub repository admin permissions shown by a connector do not guarantee it can write contents. `403 Resource not accessible by integration` means a GitHub App installation/permission must be corrected or the owner must push through authenticated Git locally.
- This plugin is `UNLICENSED` until its owner chooses an explicit source license. Public npm availability is not a license grant.
- The UI skeleton is not yet tested against your running Windows DSH instance, and does not yet implement LaTeX, PPT generation, experimental execution, or real project management.

Reference: <https://docs.npmjs.com/trusted-publishers/>.
