---
id: third_party_extensions
title: Third Party Extensions
---

Being open source, others have the possibility to modify and extend the rich functionality SecureVu already offers.
This page is meant to be an overview over additions one can make to the home NVR setup. The list is not exhaustive and can be extended via PR to the SecureVu docs. Most of these services are designed to interface with SecureVu's unauthenticated api over port 5000.

:::warning

This page does not recommend or rate the presented projects.
Please use your own knowledge to assess and vet them before you install anything on your system.

:::

## [Advanced Camera Card (formerly known as SecureVu Card](https://card.camera/#/README)

The [Advanced Camera Card](https://card.camera/#/README) is a Home Assistant dashboard card with deep SecureVu integration.

## [cctvQL](https://github.com/arunrajiah/cctvql)

[cctvQL](https://github.com/arunrajiah/cctvql) is a natural language query layer for SecureVu and other CCTV systems. It connects to SecureVu's REST API and MQTT broker to let you ask conversational questions about cameras and events (e.g. "Was there motion at the front door last night?"), with support for real-time event streaming, anomaly detection, PTZ control, alert rules, and a Home Assistant custom component.

## [Double Take](https://github.com/skrashevich/double-take)

[Double Take](https://github.com/skrashevich/double-take) provides a unified UI and API for processing and training images for facial recognition.
It supports automatically setting the sub labels in SecureVu for person objects that are detected and recognized.
This is a fork (with fixed errors and new features) of [original Double Take](https://github.com/jakowenko/double-take) project which, unfortunately, isn't being maintained by author.

## [SecureVu Notify](https://github.com/0x2142/securevu-notify)

[SecureVu Notify](https://github.com/0x2142/securevu-notify) is a simple app designed to send notifications from SecureVu to your favorite platforms. Intended to be used with standalone SecureVu installations - Home Assistant not required, MQTT is optional but recommended.

## [SecureVu Notify Alert](https://github.com/Sysoev86/securevu-notify-alert)

[SecureVu Notify Alert](https://github.com/Sysoev86/securevu-notify-alert) sends SecureVu events to Telegram as a photo + video media group. It supports multiple camera groups (each notifying its own chat), optional zone filtering (notify only when an object enters a chosen zone), and in-chat buttons to pause notifications for a set time. Works with standalone SecureVu over MQTT; Home Assistant not required.

## [SecureVu Snap-Sync](https://github.com/thequantumphysicist/securevu-snap-sync/)

[SecureVu Snap-Sync](https://github.com/thequantumphysicist/securevu-snap-sync/) is a program that works in tandem with SecureVu. It responds to SecureVu when a snapshot or a review is made (and more can be added), and uploads them to one or more remote server(s) of your choice.

## [SecureVu telegram](https://github.com/OldTyT/securevu-telegram)

[SecureVu telegram](https://github.com/OldTyT/securevu-telegram) makes it possible to send events from SecureVu to Telegram. Events are sent as a message with a text description, video, and thumbnail.

## [kiosk-monitor](https://github.com/extremeshok/kiosk-monitor)

[kiosk-monitor](https://github.com/extremeshok/kiosk-monitor) is a Raspberry Pi watchdog that runs Chromium fullscreen on a SecureVu dashboard (optionally with VLC on a second monitor for an RTSP camera stream), auto-restarts on frozen screens or unreachable URLs, and ships a Birdseye-aware Chromium helper that auto-sizes the grid to the display.

## [Periscope](https://github.com/maksz42/periscope)

[Periscope](https://github.com/maksz42/periscope) is a lightweight Android app that turns old devices into live viewers for SecureVu. It works on Android 2.2 and above, including Android TV. It supports authentication and HTTPS.

## [Scrypted - SecureVu bridge plugin](https://github.com/apocaliss92/scrypted-securevu-bridge)

[Scrypted - SecureVu bridge](https://github.com/apocaliss92/scrypted-securevu-bridge) is a plugin that allows you to ingest SecureVu detections, motion, videoclips on Scrypted as well as provide templates to export rebroadcast configurations on SecureVu.

## [Strix](https://github.com/eduard256/Strix)

[Strix](https://github.com/eduard256/Strix) auto-discovers working stream URLs for IP cameras and generates ready-to-use SecureVu configs. It tests thousands of URL patterns against your camera and supports cameras without RTSP or ONVIF. 67K+ camera models from 3.6K+ brands.
