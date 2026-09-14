"""Tests for environment variable handling."""

import os
import unittest
from unittest.mock import MagicMock, patch

from securevu.config.env import (
    SECUREVU_ENV_VARS,
    validate_env_string,
    validate_env_vars,
)


class TestGo2RtcAddStreamSubstitution(unittest.TestCase):
    """Covers the API path: PUT /go2rtc/streams/{stream_name}.

    The route shells out to go2rtc via `requests.put`; we mock the HTTP call
    and assert that the substituted `src` parameter handles the same mixed
    {SECUREVU_*} + literal-brace strings as the config-loading path.
    """

    def setUp(self):
        self._original_env_vars = dict(SECUREVU_ENV_VARS)

    def tearDown(self):
        SECUREVU_ENV_VARS.clear()
        SECUREVU_ENV_VARS.update(self._original_env_vars)

    def _call_route(self, src: str) -> str:
        """Invoke go2rtc_add_stream and return the substituted src param."""
        from securevu.api import camera as camera_api

        captured = {}

        def fake_put(url, params=None, timeout=None):
            captured["params"] = params
            resp = MagicMock()
            resp.ok = True
            resp.text = ""
            resp.status_code = 200
            return resp

        with patch.object(camera_api.requests, "put", side_effect=fake_put):
            camera_api.go2rtc_add_stream(
                request=MagicMock(), stream_name="cam1", src=src
            )
        return captured["params"]["src"]

    def test_mixed_localtime_and_securevu_var(self):
        """%{localtime\\:...} alongside {SECUREVU_USER} substitutes only the var."""
        SECUREVU_ENV_VARS["SECUREVU_USER"] = "admin"
        src = (
            "ffmpeg:rtsp://host/s#raw=-vf "
            "drawtext=text=%{localtime\\:%Y-%m-%d}:user={SECUREVU_USER}"
        )
        self.assertEqual(
            self._call_route(src),
            "ffmpeg:rtsp://host/s#raw=-vf "
            "drawtext=text=%{localtime\\:%Y-%m-%d}:user=admin",
        )

    def test_unknown_var_falls_back_to_raw_src(self):
        """Existing route behavior: unknown {SECUREVU_*} keeps raw src."""
        src = "rtsp://host/{SECUREVU_NONEXISTENT}/stream"
        self.assertEqual(self._call_route(src), src)

    def test_malformed_placeholder_rejected_via_api(self):
        """Malformed SECUREVU placeholders raise (not silently passed through).

        Regression: previously camera.py caught any KeyError and fell back
        to the raw src, so `{SECUREVU_FOO:>5}` was silently accepted via the
        API while config loading rejected it. The helper now raises
        ValueError for malformed syntax to keep the two paths consistent.
        """
        with self.assertRaises(ValueError):
            self._call_route("rtsp://host/{SECUREVU_FOO:>5}/stream")


