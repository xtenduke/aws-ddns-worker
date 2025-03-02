import { Route53Client, ChangeResourceRecordSetsCommandInput, ChangeResourceRecordSetsCommand, Change, ListResourceRecordSetsCommand, ListResourceRecordSetsRequest } from "@aws-sdk/client-route-53";
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
  region: string
}

class AwsDdnsWorker {
  private env: Env;
  private client: Route53Client;

  constructor() {
    this.env = AwsDdnsWorker.getEnv();
    this.client = new Route53Client({
      region: this.env.region,
      credentials: {
        accessKeyId: this.env.accessKeyId,
        secretAccessKey: this.env.secretAccessKey
      }
    });
  }

  private static getEnv(): Env {
    const accessKeyId = process.env.ACCESS_KEY_ID
    const secretAccessKey = process.env.SECRET_ACCESS_KEY
    const domainsCsv = process.env.DOMAINS_CSV
    const delaySeconds = process.env.DELAY_SECONDS
    const hostedZoneId = process.env.HOSTED_ZONE_ID
    const region = process.env.REGION
    if (
      !accessKeyId || accessKeyId.length == 0 ||
      !secretAccessKey || secretAccessKey.length == 0 ||
      !domainsCsv || domainsCsv.length == 0 ||
      !hostedZoneId || hostedZoneId.length == 0 ||
      !region || region.length == 0) {
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
      hostedZoneId,
      region
    }
  }

  private async areChangesRequired(domainsCsv: string, ip: string): Promise<boolean> {
    const domains = new Set(domainsCsv.split(','));
    
    const input: ListResourceRecordSetsRequest = {
      HostedZoneId: this.env.hostedZoneId,
    };
    
    const response = await this.client.send(new ListResourceRecordSetsCommand(input));
    
    const matchingRecords = (response.ResourceRecordSets ?? []).flatMap((record) => {
      if (!record.Name) return [];
      // AWS have some sort of encoding when pulling domains from SDK
      const domain = record.Name.replace(/\\052/g, '*').replace(/\.$/, '').trim();
      if (!domains.has(domain)) return [];    
      return [{ domain, ips: record.ResourceRecords?.map((x) => x.Value) ?? [] }];
    });
    
    log(`Found ${matchingRecords.length} matching records, expecting ${domains.size}`);
    if (matchingRecords.length !== domains.size) {
      return true;
    }
    
    const recordsWithWrongIp = matchingRecords.filter(({ ips }) => {
      return ips.length === 0 || !ips.includes(ip);
    });
    
    log(`Found ${recordsWithWrongIp.length} records with the wrong IP`);
    
    return recordsWithWrongIp.length !== 0;
  }

  private getChanges(domainsCsv: string, ip: string): Change[] {
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
              Value: ip
            }
          ]
        }
      }
    });
  }

  private async updateRecords(ip: string) {
    log(`Beginning update`);
    log(`Using ip ${ip}`);
    const upsert: ChangeResourceRecordSetsCommandInput = {
      HostedZoneId: this.env.hostedZoneId,
      ChangeBatch: {
        Changes: this.getChanges(this.env.domainsCsv, ip)
      }
    }

    const command = new ChangeResourceRecordSetsCommand(upsert);
    await this.client.send(command);
  }

  public async run() {
    const ip = await publicIpv4();

    const changesRequired = await this.areChangesRequired(this.env.domainsCsv, ip);
    if (changesRequired) {
      log(`Update required`);
      await this.updateRecords(ip);
    } else {
      log(`Update not required`);
    }
    
    const nextRunTime = new Date(Date.now() + this.env.delay).toISOString();
    log(`next run at: ${nextRunTime}`);

    setTimeout(async () => {
      try {
        this.run();
      } catch (err) {
        log(`Something went wrong failed`);
        console.error(err);
      }
    }, this.env.delay)
  }
}

const worker = new AwsDdnsWorker();
worker.run().then(() => { })
