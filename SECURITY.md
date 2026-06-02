# Security

## Reporting a Vulnerability

If you spot something security‑related, you can report it privately through [GitHub’s vulnerability reporting feature](https://github.com/DeChrist/blue-score/security/advisories/new).

This is a **hobby** project, so:

- No SLA
- No guarantees

I’ll look at reports when I have time. Fixes are best‑effort only.
Still, I really appreciate responsible reports — they help keep the project healthy for everyone.

## Token and Secret Hygiene

The Dev Container setup requires a `CLAUDE_CODE_OAUTH_TOKEN` environment variable that grants access to your Claude account (if you plan to use Claude obviously!).

- Store it only in your shell profile (`~/.zshrc`, `~/.bashrc`) or a secrets manager.
- Never commit it, add it to `.env` files tracked by git, paste it into prompts or issues, or share terminal output that may display it.
- If you suspect the token has been exposed, revoke it immediately at [Claude Code Settings](https://claude.ai/settings/claude-code) and generate a new one.
