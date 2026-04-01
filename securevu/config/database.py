from pydantic import Field

from securevu.const import DEFAULT_DB_PATH

from .base import SecureVuBaseModel

__all__ = ["DatabaseConfig"]


class DatabaseConfig(SecureVuBaseModel):
    path: str = Field(default=DEFAULT_DB_PATH, title="Database path.")  # noqa: F821
