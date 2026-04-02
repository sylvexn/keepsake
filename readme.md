# Keepsake

A self-hosted media uploader and gallery built for personal use. Designed to work with ShareX for quick uploads, and comes with a clean dashboard for browsing, managing, and sharing your images and videos.

## Features

- **ShareX integration** — upload images and videos straight from your desktop
- **Media support** — handles images and video files (mp4, webm, mov, avi, mkv)
- **Gallery dashboard** — browse, rename, and manage all your uploads in one place
- **Upload stats** — keep track of storage usage and upload activity
- **Public sharing** — each upload gets a direct URL you can share anywhere
- **Single-user auth** — simple and secure, built for one person
- **Dockerized** — ships as a single container, easy to self-host

## Tech Stack

**Backend** — Python / Flask, SQLite, RESTful API  
**Frontend** — React, Shadcn/ui  
**Infra** — Docker, Nginx, Supervisord

## Self-Hosting

Keepsake runs as a single Docker container. Configure your environment variables for authentication and point your reverse proxy at it — that's about it.

```bash
docker build -t keepsake .
docker run -d -p 5000:5000 -v keepsake_data:/app/data keepsake
```
