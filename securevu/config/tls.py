from pydantic import Field

from .base import SecureVuBaseModel

__all__ = ["TlsConfig"]


class TlsConfig(SecureVuBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable TLS",
        description="Enable TLS for SecureVu's web UI and API on the configured TLS port.",
    )
