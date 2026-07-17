# GUGO Gallery

Status note, 2026-07-17: hosted production has moved to DigitalOcean. See `DEPLOYMENT_TARGET.md` before deployment work.

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

For production, set `GUGO_STORAGE_DIR` to an absolute persistent path such as
`/opt/crispytools/gugo/storage`. Do not point production uploads at a release
folder, or approved holder uploads will appear to disappear on the next deploy.

## Deployment

The current static release is served at `https://gugo.crispytools.xyz/`.

- DNS: `gugo.crispytools.xyz` A record to `3.225.64.220`, DNS-only.
- Server release symlink: `/opt/crispytools/gugo/app-current`.
- Persistent upload storage: `/opt/crispytools/gugo/storage`.
- Caddy backup from the first route install: `/opt/crispytools/backups/Caddyfile-before-gugo-20260707-002925`.
