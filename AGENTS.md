# Repository Vision

This project modernizes the classic ASP application in `mafia.old/` by building a feature-complete Firebase-hosted experience in `madia.new/`.

> **Note:** The legacy system no longer has any running or functional instances. References to `mafia.old/` are for historical comparison only and should not be interpreted as implying multiple live versions can run simultaneously.

## Product Goals
- Achieve full functional and visual parity between `mafia.old/` and `madia.new/`.
- Once parity is reached, iterate on usability improvements while preserving the retro look and feel that defines the original site.

## Collaboration Notes
- Treat the ASP implementation as the authoritative reference for expected behavior and layout until parity is confirmed.
- Do not modify any of the classic ASP code paths (e.g., files in `mafia.old/`, root `.asp` pages, or shared `.inc` snippets); they exist solely as read-only references.
- Document any intentional divergences from the legacy experience so they can be reviewed against the parity objective.
- When enhancing usability post-parity, prioritize changes that respect the nostalgic aesthetic while clarifying workflows for modern users.
