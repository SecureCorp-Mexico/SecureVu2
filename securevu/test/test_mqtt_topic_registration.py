"""Tests for MQTT command topic callback registration."""

import unittest
from unittest.mock import MagicMock, patch

from securevu.comms.mqtt import MqttClient


def _make_camera_mock(
    *,
    enabled: bool = True,
    notifications_enabled_in_config: bool = False,
) -> MagicMock:
    """Build a camera config mock with the fields _start() reads."""
    camera = MagicMock()
    camera.enabled = enabled
    camera.notifications.enabled_in_config = notifications_enabled_in_config
    camera.onvif.host = None
    camera.motion.mask = {}
    camera.objects.mask = {}
    camera.zones = {}
    return camera


def _registered_topics(
    cameras: dict[str, MagicMock],
    *,
    global_notifications_enabled_in_config: bool = False,
) -> set[str]:
    """Start an MqttClient against a mocked paho client and collect the
    topics registered via message_callback_add."""
    config = MagicMock()
    config.cameras = cameras
    config.notifications.enabled_in_config = global_notifications_enabled_in_config
    config.mqtt.topic_prefix = "securevu"
    config.mqtt.client_id = "securevu"
    config.mqtt.user = None
    config.mqtt.tls_ca_certs = None
    config.mqtt.tls_insecure = None

    with patch("securevu.comms.mqtt.mqtt.Client") as client_cls:
        mqtt_client = MqttClient(config)
        # Simulate the broker confirming CONNACK as soon as the network loop
        # starts so _start()'s connect wait returns immediately instead of
        # blocking for the full timeout against the mocked client.
        client_cls.return_value.loop_start.side_effect = lambda: setattr(
            mqtt_client, "connected", True
        )
        mqtt_client.subscribe(MagicMock())

    paho_client = client_cls.return_value
    return {call.args[0] for call in paho_client.message_callback_add.call_args_list}


class TestMqttTopicRegistration(unittest.TestCase):
    def test_camera_notification_topics_registered(self):
        """Per-camera notification set/suspend must be registered so paho
        routes them to the dispatcher (unregistered topics drop silently)."""
        topics = _registered_topics(
            {"front_door": _make_camera_mock(notifications_enabled_in_config=True)}
        )

        self.assertIn("securevu/front_door/notifications/set", topics)
        self.assertIn("securevu/front_door/notifications/suspend", topics)

    def test_global_set_registered_with_camera_only_notifications(self):
        """The global topic must work when notifications are enabled only at
        the camera level, matching the WebPushClient gating in app.py."""
        topics = _registered_topics(
            {"front_door": _make_camera_mock(notifications_enabled_in_config=True)},
            global_notifications_enabled_in_config=False,
        )

        self.assertIn("securevu/notifications/set", topics)

    def test_global_set_registered_with_global_notifications(self):
        topics = _registered_topics(
            {"front_door": _make_camera_mock()},
            global_notifications_enabled_in_config=True,
        )

        self.assertIn("securevu/notifications/set", topics)

    def test_global_set_not_registered_when_notifications_unconfigured(self):
        topics = _registered_topics(
            {"front_door": _make_camera_mock()},
            global_notifications_enabled_in_config=False,
        )

        self.assertNotIn("securevu/notifications/set", topics)

    def test_disabled_camera_does_not_enable_global_set(self):
        topics = _registered_topics(
            {
                "front_door": _make_camera_mock(
                    enabled=False, notifications_enabled_in_config=True
                )
            },
            global_notifications_enabled_in_config=False,
        )

        self.assertNotIn("securevu/notifications/set", topics)


def _base_config() -> MagicMock:
    config = MagicMock()
    config.cameras = {}
    config.notifications.enabled_in_config = False
    config.mqtt.topic_prefix = "securevu"
    config.mqtt.client_id = "sv_172_20_0_146"
    config.mqtt.host = "172.20.0.9"
    config.mqtt.port = 1883
    config.mqtt.user = None
    config.mqtt.tls_ca_certs = None
    config.mqtt.tls_insecure = None
    return config


class TestMqttConnectStartup(unittest.TestCase):
    """Guards for the MQTT CONNECT-starvation fix (SecureVu2#1 / pendientes #39)."""

    def test_backoff_configured_and_waits_for_connack(self):
        """_start() must set a reconnect backoff and block until the broker
        confirms CONNACK so a large NVR does not race into detector startup
        before the handshake finishes."""
        config = _base_config()

        with patch("securevu.comms.mqtt.mqtt.Client") as client_cls:
            mqtt_client = MqttClient(config)
            client_cls.return_value.loop_start.side_effect = lambda: setattr(
                mqtt_client, "connected", True
            )
            mqtt_client.subscribe(MagicMock())

        paho_client = client_cls.return_value
        paho_client.reconnect_delay_set.assert_called_once_with(
            min_delay=1, max_delay=120
        )
        paho_client.connect_async.assert_called_once()
        paho_client.loop_start.assert_called_once()
        self.assertTrue(mqtt_client.connected)

    def test_connect_timeout_does_not_block_forever(self):
        """If CONNACK never arrives the wait must time out (not hang) and leave
        the background loop running so paho keeps retrying."""
        config = _base_config()

        with (
            patch("securevu.comms.mqtt.mqtt.Client") as client_cls,
            patch("securevu.comms.mqtt.time") as mock_time,
        ):
            # deadline = first monotonic() + 30; the next read is already past
            # it, so the loop exits immediately without a real sleep.
            mock_time.monotonic.side_effect = [0.0, 1000.0]
            mqtt_client = MqttClient(config)
            mqtt_client.subscribe(MagicMock())

        self.assertFalse(mqtt_client.connected)
        # background retry loop still started despite the connect timeout
        client_cls.return_value.loop_start.assert_called_once()
        mock_time.sleep.assert_not_called()

    def test_failed_connack_does_not_mark_connected(self):
        """A non-zero CONNACK reason code must not leave the client marked
        connected (otherwise publish() and the connect wait falsely succeed)."""
        config = _base_config()

        with patch("securevu.comms.mqtt.mqtt.Client"):
            mqtt_client = MqttClient(config)
            mqtt_client.client = MagicMock()
            mqtt_client._on_connect(MagicMock(), None, None, 0, None)
            self.assertTrue(mqtt_client.connected)

            # A non-zero reason code (any object that is != 0) must route to the
            # error path and return without marking the client connected.
            mqtt_client.connected = False
            mqtt_client._on_connect(MagicMock(), None, None, MagicMock(), None)
            self.assertFalse(mqtt_client.connected)


if __name__ == "__main__":
    unittest.main()
