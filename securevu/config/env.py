import os
import re
from pathlib import Path
from typing import Annotated

from pydantic import AfterValidator, ValidationInfo

SECUREVU_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("SECUREVU_")}
secrets_dir = os.environ.get("CREDENTIALS_DIRECTORY", "/run/secrets")
# read secret files as env vars too
if os.path.isdir(secrets_dir) and os.access(secrets_dir, os.R_OK):
    for secret_file in os.listdir(secrets_dir):
        if secret_file.startswith("SECUREVU_"):
            SECUREVU_ENV_VARS[secret_file] = (
                Path(os.path.join(secrets_dir, secret_file)).read_text().strip()
            )


# Matches a SECUREVU_* identifier following an opening brace.
_SECUREVU_IDENT_RE = re.compile(r"SECUREVU_[A-Za-z0-9_]+")


def substitute_securevu_vars(value: str) -> str:
    """Substitute `{SECUREVU_*}` placeholders in *value*.

    Reproduces the subset of `str.format()` brace semantics that SecureVu's
    config has historically supported, while leaving unrelated brace content
    (e.g. ffmpeg `%{localtime\\:...}` expressions) untouched:

    * `{{` and `}}` collapse to literal `{` / `}` (the documented escape).
    * `{SECUREVU_NAME}` is replaced from `SECUREVU_ENV_VARS`; an unknown name
      raises `KeyError` to preserve the existing "Invalid substitution"
      error path.
    * A `{` that begins `{SECUREVU_` but is not a well-formed
      `{SECUREVU_NAME}` placeholder raises `ValueError` (malformed
      placeholder). Callers that catch `KeyError` to allow unknown-var
      passthrough will still surface malformed syntax as an error.
    * Any other `{` or `}` is treated as a literal and passed through.
    """
    out: list[str] = []
    i = 0
    n = len(value)
    while i < n:
        ch = value[i]
        if ch == "{":
            # Escaped literal `{{`.
            if i + 1 < n and value[i + 1] == "{":
                out.append("{")
                i += 2
                continue
            # Possible `{SECUREVU_*}` placeholder.
            if value.startswith("{SECUREVU_", i):
                ident_match = _SECUREVU_IDENT_RE.match(value, i + 1)
                if (
                    ident_match is not None
                    and ident_match.end() < n
                    and value[ident_match.end()] == "}"
                ):
                    key = ident_match.group(0)
                    if key not in SECUREVU_ENV_VARS:
                        raise KeyError(key)
                    out.append(SECUREVU_ENV_VARS[key])
                    i = ident_match.end() + 1
                    continue
                # Looks like a SECUREVU placeholder but is malformed
                # (no closing brace, illegal char, format spec, etc.).
                raise ValueError(
                    f"Malformed SECUREVU_ placeholder near {value[i : i + 32]!r}"
                )
            # Plain `{` — pass through (e.g. `%{localtime\:...}`).
            out.append("{")
            i += 1
            continue
        if ch == "}":
            # Escaped literal `}}`.
            if i + 1 < n and value[i + 1] == "}":
                out.append("}")
                i += 2
                continue
            out.append("}")
            i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def validate_env_string(v: str) -> str:
    return substitute_securevu_vars(v)


EnvString = Annotated[str, AfterValidator(validate_env_string)]


def validate_env_vars(v: dict[str, str], info: ValidationInfo) -> dict[str, str]:
    if isinstance(info.context, dict) and info.context.get("install", False):
        for k, val in v.items():
            os.environ[k] = val
            if k.startswith("SECUREVU_"):
                SECUREVU_ENV_VARS[k] = val

    return v


EnvVars = Annotated[dict[str, str], AfterValidator(validate_env_vars)]
