---
id: metrics
title: Metrics
---

# Metrics

SecureVu exposes Prometheus metrics at the `/api/metrics` endpoint that can be used to monitor the performance and health of your SecureVu instance.

## Available Metrics

### System Metrics
- `securevu_cpu_usage_percent{pid="", name="", process="", type="", cmdline=""}` - Process CPU usage percentage
- `securevu_mem_usage_percent{pid="", name="", process="", type="", cmdline=""}` - Process memory usage percentage
- `securevu_gpu_usage_percent{gpu_name=""}` - GPU utilization percentage
- `securevu_gpu_mem_usage_percent{gpu_name=""}` - GPU memory usage percentage

### Camera Metrics
- `securevu_camera_fps{camera_name=""}` - Frames per second being consumed from your camera
- `securevu_detection_fps{camera_name=""}` - Number of times detection is run per second
- `securevu_process_fps{camera_name=""}` - Frames per second being processed
- `securevu_skipped_fps{camera_name=""}` - Frames per second skipped for processing
- `securevu_detection_enabled{camera_name=""}` - Detection enabled status for camera
- `securevu_audio_dBFS{camera_name=""}` - Audio dBFS for camera
- `securevu_audio_rms{camera_name=""}` - Audio RMS for camera

### Detector Metrics
- `securevu_detector_inference_speed_seconds{name=""}` - Time spent running object detection in seconds
- `securevu_detection_start{name=""}` - Detector start time (unix timestamp)

### Storage Metrics
- `securevu_storage_free_bytes{storage=""}` - Storage free bytes
- `securevu_storage_total_bytes{storage=""}` - Storage total bytes
- `securevu_storage_used_bytes{storage=""}` - Storage used bytes
- `securevu_storage_mount_type{mount_type="", storage=""}` - Storage mount type info

### Service Metrics
- `securevu_service_uptime_seconds` - Uptime in seconds
- `securevu_service_last_updated_timestamp` - Stats recorded time (unix timestamp)
- `securevu_device_temperature{device=""}` - Device Temperature

### Event Metrics
- `securevu_camera_events{camera="", label=""}` - Count of camera events since exporter started

## Configuring Prometheus

To scrape metrics from SecureVu, add the following to your Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'securevu'
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['securevu:5000']
    scrape_interval: 15s
```

## Example Queries

Here are some example PromQL queries that might be useful:

```promql
# Average CPU usage across all processes
avg(securevu_cpu_usage_percent)

# Total GPU memory usage
sum(securevu_gpu_mem_usage_percent)

# Detection FPS by camera
rate(securevu_detection_fps{camera_name="front_door"}[5m])

# Storage usage percentage
(securevu_storage_used_bytes / securevu_storage_total_bytes) * 100

# Event count by camera in last hour
increase(securevu_camera_events[1h])
```

## Grafana Dashboard

You can use these metrics to create Grafana dashboards to monitor your SecureVu instance. Here's an example of metrics you might want to track:

- CPU, Memory and GPU usage over time
- Camera FPS and detection rates
- Storage usage and trends
- Event counts by camera
- System temperatures

A sample Grafana dashboard JSON will be provided in a future update.

## Metric Types

The metrics exposed by SecureVu use the following Prometheus metric types:

- **Counter**: Cumulative values that only increase (e.g., `securevu_camera_events`)
- **Gauge**: Values that can go up and down (e.g., `securevu_cpu_usage_percent`)
- **Info**: Key-value pairs for metadata (e.g., `securevu_storage_mount_type`)

For more information about Prometheus metric types, see the [Prometheus documentation](https://prometheus.io/docs/concepts/metric_types/).
