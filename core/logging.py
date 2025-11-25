from __future__ import annotations

import logging
import sys

from app.core.settings import get_settings


def configure_logging() -> None:
    settings = get_settings()
    level = logging.DEBUG if settings.is_dev else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        stream=sys.stdout,
    )
