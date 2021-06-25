import * as dotenv from 'dotenv';
export * from './writeMicros';
export * from './readMicros';
export * from './utils';
export * from './actions';
import IORedis from 'ioredis';
import Redis from 'ioredis';
import path from 'path';
import log from 'Shared/logger';
dotenv.config();
interface RedisOpts {
  development: IORedis.RedisOptions;
  test: IORedis.RedisOptions;
}

interface LaunchEnv {
  REDIS_IP: string;
  REDIS_PORT: string;
  NODE_ENV: string;
}
const {
  NODE_ENV
} = process.env as unknown as LaunchEnv;
let nodeEnv: string;
if(NODE_ENV === 'development' || NODE_ENV === 'production') {
  nodeEnv = NODE_ENV
} else {
  nodeEnv = 'development';
}
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${nodeEnv}`),
});
const {
  REDIS_IP,
  REDIS_PORT,
} = process.env as unknown as LaunchEnv;
const envOpts: RedisOpts = {
  test: {
    host: REDIS_IP,
    port: Number(REDIS_PORT),
    keyPrefix: 'test:'
  },
  development: {
    host: REDIS_IP,
    port: Number(REDIS_PORT),
    keyPrefix: 'development:'
  }
};
const redisEnv = typeof jest === 'undefined' ? 'development' : 'test';
const opts = envOpts[redisEnv];

const redisClient = new Redis(opts);

log('info', `Attaching to Redis ${redisEnv} @ ${REDIS_IP}:${REDIS_PORT}.`);
export default redisClient;
