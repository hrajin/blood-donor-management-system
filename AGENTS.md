# AGENTS.md

## How to work

- Read before you write. Open the file, its neighbors and its callers before changing anything. Match what is already there.
- Do the task that was asked. Do not refactor, rename or “improve” code outside it. If you see a real problem elsewhere, mention it; do not fix it silently.
- Do not commit, push, or rewrite git history unless asked.
- Do not edit generated files, lockfiles by hand, or vendored code.
- Do not update AGENTS.md unless asked.

## Coding conventions

- Write simple and readable code and avoid extra complexity.
- Early returns over nested conditions. Handle the bad case first, keep the happy path flat.
- Do not write what already exists. Search first; reuse it, or move it to one shared place.
- Everything must have a consumer today; delete what nothing uses.
- No dead code, no commented-out code. Git remembers.
- Names say what a thing is or does. No utils, helpers, Manager, misc, data2.
- Comments explain why when the code cannot: a workaround, a non-obvious constraint, a link to an issue. Never narrate what the code does.
- Leave every file you touch consistent with the rules and with its neighbors.

## Dependencies

- Do not hand-roll what already exists. Check in this order: the standard library, the project’s own code, packages already installed. Propose a new package only after all three come up empty.
- Never hand-roll security- or spec-heavy code: crypto, password hashing, auth, JWT, sessions, time zones, parsing (CSV, HTML, URLs, email), sanitization, UUIDs. Use a proven library.
- You may install the dependencies the project already declares. Never add a new dependency on your own.
- When a package is needed, shortlist the best one or two, then stop and ask which to use. For each, give one line on what it is, and compare them on maintenance, security, adoption, size and fit with the project. Say which you recommend and why.
- Never pick a package that is abandoned, deprecated, archived or has an unpatched vulnerability. If nothing else fits, stop and ask.
- Recommend the latest stable version. Never recommend a version with a known vulnerability.
- Do not trust a package name from memory. Confirm the exact name and publisher on the registry before you recommend it.

## Correctness

- Fix the root cause, not the symptom. If a value is wrong, find where it becomes wrong.
- Fail loudly. Never swallow an error, and never write data after ignoring one.
- Model every case. When a type has a fixed set of variants, handle all of them so a new one breaks the build, not production.
- Whatever you write, you must be able to read back in the same shape. Serialize and deserialize with the same schema.
- Build on guarantees, not coincidences. Do not rely on ordering, timing, default values or “it happens to work” that nothing promises.
- Never hardcode secrets. Never log tokens, passwords or personal data.

## Tests

- Do not overtest, only critical paths need testing.
- A test must fail if the behavior it covers breaks. Never weaken or delete a test to make it pass; fix the code or explain why the test is wrong.

## Docs

- Keep docs true. When you change behavior, config, env vars, commands or public APIs, update the docs in the same change.
- Configuration docs must list every option, its default and what it does.

## Finishing

- Run the formatter, linter, type checker and the relevant tests before saying you are done.
- Report honestly: what changed, what you ran, what failed, what you skipped.
