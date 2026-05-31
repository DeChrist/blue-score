# Security

## Reporting a Vulnerability

Please do **not** open a public issue for security vulnerabilities.

Use [GitHub private security advisories](https://github.com/DeChrist/blue-score/security/advisories/new) to report a vulnerability confidentially. You will receive a response within a reasonable timeframe.

## Token and Secret Hygiene

The Dev Container setup requires a `CLAUDE_CODE_OAUTH_TOKEN` environment variable that grants access to your Claude account.

- Store it only in your shell profile (`~/.zshrc`, `~/.bashrc`) or a secrets manager.
- Never commit it, add it to `.env` files tracked by git, paste it into prompts or issues, or share terminal output that may display it.
- If you suspect the token has been exposed, revoke it immediately at [claude.ai](https://claude.ai) and generate a new one.
