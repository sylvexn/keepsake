#!/usr/bin/env python3
"""
One-shot: remux all existing MP4/MOV/M4V files in the uploads directory with
+faststart so Discord embeds and mobile browsers can stream them.

Run inside the container:
    docker exec -it <container> python /app/backend/remux_existing.py

Or via Coolify terminal:
    python /app/backend/remux_existing.py
"""
import os
import shutil
import subprocess
import sys

UPLOAD_DIR = os.environ.get("KEEPSAKE_UPLOAD_DIR", "/data/uploads")
TARGET_EXTS = {".mp4", ".mov", ".m4v"}


def is_faststart(path):
    """Return True if moov atom appears before mdat (i.e. already faststart)."""
    try:
        with open(path, "rb") as f:
            data = f.read(1024 * 1024)
        moov = data.find(b"moov")
        mdat = data.find(b"mdat")
        if moov == -1:
            return False
        if mdat == -1:
            return True
        return moov < mdat
    except OSError:
        return False


def remux(path):
    tmp = f"{path}.faststart.mp4"
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", path, "-c", "copy",
         "-movflags", "+faststart", "-f", "mp4", tmp],
        capture_output=True, timeout=300,
    )
    if result.returncode == 0 and os.path.exists(tmp):
        os.replace(tmp, path)
        return True, ""
    if os.path.exists(tmp):
        os.remove(tmp)
    return False, result.stderr.decode("utf-8", "ignore")[:500]


def main():
    if not shutil.which("ffmpeg"):
        print("ffmpeg not found on PATH", file=sys.stderr)
        return 1
    if not os.path.isdir(UPLOAD_DIR):
        print(f"upload dir not found: {UPLOAD_DIR}", file=sys.stderr)
        return 1

    total = fixed = skipped = failed = 0
    for name in sorted(os.listdir(UPLOAD_DIR)):
        path = os.path.join(UPLOAD_DIR, name)
        if not os.path.isfile(path):
            continue
        ext = os.path.splitext(name)[1].lower()
        if ext not in TARGET_EXTS:
            continue
        total += 1
        if is_faststart(path):
            print(f"skip (already faststart): {name}")
            skipped += 1
            continue
        ok, err = remux(path)
        if ok:
            print(f"remuxed: {name}")
            fixed += 1
        else:
            print(f"FAILED: {name} :: {err}", file=sys.stderr)
            failed += 1

    print(f"\ndone. total={total} fixed={fixed} skipped={skipped} failed={failed}")
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
