import unittest

from securevu.config import SecureVuConfig
from securevu.config.camera.ffmpeg import FFMPEG_INPUT_ARGS_DEFAULT
from securevu.ffmpeg_presets import parse_preset_input


class TestFfmpegPresets(unittest.TestCase):
    def setUp(self):
        self.default_ffmpeg = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            }
                        ],
                        "output_args": {
                            "detect": "-f rawvideo -pix_fmt yuv420p",
                            "record": "-f segment -segment_time 10 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c copy -an",
                        },
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "record": {
                        "enabled": True,
                    },
                    "name": "back",
                }
            },
        }

    def test_default_ffmpeg(self):
        SecureVuConfig(**self.default_ffmpeg)

    def test_ffmpeg_hwaccel_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["hwaccel_args"] = (
            "preset-rpi-64-h264"
        )
        securevu_config = SecureVuConfig(**self.default_ffmpeg)
        assert "preset-rpi-64-h264" not in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )
        assert "-c:v:1 h264_v4l2m2m" in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )

    def test_ffmpeg_hwaccel_not_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["hwaccel_args"] = (
            "-other-hwaccel args"
        )
        securevu_config = SecureVuConfig(**self.default_ffmpeg)
        assert "-other-hwaccel args" in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )

    def test_ffmpeg_hwaccel_scale_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["hwaccel_args"] = (
            "preset-nvidia-h264"
        )
        self.default_ffmpeg["cameras"]["back"]["detect"] = {
            "height": 1920,
            "width": 2560,
            "fps": 10,
        }
        securevu_config = SecureVuConfig(**self.default_ffmpeg)
        assert "preset-nvidia-h264" not in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )
        assert (
            "fps=10,scale_cuda=w=2560:h=1920,hwdownload,format=nv12,eq=gamma=1.4:gamma_weight=0.5"
            in (" ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]))
        )

    def test_default_ffmpeg_input_arg_preset(self):
        securevu_config = SecureVuConfig(**self.default_ffmpeg)

        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = (
            "preset-rtsp-generic"
        )
        securevu_preset_config = SecureVuConfig(**self.default_ffmpeg)
        assert (
            # Ignore global and user_agent args in comparison
            securevu_preset_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
            == securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
        )

    def test_ffmpeg_input_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = (
            "preset-rtmp-generic"
        )
        securevu_config = SecureVuConfig(**self.default_ffmpeg)
        assert "preset-rtmp-generic" not in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )
        assert (" ".join(parse_preset_input("preset-rtmp-generic", 5))) in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )

    def test_ffmpeg_input_args_as_string(self):
        # Strip user_agent args here to avoid handling quoting issues
        defaultArgsList = parse_preset_input(FFMPEG_INPUT_ARGS_DEFAULT, 5)[2::]
        argsString = " ".join(defaultArgsList) + ' -some "arg with space"'
        argsList = defaultArgsList + ["-some", "arg with space"]
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = argsString
        securevu_config = SecureVuConfig(**self.default_ffmpeg)
        assert set(argsList).issubset(
            securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
        )

    def test_ffmpeg_input_not_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = "-some inputs"
        securevu_config = SecureVuConfig(**self.default_ffmpeg)
        assert "-some inputs" in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )

    def test_ffmpeg_output_record_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["output_args"]["record"] = (
            "preset-record-generic-audio-aac"
        )
        securevu_config = SecureVuConfig(**self.default_ffmpeg)
        assert "preset-record-generic-audio-aac" not in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )
        assert "-c:v copy -c:a aac" in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )

    def test_ffmpeg_output_record_not_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["output_args"]["record"] = (
            "-some output -segment_time 10"
        )
        securevu_config = SecureVuConfig(**self.default_ffmpeg)
        assert "-some output" in (
            " ".join(securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"])
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
