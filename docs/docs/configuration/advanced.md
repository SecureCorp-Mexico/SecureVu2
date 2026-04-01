---
id: advanced
title: Advanced Options
sidebar_label: Advanced Options
---

### Logging

#### SecureVu `logger`

Change the default log level for troubleshooting purposes.

```yaml
logger:
  # Optional: default log level (default: shown below)
  default: info
  # Optional: module by module log level configuration
  logs:
    securevu.mqtt: error
```

Available log levels are: `debug`, `info`, `warning`, `error`, `critical`

Examples of available modules are:

- `securevu.app`
- `securevu.mqtt`
- `securevu.object_detection.base`
- `detector.<detector_name>`
- `watchdog.<camera_name>`
- `ffmpeg.<camera_name>.<sorted_roles>` NOTE: All FFmpeg logs are sent as `error` level.

#### Go2RTC Logging

See [the go2rtc docs](https://github.com/AlexxIT/go2rtc?tab=readme-ov-file#module-log) for logging configuration

```yaml
go2rtc:
  streams:
    # ...
  log:
    exec: trace
```

### `environment_vars`

This section can be used to set environment variables for those unable to modify the environment of the container, like within Home Assistant OS. Docker users should set environment variables in their `docker run` command (`-e SECUREVU_MQTT_PASSWORD=secret`) or `docker-compose.yml` file (`environment:` section) instead. Note that values set here are stored in plain text in your config file, so if the goal is to keep credentials out of your configuration, use Docker environment variables or Docker secrets instead.

Variables prefixed with `SECUREVU_` can be referenced in config fields that support environment variable substitution (such as MQTT host and credentials, camera stream URLs, and ONVIF host and credentials) using the `{SECUREVU_VARIABLE_NAME}` syntax.

Example:

```yaml
environment_vars:
  SECUREVU_MQTT_USER: my_mqtt_user
  SECUREVU_MQTT_PASSWORD: my_mqtt_password

mqtt:
  host: "{SECUREVU_MQTT_HOST}"
  user: "{SECUREVU_MQTT_USER}"
  password: "{SECUREVU_MQTT_PASSWORD}"
```

#### TensorFlow Thread Configuration

If you encounter thread creation errors during classification model training, you can limit TensorFlow's thread usage:

```yaml
environment_vars:
  TF_INTRA_OP_PARALLELISM_THREADS: "2" # Threads within operations (0 = use default)
  TF_INTER_OP_PARALLELISM_THREADS: "2" # Threads between operations (0 = use default)
  TF_DATASET_THREAD_POOL_SIZE: "2" # Data pipeline threads (0 = use default)
```

### `database`

Tracked object and recording information is managed in a sqlite database at `/config/securevu.db`. If that database is deleted, recordings will be orphaned and will need to be cleaned up manually. They also won't show up in the Media Browser within Home Assistant.

If you are storing your database on a network share (SMB, NFS, etc), you may get a `database is locked` error message on startup. You can customize the location of the database in the config if necessary.

This may need to be in a custom location if network storage is used for the media folder.

```yaml
database:
  path: /path/to/securevu.db
```

### `model`

If using a custom model, the width and height will need to be specified.

Custom models may also require different input tensor formats. The colorspace conversion supports RGB, BGR, or YUV frames to be sent to the object detector. The input tensor shape parameter is an enumeration to match what specified by the model.

| Tensor Dimension | Description    |
| :--------------: | -------------- |
|        N         | Batch Size     |
|        H         | Model Height   |
|        W         | Model Width    |
|        C         | Color Channels |

| Available Input Tensor Shapes |
| :---------------------------: |
|            "nhwc"             |
|            "nchw"             |

```yaml
# Optional: model config
model:
  path: /path/to/model
  width: 320
  height: 320
  input_tensor: "nhwc"
  input_pixel_format: "bgr"
```

#### `labelmap`

:::warning

If the labelmap is customized then the labels used for alerts will need to be adjusted as well. See [alert labels](../configuration/review.md#restricting-alerts-to-specific-labels) for more info.

:::

The labelmap can be customized to your needs. A common reason to do this is to combine multiple object types that are easily confused when you don't need to be as granular such as car/truck. By default, truck is renamed to car because they are often confused. You cannot add new object types, but you can change the names of existing objects in the model.

```yaml
model:
  labelmap:
    2: vehicle
    3: vehicle
    5: vehicle
    7: vehicle
    15: animal
    16: animal
    17: animal
```

Note that if you rename objects in the labelmap, you will also need to update your `objects -> track` list as well.

:::warning

Some labels have special handling and modifications can disable functionality.

`person` objects are associated with `face` and `amazon`

`car` objects are associated with `license_plate`, `ups`, `fedex`, `amazon`

:::

## Network Configuration

Changes to SecureVu's internal network configuration can be made by bind mounting nginx.conf into the container. For example:

```yaml
services:
  securevu:
    container_name: securevu
    ...
    volumes:
      ...
      - /path/to/your/nginx.conf:/usr/local/nginx/conf/nginx.conf
```

### Enabling IPv6

IPv6 is disabled by default, to enable IPv6 listen.gotmpl needs to be bind mounted with IPv6 enabled. For example:

```
{{ if not .enabled }}
# intended for external traffic, protected by auth
listen 8971;
{{ else }}
# intended for external traffic, protected by auth
listen 8971 ssl;

# intended for internal traffic, not protected by auth
listen 5000;
```

becomes

```
{{ if not .enabled }}
# intended for external traffic, protected by auth
listen [::]:8971 ipv6only=off;
{{ else }}
# intended for external traffic, protected by auth
listen [::]:8971 ipv6only=off ssl;

# intended for internal traffic, not protected by auth
listen [::]:5000 ipv6only=off;
```

## Base path

By default, SecureVu runs at the root path (`/`). However some setups require to run SecureVu under a custom path prefix (e.g. `/securevu`), especially when SecureVu is located behind a reverse proxy that requires path-based routing.

### Set Base Path via HTTP Header

The preferred way to configure the base path is through the `X-Ingress-Path` HTTP header, which needs to be set to the desired base path in an upstream reverse proxy.

For example, in Nginx:

```
location /securevu {
    proxy_set_header X-Ingress-Path /securevu;
    proxy_pass http://securevu_backend;
}
```

### Set Base Path via Environment Variable

When it is not feasible to set the base path via a HTTP header, it can also be set via the `SECUREVU_BASE_PATH` environment variable in the Docker Compose file.

For example:

```
services:
  securevu:
    image: SecureCorp-Mexico/SecureVu2:latest
    environment:
      - SECUREVU_BASE_PATH=/securevu
```

This can be used for example to access SecureVu via a Tailscale agent (https), by simply forwarding all requests to the base path (http):

```
tailscale serve --https=443 --bg --set-path /securevu http://localhost:5000/securevu
```

## Custom Dependencies

### Custom ffmpeg build

Included with SecureVu is a build of ffmpeg that works for the vast majority of users. However, there exists some hardware setups which have incompatibilities with the included build. In this case, statically built `ffmpeg` and `ffprobe` binaries can be placed in `/config/custom-ffmpeg/bin` for SecureVu to use.

To do this:

1. Download your ffmpeg build and uncompress it to the `/config/custom-ffmpeg` folder. Verify that both the `ffmpeg` and `ffprobe` binaries are located in `/config/custom-ffmpeg/bin`.
2. Update the `ffmpeg.path` in your SecureVu config to `/config/custom-ffmpeg`.
3. Restart SecureVu and the custom version will be used if the steps above were done correctly.

### Custom go2rtc version

SecureVu currently includes go2rtc v1.9.10, there may be certain cases where you want to run a different version of go2rtc.

To do this:

1. Download the go2rtc build to the `/config` folder.
2. Rename the build to `go2rtc`.
3. Give `go2rtc` execute permission.
4. Restart SecureVu and the custom version will be used, you can verify by checking go2rtc logs.

## Validating your config.yml file updates

When securevu starts up, it checks whether your config file is valid, and if it is not, the process exits. To minimize interruptions when updating your config, you have three options -- you can edit the config via the WebUI which has built in validation, use the config API, or you can validate on the command line using the securevu docker container.

### Via API

SecureVu can accept a new configuration file as JSON at the `/api/config/save` endpoint. When updating the config this way, SecureVu will validate the config before saving it, and return a `400` if the config is not valid.

```bash
curl -X POST http://securevu_host:5000/api/config/save -d @config.json
```

if you'd like you can use your yaml config directly by using [`yq`](https://github.com/mikefarah/yq) to convert it to json:

```bash
yq -o=json '.' config.yaml | curl -X POST 'http://securevu_host:5000/api/config/save?save_option=saveonly' --data-binary @-
```

### Via Command Line

You can also validate your config at the command line by using the docker container itself. In CI/CD, you leverage the return code to determine if your config is valid, SecureVu will return `1` if the config is invalid, or `0` if it's valid.

```bash
docker run                                \
  -v $(pwd)/config.yml:/config/config.yml \
  --entrypoint python3                    \
  ghcr.io/securecorp-mexico/securevu2:stable  \
  -u -m securevu                           \
  --validate-config
```
