---
id: tls
title: TLS
---

# TLS

SecureVu's integrated NGINX server supports TLS certificates. By default SecureVu will generate a self signed certificate that will be used for port 8971. SecureVu is designed to make it easy to use whatever tool you prefer to manage certificates.

SecureVu is often running behind a reverse proxy that manages TLS certificates for multiple services. You will likely need to set your reverse proxy to allow self signed certificates or you can disable TLS in SecureVu's config. However, if you are running on a dedicated device that's separate from your proxy or if you expose SecureVu directly to the internet, you may want to configure TLS with valid certificates.

In many deployments, TLS will be unnecessary. It can be disabled in the config with the following yaml:

```yaml
tls:
  enabled: False
```

## Certificates

TLS certificates can be mounted at `/etc/letsencrypt/live/securevu` using a bind mount or docker volume.

```yaml {3-4}
securevu:
  ...
  volumes:
    - /path/to/your/certificate_folder:/etc/letsencrypt/live/securevu:ro
  ...
```

Within the folder, the private key is expected to be named `privkey.pem` and the certificate is expected to be named `fullchain.pem`.

Note that certbot uses symlinks, and those can't be followed by the container unless it has access to the targets as well, so if using certbot you'll also have to mount the `archive` folder for your domain, e.g.:

```yaml {3-5}
securevu:
  ...
  volumes:
    - /etc/letsencrypt/live/your.fqdn.net:/etc/letsencrypt/live/securevu:ro
    - /etc/letsencrypt/archive/your.fqdn.net:/etc/letsencrypt/archive/your.fqdn.net:ro
  ...

```

SecureVu automatically compares the fingerprint of the certificate at `/etc/letsencrypt/live/securevu/fullchain.pem` against the fingerprint of the TLS cert in NGINX every minute. If these differ, the NGINX config is reloaded to pick up the updated certificate.

If you issue SecureVu valid certificates you will likely want to configure it to run on port 443 so you can access it without a port number like `https://your-securevu-domain.com` by mapping 8971 to 443.

```yaml {3-4}
securevu:
  ...
  ports:
    - "443:8971"
  ...
```

## ACME Challenge

SecureVu also supports hosting the acme challenge files for the HTTP challenge method if needed. The challenge files should be mounted at `/etc/letsencrypt/www`.
