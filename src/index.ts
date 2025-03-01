import { Route53Client, ChangeResourceRecordSetsCommandInput, ChangeResourceRecordSetsCommand, Change } from "@aws-sdk/client-route-53";
import { publicIpv4 } from "public-ip"

const DEFAULT_DELAY = 3600

const log = (message: string) => {
  console.log(`${new Date().toISOString()} ${message}`);
}

type Env = {
  accessKeyId: string
  secretAccessKey: string
  domainsCsv: string
  delay: number
  hostedZoneId: string
}

const getEnv = (): Env => {
  const accessKeyId = process.env.ACCESS_KEY_ID
  const secretAccessKey = process.env.SECRET_ACCESS_KEY
  const domainsCsv = process.env.DOMAINS_CSV
  const delaySeconds = process.env.DELAY_SECONDS
  const hostedZoneId = process.env.HOSTED_ZONE_ID
  if (
    !accessKeyId || accessKeyId.length == 0 ||
    !secretAccessKey || secretAccessKey.length == 0 ||
    !domainsCsv || domainsCsv.length == 0 ||
    !hostedZoneId || hostedZoneId.length == 0) {
    throw new Error("Invalid environment");
  }


  var delay = DEFAULT_DELAY
  const parsed = Number(delaySeconds);
  if (!isNaN(parsed)) {
    delay = parsed;
  } else {
    log(`Failed parsing delay from env value: ${delaySeconds} - default to ${delay} seconds`);
  }

  return {
    accessKeyId,
    secretAccessKey,
    domainsCsv,
    delay: delay * 1000,
    hostedZoneId
  }
}

export const run = async () => {
  var env = getEnv()

  log(`Beginning update`);
  const client = new Route53Client({
    region: "ap-southeast-2",
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey
    }
  });

  const getChanges = (domainsCsv: string, _ip: string): Change[] => {
    const domains = domainsCsv.split(',');
    return domains.map((domain) => {
      return {
        Action: "UPSERT",
        ResourceRecordSet: {
          Name: domain,
          Type: "A",
          TTL: 3600,
          ResourceRecords: [
            {
              Value: _ip
            }
          ]
        }
      }
    })
  }

  const ip = await publicIpv4();
  log(`Using ip ${ip}`);

  const upsert: ChangeResourceRecordSetsCommandInput = {
    HostedZoneId: env.hostedZoneId,
    ChangeBatch: {
      Changes: getChanges(env.domainsCsv, ip)
    }
  }

  const command = new ChangeResourceRecordSetsCommand(upsert);
  await client.send(command);
  const nextRunTime = new Date(Date.now() + env.delay).toISOString();
  log(`next run at: ${nextRunTime}`);

  setTimeout(async () => {
    try {
      run();
    } catch (err) {
      log(`Update failed`);
      console.error(err);
    }
  }, env.delay) 
}

run().then(() => {})
