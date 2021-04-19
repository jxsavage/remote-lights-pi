import Redis from 'ioredis';
const opts = {
  host: '192.168.0.2',
  port: 6379
}
const redisClient = new Redis(opts);

export default redisClient;