class TestEnvString(unittest.TestCase):
    def setUp(self):
        self._original_env_vars = dict(SECUREVU_ENV_VARS)

    def tearDown(self):
        SECUREVU_ENV_VARS.clear()
        SECUREVU_ENV_VARS.update(self._original_env_vars)

    def test_substitution(self):
        """EnvString substitutes SECUREVU_ env vars."""
        SECUREVU_ENV_VARS["SECUREVU_TEST_HOST"] = "192.168.1.100"
        result = validate_env_string("{SECUREVU_TEST_HOST}")
        self.assertEqual(result, "192.168.1.100")

    def test_substitution_in_url(self):
        """EnvString substitutes vars embedded in a URL."""
        SECUREVU_ENV_VARS["SECUREVU_CAM_USER"] = "admin"
        SECUREVU_ENV_VARS["SECUREVU_CAM_PASS"] = "secret"
        result = validate_env_string(
            "rtsp://{SECUREVU_CAM_USER}:{SECUREVU_CAM_PASS}@10.0.0.1/stream"
        )
        self.assertEqual(result, "rtsp://admin:secret@10.0.0.1/stream")

    def test_no_placeholder(self):
        """Plain strings pass through unchanged."""
        result = validate_env_string("192.168.1.1")
        self.assertEqual(result, "192.168.1.1")

    def test_unknown_var_raises(self):
        """Referencing an unknown var raises KeyError."""
        with self.assertRaises(KeyError):
            validate_env_string("{SECUREVU_NONEXISTENT_VAR}")

    def test_non_securevu_braces_passthrough(self):
        """Braces that are not {SECUREVU_*} placeholders pass through untouched.

        Regression test for ffmpeg drawtext expressions like
        "%{localtime\\:%Y-%m-%d}" being mangled by str.format().
        """
        expr = (
            "ffmpeg:rtsp://127.0.0.1/src#raw=-vf "
            "drawtext=text=%{localtime\\:%Y-%m-%d_%H\\:%M\\:%S}"
            ":x=5:fontcolor=white"
        )
        self.assertEqual(validate_env_string(expr), expr)

    def test_double_brace_escape_preserved(self):
        """`{{output}}` collapses to `{output}` (documented go2rtc escape)."""
        result = validate_env_string(
            "exec:ffmpeg -i /media/file.mp4 -f rtsp {{output}}"
        )
        self.assertEqual(result, "exec:ffmpeg -i /media/file.mp4 -f rtsp {output}")

    def test_double_brace_around_securevu_var(self):
        """`{{SECUREVU_FOO}}` stays literal — escape takes precedence."""
        SECUREVU_ENV_VARS["SECUREVU_FOO"] = "bar"
        self.assertEqual(validate_env_string("{{SECUREVU_FOO}}"), "{SECUREVU_FOO}")

    def test_mixed_securevu_var_and_braces(self):
        """A SECUREVU_ var alongside literal single braces substitutes only the var."""
        SECUREVU_ENV_VARS["SECUREVU_USER"] = "admin"
        result = validate_env_string(
            "drawtext=text=%{localtime}:user={SECUREVU_USER}:x=5"
        )
        self.assertEqual(result, "drawtext=text=%{localtime}:user=admin:x=5")

    def test_triple_braces_around_securevu_var(self):
        """`{{{SECUREVU_FOO}}}` collapses like str.format(): `{bar}`."""
        SECUREVU_ENV_VARS["SECUREVU_FOO"] = "bar"
        self.assertEqual(validate_env_string("{{{SECUREVU_FOO}}}"), "{bar}")

    def test_trailing_double_brace_after_var(self):
        """`{SECUREVU_FOO}}}` collapses like str.format(): `bar}`."""
        SECUREVU_ENV_VARS["SECUREVU_FOO"] = "bar"
        self.assertEqual(validate_env_string("{SECUREVU_FOO}}}"), "bar}")

    def test_leading_double_brace_then_var(self):
        """`{{{SECUREVU_FOO}` collapses like str.format(): `{bar`."""
        SECUREVU_ENV_VARS["SECUREVU_FOO"] = "bar"
        self.assertEqual(validate_env_string("{{{SECUREVU_FOO}"), "{bar")

    def test_malformed_unterminated_placeholder_raises(self):
        """`{SECUREVU_FOO` (no closing brace) raises like str.format() did."""
        SECUREVU_ENV_VARS["SECUREVU_FOO"] = "bar"
        with self.assertRaises(ValueError):
            validate_env_string("prefix-{SECUREVU_FOO")

    def test_malformed_format_spec_raises(self):
        """`{SECUREVU_FOO:>5}` (format spec) raises like str.format() did."""
        SECUREVU_ENV_VARS["SECUREVU_FOO"] = "bar"
        with self.assertRaises(ValueError):
            validate_env_string("{SECUREVU_FOO:>5}")

    def test_malformed_conversion_raises(self):
        """`{SECUREVU_FOO!r}` (conversion) raises like str.format() did."""
        SECUREVU_ENV_VARS["SECUREVU_FOO"] = "bar"
        with self.assertRaises(ValueError):
            validate_env_string("{SECUREVU_FOO!r}")


class TestEnvVars(unittest.TestCase):
    def setUp(self):
        self._original_env_vars = dict(SECUREVU_ENV_VARS)
        self._original_environ = os.environ.copy()

    def tearDown(self):
        SECUREVU_ENV_VARS.clear()
        SECUREVU_ENV_VARS.update(self._original_env_vars)
        # Clean up any env vars we set
        for key in list(os.environ.keys()):
            if key not in self._original_environ:
                del os.environ[key]

    def _make_context(self, install: bool):
        """Create a mock ValidationInfo with the given install flag."""

        class MockContext:
            def __init__(self, ctx):
                self.context = ctx

        mock = MockContext({"install": install})
        return mock

    def test_install_sets_os_environ(self):
        """validate_env_vars with install=True sets os.environ."""
        ctx = self._make_context(install=True)
        validate_env_vars({"MY_CUSTOM_VAR": "value123"}, ctx)
        self.assertEqual(os.environ.get("MY_CUSTOM_VAR"), "value123")

    def test_install_updates_securevu_env_vars(self):
        """validate_env_vars with install=True updates SECUREVU_ENV_VARS for SECUREVU_ keys."""
        ctx = self._make_context(install=True)
        validate_env_vars({"SECUREVU_MQTT_PASS": "secret"}, ctx)
        self.assertEqual(SECUREVU_ENV_VARS["SECUREVU_MQTT_PASS"], "secret")

    def test_install_skips_non_securevu_in_env_vars_dict(self):
        """Non-SECUREVU_ keys are set in os.environ but not in SECUREVU_ENV_VARS."""
        ctx = self._make_context(install=True)
        validate_env_vars({"OTHER_VAR": "value"}, ctx)
        self.assertEqual(os.environ.get("OTHER_VAR"), "value")
        self.assertNotIn("OTHER_VAR", SECUREVU_ENV_VARS)

    def test_no_install_does_not_set(self):
        """validate_env_vars without install=True does not modify state."""
        ctx = self._make_context(install=False)
        validate_env_vars({"SECUREVU_SKIP": "nope"}, ctx)
        self.assertNotIn("SECUREVU_SKIP", SECUREVU_ENV_VARS)
        self.assertNotIn("SECUREVU_SKIP", os.environ)

    def test_env_vars_available_for_env_string(self):
        """Vars set via validate_env_vars are usable in validate_env_string."""
        ctx = self._make_context(install=True)
        validate_env_vars({"SECUREVU_BROKER": "mqtt.local"}, ctx)
        result = validate_env_string("{SECUREVU_BROKER}")
        self.assertEqual(result, "mqtt.local")


if __name__ == "__main__":
    unittest.main()
