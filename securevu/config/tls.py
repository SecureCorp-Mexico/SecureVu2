from pydantic import Field

from .base import SecureVuBaseModel

__all__ = ["TlsConfig"]


class TlsConfig(SecureVuBaseModel):
    enabled: bool = Field(default=True, title="Enable TLS for port 8971")
