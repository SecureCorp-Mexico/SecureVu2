from pydantic import Field, ValidationInfo, model_validator
from typing_extensions import Self

from securevu.log import LogLevel, apply_log_levels

from .base import SecureVuBaseModel

__all__ = ["LoggerConfig"]


class LoggerConfig(SecureVuBaseModel):
    default: LogLevel = Field(default=LogLevel.info, title="Default logging level.")
    logs: dict[str, LogLevel] = Field(
        default_factory=dict, title="Log level for specified processes."
    )

    @model_validator(mode="after")
    def post_validation(self, info: ValidationInfo) -> Self:
        if isinstance(info.context, dict) and info.context.get("install", False):
            apply_log_levels(self.default.value.upper(), self.logs)

        return self
