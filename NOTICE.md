# Third-party source and integration

Research Workbench includes the complete source snapshot of **@copylee/dsh-office 1.2.0**, by Copy, from <https://github.com/copylee711/dsh-office> at commit `2069af2d6b2b2a9819321a73ea3427716b686608` (2026-11-04 import).

Copyright (c) 2026 Copy. This component is licensed under the MIT License. The complete license is retained in [vendor/copylee-office/LICENSE](vendor/copylee-office/LICENSE). All 36 upstream tracked files, including source, Windows helper, documentation, tests and assets, are retained unchanged. `UPSTREAM.json` records their SHA-256 hashes; builds verify every file before compiling.

The original Research Workbench code retains its existing UNLICENSED status. The imported component retains its MIT license; this integration does not claim its authorship or change that license. Bundled npm components and their notices are recorded in `lib/native-office.NOTICES.txt`; source comments carrying licenses are retained in the generated bundles.

## Integration changes

`scripts/build-native-office.mjs` applies explicit adapters during compilation; the source snapshot remains unchanged:

- Register the native Office component under `dsh-research-workbench/native-office`, with its own `research-native-office` settings entry. Its eight tools use `research_office_*`, so an already installed standalone plugin's `office_*` tools are not overwritten or removed. Usage guidance and tool references use the same prefix.
- Keep the upstream editing, formula/footnote, template, rendering, saving, silent mode, progress card, settings and model skill-guidance behavior. Preserve existing research data; proposals, slides and IP pages now use a file-upload workflow.
- Move app/document status to an authenticated Connection POST route, `/api/research-workbench/office/status`. The upstream raw GET endpoint is not exposed by this integration.
- Reuse DSH's React and its settings API. Keep the upstream settings page, rename its label to Office / WPS, namespace its accent variables/storage, and omit the DOM-scanning navigation icon replacement. DSH keeps its normal navigation icon.
- Namespace the helper cache and PID notes as `research-workbench-office`. Remove stale-PID process killing at helper startup; another running helper or a reused PID must not cause someone else's Office process to be terminated. Normal cleanup still applies only to documents/instances this helper owns.
- Refuse an in-place save of a read-only document immediately with READ_ONLY, avoiding an invisible Save As dialog and a helper timeout; explicit save-to-another-path still uses upstream behavior.
- Track in-flight native Office commands, including silent-mode saves and closes after an agent becomes idle. The plugin updater waits for this work to finish before replacing code. When several Office agents are active, wait for all of them to become idle before settling shared background documents.
- Provide the same helper/settings as `researchOffice` to the authenticated research file API, so native preview/open/save operations share the model tools' runtime and activity tracking.
- Defer silent-mode cleanup until an in-progress UI open/render/read or save transaction has finished, then recheck that no Office agent resumed work.
- Bundle the needed npm libraries at build time. The installed research plugin does not need a separate @copylee/dsh-office package, TypeScript, Python or LibreOffice to use native Office; Windows and a working Microsoft Office/WPS installation are required.

Updates to this snapshot must record a new upstream commit, verify license/provenance, revise the adapters and rerun both upstream and integration tests. Do not manually edit snapshot files to make their hashes pass.

The local-file UI bundles icons from @tabler/icons-react 3.50.0 under MIT. Its complete license is packaged in `lib/file-client.NOTICES.txt`. The UI reuses DSH's React and native Conversation Factory; no React runtime is bundled.
