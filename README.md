# GUGO Gallery

Standalone static gallery for `https://gugo.crispytools.xyz/`.

## Local commands

- `npm run dev` starts the local dev server.
- `npm run build` creates `dist/`.
- `npm run preview` serves the built output locally.

The gallery is data-driven through `src/data/gallery.ts`; add images to `public/images/` and add filenames there.

## Deployment

The current static release is served at `https://gugo.crispytools.xyz/`.

- DNS: `gugo.crispytools.xyz` A record to `3.225.64.220`, DNS-only.
- Server release root: `/opt/crispytools/gugo/current`.
- Caddy backup from the first route install: `/opt/crispytools/backups/Caddyfile-before-gugo-20260707-002925`.
