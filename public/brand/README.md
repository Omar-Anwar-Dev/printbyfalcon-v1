# Brand assets

Drop the brand logo here. Two slots:

| File | Use | Recommended |
|---|---|---|
| `logo-icon.png` | The falcon icon alone (no text). Used in the site header, footer, and favicon. | Square, ≥256×256, transparent background |
| `logo-full.png` | The full lockup (falcon + "Print By Falcon" + tagline). Reserved for future use (email headers, OG images). | Wide aspect, transparent background |

The header/footer `BrandMark` component reads `logo-icon.png` at server boot via `fs.existsSync`. If the file is missing, the legacy "PF" text fallback renders so the layout never breaks.

After adding or updating a file, restart the dev/prod server so the existence check re-runs.
