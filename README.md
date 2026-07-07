# GUGO Gallery

Standalone static gallery for `https://gugo.crispytools.xyz/`.

## Local commands

- `npm run dev` starts the local dev server.
- `npm run build` creates `dist/`.
- `npm run preview` serves the built output locally.

The gallery is data-driven through `src/data/gallery.ts`; add images to `public/images/` and add filenames there.

For daily imports, drop new source images into `incoming/`. The automation treats
that folder as the project inbox and copies new images into `public/images/`.

Categories:

- `public/images/` feeds the GUGO images category.
- `public/memes/` feeds the GUGO memes category.
- Approved holder uploads feed the Holder submitted memes category.

To run the upload/moderation app, copy `.env.example` to `.env`, set the upload
and admin passwords, run `npm run build`, then run `npm start`.

## Deployment

The current static release is served at `https://gugo.crispytools.xyz/`.

- DNS: `gugo.crispytools.xyz` A record to `3.225.64.220`, DNS-only.
- Server release root: `/opt/crispytools/gugo/current`.
- Caddy backup from the first route install: `/opt/crispytools/backups/Caddyfile-before-gugo-20260707-002925`.
