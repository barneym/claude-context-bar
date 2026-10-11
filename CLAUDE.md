# claude-context-bar: guidance for Claude Code

This is a public open-source Claude Code mod. The target is [docs/SPEC.md](docs/SPEC.md). If `HANDOFF.md` exists locally (it's gitignored), read it first: it holds the working context and references.

## Hard rules

1. **Keep the reach small.** Use only these mod APIs:
   - `ui.render` (`AbovePrompt`)
   - `$.session.usage`
   - `$.ui.resolve`
   - `$.command.register`
   - the commands it registers
   - state via `atom`/`read`/`update`
   - `$.store`, only for the shown/hidden flag

   No network, no file reads or writes, no processes, no `$.model.*`, and no parsing of prompt, tool or file text. If a feature needs more than this, stop and ask the maintainer.

2. **Nothing private in tracked files.** No personal paths, hostnames, IPs, emails or internal project names. The pre-commit hooks (gitleaks plus `scripts/check-private-info.sh`) enforce this. Never bypass them with `--no-verify`.

3. **Licensing.** Reference implementations are for learning only:
   - Code copied from an MIT-licensed project must keep that project's copyright notice; note it in `NOTICE`.
   - Code from a repository with no license must not be copied at all.

4. **Tests.** Every behavior in the spec gets a test.
   - Rendering logic: the number formatting, segment math and threshold colors must be pure functions, with unit tests.

5. **The README's "What it can reach" section must match the code.** Update it in the same commit as any change to the APIs used.
