export * from './writeMicros';
export * from './readMicros';
export * from './utils';
export * from './actions';
import IORedis from 'ioredis';
import Redis from 'ioredis';
import log from 'Shared/logger';
interface RedisOpts {
  development: IORedis.RedisOptions;
  test: IORedis.RedisOptions;
}
const envOpts: RedisOpts = {
  test: {
    host: '192.168.0.2',
    port: 6379,
    keyPrefix: 'test:'
  },
  development: {
    host: '192.168.0.2',
    port: 6379,
    keyPrefix: 'development:'
  }
}
const redisEnv = typeof jest === 'undefined' ? 'development' : 'test';
const opts = envOpts[redisEnv];

const redisClient = new Redis(opts);

log('info', `Attaching to Redis ${redisEnv}.`);
export default redisClient;
