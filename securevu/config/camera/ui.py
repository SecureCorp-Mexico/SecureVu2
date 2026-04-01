from pydantic import Field

from ..base import SecureVuBaseModel

__all__ = ["CameraUiConfig"]


class CameraUiConfig(SecureVuBaseModel):
    order: int = Field(default=0, title="Order of camera in UI.")
    dashboard: bool = Field(
        default=True, title="Show this camera in SecureVu dashboard UI."
    )
