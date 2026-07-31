# Dorothy — Engineering Conventions

Companion to `dorothy/SKILL.md`. Consult when writing shell scripts, invoking Go binaries on macOS, or working with test fixtures / container venvs. Rules only — incident history lives in your retro log.

## Shell scripting

- In `set -e` scripts, trailing conditionals like `[ "$x" -gt 0 ] && echo "msg"` return exit 1 when the condition is false, killing the script. Always append `|| true` to such lines.
- **The workspace shell is zsh, which does not word-split unquoted parameter expansions.** `set -- $spec` on `"owner/repo 123"` sets `$1` to the whole string and leaves `$2` unset — a loop built on it passes one mangled argument every iteration and the callee fails with `$2: unbound variable`. Use `read -r a b <<< "$spec"`, an explicit array, or `${=spec}` (zsh-only). Bash habits do not transfer.

## Go binaries and macOS DNS (`GODEBUG=netdns=go`)

Go binaries on macOS (`op`, `gh`) default to the CGO resolver → `getaddrinfo()` → `mDNSResponder`, which intermittently poisons its cache for specific domains (known Apple bug), causing DNS timeouts that look like network failures. Force Go's pure-Go resolver (reads `/etc/resolv.conf` directly, bypasses mDNSResponder):

```bash
# In scripts that call Go binaries:
GODEBUG=netdns=go op read "$op_uri"
# In ~/.zshenv for host-shell coverage:
export GODEBUG=netdns=go
```

Apply whenever a script invokes a Go binary that makes DNS calls on macOS. Full rationale: your secrets-management doc § "Host DNS and the Go resolver".

## Error messages must include a recovery hint

When an infra script, hook, or tool logs a failure (`ERROR`, `WARN`, or a non-zero exit), the log line tells the operator **what to run or read next** to recover. Two lines: what broke, and the exact command/path to recover — not a hyperlink, not a generic "check logs."

```bash
echo "[firewall] ERROR: ${#failed[@]} domain(s) failed to resolve at init: ${failed[*]}" >&2
echo "[firewall] ERROR: re-run 'sudo bash /workspace/.devcontainer/init-firewall.sh' after DNS recovers" >&2
```

**Never swallow failures silently.** `|| true`, `2>/dev/null`, or a catch-all that drops errors without a log line is the anti-pattern. If you intentionally suppress an expected-non-fatal failure, emit a `WARN` naming what was suppressed so the downstream failure mode has a breadcrumb.

## Empty must not equal broken (value-space, not log-space)

The rule above constrains **log lines**. That is not enough, and the gap is the workspace's most-repeated defect class: a failure handler that returns a value already reachable on the success path. The caller then cannot tell "nothing found" from "lookup broken," no matter what got logged.

**A function whose success type includes an empty or negative value (`[]`, `false`, `None`, `0`, `""`) must not return that same value on failure.** Failure returns a distinct sentinel, raises, or returns a two-field result. Empty and broken must be different values *at the call site*, not different lines in a log the caller never reads.

```python
# Anti-pattern — "no contact" and "wrapper is missing" are the same value
def run_contacts_search(email) -> list[dict]:
    proc = subprocess.run([...], check=False)
    if proc.returncode != 0:
        log(f"contacts search exited {proc.returncode}")
        return []          # <-- caller sees exactly what a genuine no-match returns
```

Corollaries:

- **A process that captures a subprocess's stderr must propagate it** to its own stderr, or include it verbatim in the failure branch of its summary. Parsing stdout and discarding stderr destroys the only evidence that distinguishes the two cases.
- **An index, allowlist, or denylist built from external data needs a cardinality assertion.** A suppression list that silently loads zero entries suppresses nobody and looks identical to "nobody needs suppressing."
- **Review trigger (blocking):** any `except` / `catch` / non-zero-exit branch whose body produces a value already reachable on the success path.

Why this is stated in value-space: the log-line rule above has been in this file since 2026-06 and did not prevent four instances of exactly this defect in a single session on 2026-07-30 (three repos in one session). Registry principle: `empty-must-not-equal-broken`.

## Test fixtures that init ephemeral git repos

Tests that create a throwaway git repo (so code-under-test can snapshot or diff) MUST pass a non-protected default branch to `git init`:

```python
subprocess.run(["git", "init", "-q", "-b", "develop"], cwd=tmp_repo, check=True)  # NOT -b main
```

**Why:** the workspace has a global pre-commit hook that refuses commits on protected branches (`main`, `staging`). A fixture that runs `git init -b main` then `git commit` fails deep inside `subprocess.CalledProcessError`, the only signal a "refusing to commit on protected branch" line buried in stderr — easily mistaken for a bug in the code under test. With more than one commit, the first may even succeed on `main` (the hook catches the commit, not the branch state), producing confusing partial-setup states. Ephemeral test repos always start on `develop`; `main` is reserved for production-promotion refs. Also set `git config user.email` / `user.name` in the fixture — the test environment may not inherit a global git identity.

## Container venv hygiene (your build container and other ephemeral containers)

Inside your build container (or any container mounting the host working copy at `/workspace`), do NOT trust repo-local `.venv/` / `venv/` directories — they were almost certainly built on the host (macOS Homebrew Python, or an nvm-managed Python) and their `bin/python` symlinks resolve to paths that do not exist in the container.

**Detect** before invoking any tool from a repo-local venv:

```bash
./.venv/bin/python --version 2>/dev/null || echo "host-built venv — unusable"
```

A broken symlink (`No such file or directory`), or `cat .venv/pyvenv.cfg` showing a `home=` path absent in the container (`/opt/homebrew/...`, a host home directory) → treat the venv as absent.

**Workaround** — build a throwaway venv at `/tmp/<repo>-venv`:

```bash
python3 -m venv /tmp/<repo>-venv
/tmp/<repo>-venv/bin/pip install -q -r requirements.txt -r requirements-dev.txt
/tmp/<repo>-venv/bin/python -m pytest tests/<target>.py -v
```

Do **not**: delete or overwrite the host-built `.venv/` (the user still runs it from the host shell); commit a container-side venv to the repo (gitignore it if created in-tree); install requirements into the system Python (container rebuilds lose it and you risk polluting the base image).

**Optional per-repo improvement:** repos agents frequently touch from your build container can ship a `bootstrap-container-venv.sh` helper under `scripts/` that creates a gitignored `.venv-container/` so subsequent sessions skip the reinstall. (Named as a suggestion, not a citation — no such file exists yet in any repo.)
