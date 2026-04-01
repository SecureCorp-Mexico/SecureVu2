import json
import os
import unittest
from unittest.mock import patch

import numpy as np
from pydantic import ValidationError
from ruamel.yaml.constructor import DuplicateKeyError

from securevu.config import BirdseyeModeEnum, SecureVuConfig
from securevu.const import MODEL_CACHE_DIR
from securevu.detectors import DetectorTypeEnum
from securevu.util.builtin import deep_merge


class TestConfig(unittest.TestCase):
    def setUp(self):
        self.minimal = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        self.plus_model_info = {
            "id": "e63b7345cc83a84ed79dedfc99c16616",
            "name": "SSDLite Mobiledet",
            "description": "Fine tuned model",
            "trainDate": "2023-04-28T23:22:01.262Z",
            "type": "ssd",
            "supportedDetectors": ["cpu", "edgetpu"],
            "width": 320,
            "height": 320,
            "inputShape": "nhwc",
            "pixelFormat": "rgb",
            "labelMap": {
                "0": "amazon",
                "1": "car",
                "2": "cat",
                "3": "deer",
                "4": "dog",
                "5": "face",
                "6": "fedex",
                "7": "license_plate",
                "8": "package",
                "9": "person",
                "10": "ups",
            },
        }

        if not os.path.exists(MODEL_CACHE_DIR) and not os.path.islink(MODEL_CACHE_DIR):
            os.makedirs(MODEL_CACHE_DIR)

    def test_config_class(self):
        securevu_config = SecureVuConfig(**self.minimal)
        assert "cpu" in securevu_config.detectors.keys()
        assert securevu_config.detectors["cpu"].type == DetectorTypeEnum.cpu
        assert securevu_config.detectors["cpu"].model.width == 320

    @patch("securevu.detectors.detector_config.load_labels")
    def test_detector_custom_model_path(self, mock_labels):
        mock_labels.return_value = {}
        config = {
            "detectors": {
                "cpu": {
                    "type": "cpu",
                    "model_path": "/cpu_model.tflite",
                },
                "edgetpu": {
                    "type": "edgetpu",
                    "model_path": "/edgetpu_model.tflite",
                },
                "openvino": {
                    "type": "openvino",
                },
            },
            # needs to be a file that will exist, doesn't matter what
            "model": {"path": "/etc/hosts", "width": 512},
        }

        securevu_config = SecureVuConfig(**(deep_merge(config, self.minimal)))

        assert "cpu" in securevu_config.detectors.keys()
        assert "edgetpu" in securevu_config.detectors.keys()
        assert "openvino" in securevu_config.detectors.keys()

        assert securevu_config.detectors["cpu"].type == DetectorTypeEnum.cpu
        assert securevu_config.detectors["edgetpu"].type == DetectorTypeEnum.edgetpu
        assert securevu_config.detectors["openvino"].type == DetectorTypeEnum.openvino

        assert securevu_config.detectors["cpu"].num_threads == 3
        assert securevu_config.detectors["edgetpu"].device is None
        assert securevu_config.detectors["openvino"].device is None

        assert securevu_config.model.path == "/etc/hosts"
        assert securevu_config.detectors["cpu"].model.path == "/cpu_model.tflite"
        assert securevu_config.detectors["edgetpu"].model.path == "/edgetpu_model.tflite"
        assert securevu_config.detectors["openvino"].model.path == "/etc/hosts"

    def test_invalid_mqtt_config(self):
        config = {
            "mqtt": {"host": "mqtt", "user": "test"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        self.assertRaises(ValidationError, lambda: SecureVuConfig(**config))

    def test_inherit_tracked_objects(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "dog" in securevu_config.cameras["back"].objects.track

    def test_override_birdseye(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "birdseye": {"enabled": True, "mode": "continuous"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "birdseye": {"enabled": False, "mode": "motion"},
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert not securevu_config.cameras["back"].birdseye.enabled
        assert securevu_config.cameras["back"].birdseye.mode is BirdseyeModeEnum.motion

    def test_override_birdseye_non_inheritable(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "birdseye": {"enabled": True, "mode": "continuous", "height": 1920},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].birdseye.enabled

    def test_inherit_birdseye(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "birdseye": {"enabled": True, "mode": "continuous"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].birdseye.enabled
        assert (
            securevu_config.cameras["back"].birdseye.mode is BirdseyeModeEnum.continuous
        )

    def test_override_tracked_objects(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "objects": {"track": ["cat"]},
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "cat" in securevu_config.cameras["back"].objects.track

    def test_default_object_filters(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "dog" in securevu_config.cameras["back"].objects.filters

    def test_inherit_object_filters(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {
                "track": ["person", "dog"],
                "filters": {"dog": {"threshold": 0.7}},
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "dog" in securevu_config.cameras["back"].objects.filters
        assert securevu_config.cameras["back"].objects.filters["dog"].threshold == 0.7

    def test_override_object_filters(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "objects": {
                        "track": ["person", "dog"],
                        "filters": {"dog": {"threshold": 0.7}},
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "dog" in securevu_config.cameras["back"].objects.filters
        assert securevu_config.cameras["back"].objects.filters["dog"].threshold == 0.7

    def test_global_object_mask(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "objects": {
                        "mask": "0,0,1,1,0,1",
                        "filters": {"dog": {"mask": "1,1,1,1,1,1"}},
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        back_camera = securevu_config.cameras["back"]
        assert "dog" in back_camera.objects.filters
        assert len(back_camera.objects.filters["dog"].raw_mask) == 2
        assert len(back_camera.objects.filters["person"].raw_mask) == 1

    def test_motion_mask_relative_matches_explicit(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {"alerts": {"retain": {"days": 20}}},
            "cameras": {
                "explicit": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 400,
                        "width": 800,
                        "fps": 5,
                    },
                    "motion": {
                        "mask": [
                            "0,0,200,100,600,300,800,400",
                        ]
                    },
                },
                "relative": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 400,
                        "width": 800,
                        "fps": 5,
                    },
                    "motion": {
                        "mask": [
                            "0.0,0.0,0.25,0.25,0.75,0.75,1.0,1.0",
                        ]
                    },
                },
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert np.array_equal(
            securevu_config.cameras["explicit"].motion.mask,
            securevu_config.cameras["relative"].motion.mask,
        )

    def test_default_input_args(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "-rtsp_transport" in securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_ffmpeg_params_global(self):
        config = {
            "ffmpeg": {"input_args": "-re"},
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "objects": {
                        "track": ["person", "dog"],
                        "filters": {"dog": {"threshold": 0.7}},
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "-re" in securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_ffmpeg_params_camera(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "ffmpeg": {"input_args": ["test"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ],
                        "input_args": ["-re"],
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "objects": {
                        "track": ["person", "dog"],
                        "filters": {"dog": {"threshold": 0.7}},
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "-re" in securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
        assert "test" not in securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_ffmpeg_params_input(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "ffmpeg": {"input_args": ["test2"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                                "input_args": "-re test",
                            }
                        ],
                        "input_args": "test3",
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "objects": {
                        "track": ["person", "dog"],
                        "filters": {"dog": {"threshold": 0.7}},
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "-re" in securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
        assert "test" in securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
        assert "test2" not in securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
        assert "test3" not in securevu_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_inherit_clips_retention(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {"alerts": {"retain": {"days": 20}}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].record.alerts.retain.days == 20

    def test_roles_listed_twice_throws_error(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "alerts": {
                    "retain": {
                        "days": 20,
                    }
                }
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]},
                            {"path": "rtsp://10.0.0.1:554/video2", "roles": ["detect"]},
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        self.assertRaises(ValidationError, lambda: SecureVuConfig(**config))

    def test_zone_matching_camera_name_throws_error(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "alerts": {
                    "retain": {
                        "days": 20,
                    }
                }
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "zones": {"back": {"coordinates": "1,1,1,1,1,1"}},
                }
            },
        }
        self.assertRaises(ValidationError, lambda: SecureVuConfig(**config))

    def test_zone_assigns_color_and_contour(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "alerts": {
                    "retain": {
                        "days": 20,
                    }
                }
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "zones": {"test": {"coordinates": "1,1,1,1,1,1"}},
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert isinstance(
            securevu_config.cameras["back"].zones["test"].contour, np.ndarray
        )
        assert securevu_config.cameras["back"].zones["test"].color != (0, 0, 0)

    def test_zone_filter_area_percent_converts_to_pixels(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "alerts": {
                    "retain": {
                        "days": 20,
                    }
                }
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "zones": {
                        "notification": {
                            "coordinates": "0.03,1,0.025,0,0.626,0,0.643,1",
                            "objects": ["person"],
                            "filters": {"person": {"min_area": 0.1}},
                        }
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        expected_min_area = int(1080 * 1920 * 0.1)
        assert (
            securevu_config.cameras["back"]
            .zones["notification"]
            .filters["person"]
            .min_area
            == expected_min_area
        )

    def test_zone_relative_matches_explicit(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "alerts": {
                    "retain": {
                        "days": 20,
                    }
                }
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 400,
                        "width": 800,
                        "fps": 5,
                    },
                    "zones": {
                        "explicit": {
                            "coordinates": "0,0,200,100,600,300,800,400",
                        },
                        "relative": {
                            "coordinates": "0.0,0.0,0.25,0.25,0.75,0.75,1.0,1.0",
                        },
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert np.array_equal(
            securevu_config.cameras["back"].zones["explicit"].contour,
            securevu_config.cameras["back"].zones["relative"].contour,
        )

    def test_role_assigned_but_not_enabled(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {"path": "rtsp://10.0.0.1:554/record", "roles": ["record"]},
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        ffmpeg_cmds = securevu_config.cameras["back"].ffmpeg_cmds
        assert len(ffmpeg_cmds) == 1
        assert "clips" not in ffmpeg_cmds[0]["roles"]

    def test_max_disappeared_default(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "enabled": True,
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].detect.max_disappeared == 5 * 5

    def test_motion_frame_height_wont_go_below_120(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].motion.frame_height == 100

    def test_motion_contour_area_dynamic(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert round(securevu_config.cameras["back"].motion.contour_area) == 10

    def test_merge_labelmap(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "model": {"labelmap": {7: "truck"}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.model.merged_labelmap[7] == "truck"

    def test_default_labelmap_empty(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.model.merged_labelmap[0] == "person"

    def test_default_labelmap(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "model": {"width": 320, "height": 320},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.model.merged_labelmap[0] == "person"

    def test_plus_labelmap(self):
        with open(os.path.join(MODEL_CACHE_DIR, "test"), "w") as f:
            json.dump(self.plus_model_info, f)
        with open(os.path.join(MODEL_CACHE_DIR, "test.json"), "w") as f:
            json.dump(self.plus_model_info, f)

        config = {
            "mqtt": {"host": "mqtt"},
            "model": {"path": "plus://test"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.model.merged_labelmap[0] == "amazon"

    def test_fails_on_invalid_role(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["clips"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        self.assertRaises(ValidationError, lambda: SecureVuConfig(**config))

    def test_fails_on_missing_role(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["record"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "audio": {"enabled": True},
                }
            },
        }

        self.assertRaises(ValueError, lambda: SecureVuConfig(**config))

    def test_works_on_missing_role_multiple_cams(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["record"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                },
                "cam2": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["record"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                },
            },
        }

        SecureVuConfig(**config)

    def test_global_detect(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "detect": {"max_disappeared": 1},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].detect.max_disappeared == 1
        assert securevu_config.cameras["back"].detect.height == 1080

    def test_default_detect(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 720,
                        "width": 1280,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].detect.max_disappeared == 25
        assert securevu_config.cameras["back"].detect.height == 720

    def test_global_detect_merge(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "detect": {"max_disappeared": 1, "height": 720},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].detect.max_disappeared == 1
        assert securevu_config.cameras["back"].detect.height == 1080
        assert securevu_config.cameras["back"].detect.width == 1920

    def test_global_snapshots(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "snapshots": {"enabled": True},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "snapshots": {
                        "height": 100,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].snapshots.enabled
        assert securevu_config.cameras["back"].snapshots.height == 100

    def test_default_snapshots(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].snapshots.bounding_box
        assert securevu_config.cameras["back"].snapshots.quality == 70

    def test_global_snapshots_merge(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "snapshots": {"bounding_box": False, "height": 300},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "snapshots": {
                        "height": 150,
                        "enabled": True,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].snapshots.bounding_box is False
        assert securevu_config.cameras["back"].snapshots.height == 150
        assert securevu_config.cameras["back"].snapshots.enabled

    def test_global_jsmpeg(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "live": {"quality": 4},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].live.quality == 4

    def test_default_live(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].live.quality == 8

    def test_global_live_merge(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "live": {"quality": 4, "height": 480},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "live": {
                        "quality": 7,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].live.quality == 7
        assert securevu_config.cameras["back"].live.height == 480

    def test_global_timestamp_style(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "timestamp_style": {"position": "bl"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].timestamp_style.position == "bl"

    def test_default_timestamp_style(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].timestamp_style.position == "tl"

    def test_global_timestamp_style_merge(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "timestamp_style": {"position": "br", "thickness": 2},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "timestamp_style": {"position": "bl", "thickness": 4},
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].timestamp_style.position == "bl"
        assert securevu_config.cameras["back"].timestamp_style.thickness == 4

    def test_allow_retain_to_be_a_decimal(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "snapshots": {"retain": {"default": 1.5}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].snapshots.retain.default == 1.5

    def test_fails_on_bad_camera_name(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "snapshots": {"retain": {"default": 1.5}},
            "cameras": {
                "back camer#": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        self.assertRaises(ValidationError, lambda: SecureVuConfig(**config).cameras)

    def test_fails_on_bad_segment_time(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {"enabled": True},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "output_args": {
                            "record": "-f segment -segment_time 70 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c copy -an"
                        },
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ],
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        self.assertRaises(
            ValueError,
            lambda: SecureVuConfig(**config).ffmpeg.output_args.record,
        )

    def test_fails_zone_defines_untracked_object(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "zones": {
                        "steps": {
                            "coordinates": "0,0,0,0",
                            "objects": ["car", "person"],
                        },
                    },
                }
            },
        }

        self.assertRaises(ValueError, lambda: SecureVuConfig(**config).cameras)

    def test_fails_duplicate_keys(self):
        raw_config = """
        cameras:
          test:
            ffmpeg:
              inputs:
                - one
                - two
              inputs:
                - three
                - four
        """

        self.assertRaises(
            DuplicateKeyError, lambda: SecureVuConfig.parse_yaml(raw_config)
        )

    def test_object_filter_ratios_work(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {
                "track": ["person", "dog"],
                "filters": {"dog": {"min_ratio": 0.2, "max_ratio": 10.1}},
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert "dog" in securevu_config.cameras["back"].objects.filters
        assert securevu_config.cameras["back"].objects.filters["dog"].min_ratio == 0.2
        assert securevu_config.cameras["back"].objects.filters["dog"].max_ratio == 10.1

    def test_valid_movement_weights(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "onvif": {
                        "autotracking": {
                            "movement_weights": "0, 1, 1.23, 2.34, 0.50, 1"
                        }
                    },
                }
            },
        }

        securevu_config = SecureVuConfig(**config)
        assert securevu_config.cameras["back"].onvif.autotracking.movement_weights == [
            "0.0",
            "1.0",
            "1.23",
            "2.34",
            "0.5",
            "1.0",
        ]

    def test_fails_invalid_movement_weights(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "onvif": {"autotracking": {"movement_weights": "1.234, 2.345a"}},
                }
            },
        }

        self.assertRaises(ValueError, lambda: SecureVuConfig(**config))


if __name__ == "__main__":
    unittest.main(verbosity=2)
