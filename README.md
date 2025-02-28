# aws-ddns-worker
AWS dns record updater for 'dynamic dns'

ENV requirement:
```
ACCESS_KEY_ID: your access key id
SECRET_ACCESS_KEY: secret access key
DOMAINS_CSV: domains you want to set / update: e.g. example.com,www.example.com
DELAY_SECONDS: how often this should run in seconds (defaults to 3600 noisy)
HOSTED_ZONE_ID: the id of the aws hosted zone
```

Run:
```
$ docker run ghcr.io/xtenduke/aws-ddns-worker:latest
```
