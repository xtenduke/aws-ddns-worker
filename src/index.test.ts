import { AwsDdnsWorker } from './index';

describe('AwsDdnsWorker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws an error if required environment variables are missing', () => {
    expect(() => new AwsDdnsWorker()).toThrow('Invalid environment');
  });

  it('successfully initializes when all required environment variables are present', () => {
    process.env.ACCESS_KEY_ID = 'test-access-key';
    process.env.SECRET_ACCESS_KEY = 'test-secret';
    process.env.DOMAINS_CSV = 'example.com';
    process.env.HOSTED_ZONE_ID = 'Z123456';
    process.env.REGION = 'us-east-1';

    const worker = new AwsDdnsWorker();
    expect(worker).toBeInstanceOf(AwsDdnsWorker);
  });
});
