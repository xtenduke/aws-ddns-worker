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

With docker compose / podman-compose:
```
services:
  app:
    image: ghcr.io/xtenduke/aws-ddns-worker:latest
    container_name: aws-ddns-worker
    restart: always
    environment:
     - ACCESS_KEY_ID=your-access-key-id
     - SECRET_ACCESS_KEY=your-secret-key-id
     - DOMAINS_CSV=your-domains
     - DELAY_SECONDS=3600
     - HOSTED_ZONE_ID=hosted-zone-id
```


IAM Policy:
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "route53:GetHostedZone",
                "route53:ChangeResourceRecordSets"
            ],
            "Resource": "arn:aws:route53:::hostedzone/<your-zone-id>"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": "route53:GetChange",
            "Resource": "arn:aws:route53:::hostedzone/<your-zone-id>"
        }
    ]
}
```
