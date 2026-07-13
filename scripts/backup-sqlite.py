#!/usr/bin/env python3
"""Create and verify an online backup of the configured SQLite database."""

from __future__ import annotations

import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit
from urllib.request import url2pathname


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"
DEFAULT_BACKUP_DIR = Path("/root/crm-backups")
BACKUP_PREFIX = "freelance-crm-"
BACKUP_SUFFIX = ".sqlite3"
BACKUP_RETENTION = 14
BACKUP_NAME_PATTERN = re.compile(
    rf"^{re.escape(BACKUP_PREFIX)}\d{{8}}T\d{{12}}Z{re.escape(BACKUP_SUFFIX)}$"
)


class BackupError(RuntimeError):
    """An expected backup configuration or validation failure."""


def read_env_value(name: str) -> str | None:
    """Read one value from .env without mutating or printing the environment."""
    if not ENV_FILE.is_file():
        raise BackupError(f"Environment file not found: {ENV_FILE}")

    for raw_line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, separator, raw_value = line.partition("=")
        if not separator or key.strip() != name:
            continue

        value = raw_value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            return value[1:-1]
        return value.split(" #", 1)[0].rstrip()

    return None


def resolve_database_path(database_url: str) -> Path:
    """Resolve a local file: URL, keeping relative paths inside the project."""
    parsed = urlsplit(database_url)
    if parsed.scheme != "file":
        raise BackupError("DATABASE_URL must use a file: SQLite URL")
    if parsed.netloc not in ("", "localhost"):
        raise BackupError("Remote file: URLs are not supported")

    path_text = url2pathname(unquote(parsed.path))
    if os.name == "nt" and len(path_text) >= 3 and path_text[0] == "/" and path_text[2] == ":":
        path_text = path_text[1:]
    if not path_text or path_text == ":memory:":
        raise BackupError("DATABASE_URL must point to an on-disk SQLite database")

    configured_path = Path(path_text)
    if configured_path.is_absolute():
        database_path = configured_path.resolve()
    else:
        database_path = (PROJECT_ROOT / configured_path).resolve()
        try:
            database_path.relative_to(PROJECT_ROOT)
        except ValueError as error:
            raise BackupError(
                "Relative DATABASE_URL paths must stay inside the project root"
            ) from error

    if not database_path.is_file():
        raise BackupError("The configured SQLite database file does not exist")
    return database_path


def resolve_backup_directory() -> Path:
    configured = os.environ.get("CRM_BACKUP_DIR")
    backup_directory = Path(configured).expanduser() if configured else DEFAULT_BACKUP_DIR
    if not backup_directory.is_absolute():
        backup_directory = PROJECT_ROOT / backup_directory
    return backup_directory.resolve()


def create_backup(source_path: Path, backup_path: Path) -> None:
    source_uri = f"{source_path.as_uri()}?mode=ro"
    with sqlite3.connect(source_uri, uri=True) as source_connection:
        with sqlite3.connect(backup_path) as backup_connection:
            source_connection.backup(backup_connection)


def check_integrity(backup_path: Path) -> str:
    backup_uri = f"{backup_path.as_uri()}?mode=ro"
    with sqlite3.connect(backup_uri, uri=True) as connection:
        rows = connection.execute("PRAGMA integrity_check").fetchall()

    results = [str(row[0]) for row in rows]
    if results == ["ok"]:
        return "ok"
    return "; ".join(results) or "no result"


def remove_expired_backups(backup_directory: Path) -> None:
    backups = sorted(
        (
            path
            for path in backup_directory.iterdir()
            if path.is_file() and BACKUP_NAME_PATTERN.fullmatch(path.name)
        ),
        key=lambda path: path.name,
        reverse=True,
    )
    for expired_backup in backups[BACKUP_RETENTION:]:
        expired_backup.unlink()


def main() -> int:
    backup_path: Path | None = None
    try:
        database_url = read_env_value("DATABASE_URL")
        if not database_url:
            raise BackupError("DATABASE_URL is missing from .env")

        source_path = resolve_database_path(database_url)
        backup_directory = resolve_backup_directory()
        backup_directory.mkdir(mode=0o700, parents=True, exist_ok=True)

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        backup_path = backup_directory / f"{BACKUP_PREFIX}{timestamp}{BACKUP_SUFFIX}"
        create_backup(source_path, backup_path)
        try:
            backup_path.chmod(0o600)
        except OSError:
            pass

        integrity_result = check_integrity(backup_path)
        print(f"Backup created: {backup_path}")
        print(f"Integrity check: {integrity_result}")
        if integrity_result != "ok":
            backup_path.unlink(missing_ok=True)
            return 1

        remove_expired_backups(backup_directory)
        return 0
    except (BackupError, OSError, sqlite3.Error) as error:
        if backup_path is not None:
            try:
                backup_path.unlink(missing_ok=True)
            except OSError:
                pass
        print(f"Backup failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
