<p align="center">
  <img align="center" alt="logo" src="docs/static/img/branding/logo.svg" width="200">
</p>

# SecureVu™ - VMS with embedded Ai analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<a href="https://hosted.weblate.org/engage/frigate-nvr/">
<img src="https://hosted.weblate.org/widget/frigate-nvr/language-badge.svg" alt="Translation status" />
</a>

Uses OpenCV and Tensorflow to perform realtime object detection locally for IP cameras.

Use of a GPU or AI accelerator is highly recommended. AI accelerators will outperform even the best CPUs with very little overhead. See SecureVu's supported [object detectors](https://docs.secure.vu/configuration/object_detectors/).

- Tight integration with Home Assistant via a [custom component](https://github.com/SecureCorp-Mexico/SecureVu2-hass-integration)
- Designed to minimize resource use and maximize performance by only looking for objects when and where it is necessary
- Leverages multiprocessing heavily with an emphasis on realtime over processing every frame
- Uses a very low overhead motion detection to determine where to run object detection
- Object detection with TensorFlow runs in separate processes for maximum FPS
- Communicates over MQTT for easy integration into other systems
- Records video with retention settings based on detected objects
- 24/7 recording
- Re-streaming via RTSP to reduce the number of connections to your camera
- WebRTC & MSE support for low-latency live view

## Documentation

View the documentation at https://docs.secure.vu

## License

This project is licensed under the **MIT License**.

- **Code:** The source code, configuration files, and documentation in this repository are available under the [MIT License](LICENSE). You are free to use, modify, and distribute the code as long as you include the original copyright notice.
- **Trademarks:** The "SecureVu" name, the "SecureVu" brand, and the SecureVu logo are **trademarks of SecureVu, Inc.** and are **not** covered by the MIT License.

Please see our [Trademark Policy](TRADEMARK.md) for details on acceptable use of our brand assets.

## Screenshots

### Live dashboard

<div>
<img width="800" alt="Live dashboard" src="https://github.com/SecureCorp-Mexico/SecureVu2/assets/569905/5e713cb9-9db5-41dc-947a-6937c3bc376e">
</div>

### Streamlined review workflow

<div>
<img width="800" alt="Streamlined review workflow" src="https://github.com/SecureCorp-Mexico/SecureVu2/assets/569905/6fed96e8-3b18-40e5-9ddc-31e6f3c9f2ff">
</div>

### Multi-camera scrubbing

<div>
<img width="800" alt="Multi-camera scrubbing" src="https://github.com/SecureCorp-Mexico/SecureVu2/assets/569905/d6788a15-0eeb-4427-a8d4-80b93cae3d74">
</div>

### Built-in mask and zone editor

<div>
<img width="800" alt="Built-in mask and zone editor" src="https://github.com/SecureCorp-Mexico/SecureVu2/assets/569905/d7885fc3-bfe6-452f-b7d0-d957cb3e31f5">
</div>

## Translations

We use [Weblate](https://hosted.weblate.org/projects/frigate-nvr/) to support language translations. Contributions are always welcome.

<a href="https://hosted.weblate.org/engage/frigate-nvr/">
<img src="https://hosted.weblate.org/widget/frigate-nvr/multi-auto.svg" alt="Translation status" />
</a>

---

**Copyright © 2026 SecureVu, Inc.**
