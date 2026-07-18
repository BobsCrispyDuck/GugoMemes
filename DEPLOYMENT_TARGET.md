# Deployment Target

Effective: 2026-07-17

## Canonical DigitalOcean access

Use the existing workstation SSH alias from any project:

```powershell
ssh crispy-core-nyc1-01
```

The alias must resolve to `crispyadmin@142.93.48.127` with `C:\Users\taz8u\.ssh\id_ed25519` and `IdentitiesOnly yes`. Root SSH is disabled. Do not probe `root`, `ubuntu`, project service users, or other guessed usernames. After login, use only reviewed `sudo` commands or `sudo -u <service-user>` when the project runbook requires that identity.

Validate the shared access contract with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Dev\CrispyStack\scripts\deployment\check-digitalocean-access.ps1
```

Canonical access contract: `C:\Dev\CrispyStack\docs\deployment\digitalocean-access.md`. Working SSH access does not authorize a deployment, restart, DNS edit, secret change, or other production mutation.


GugoMemes should use the DigitalOcean deployment path from here forward.

- Provider: DigitalOcean
- Primary droplet: `crispy-core-nyc1-01`
- Public IPv4: `142.93.48.127`
- Current app home: `/srv/gugogallery/app/current`
- Environment file: `/etc/gugogallery/gugogallery.env`
- Service: `gugogallery.service`
- Route: `gugo.crispytools.xyz`
- Current target map: `C:\Dev\CrispyStack\docs\deployment\current-deployment-targets.md`

Older Lightsail, `/opt/crispytools/gugo`, and `3.225.64.220` deployment notes are historical or rollback references only. Do not use them as current deployment instructions unless a rollback is explicitly approved in the active task.
