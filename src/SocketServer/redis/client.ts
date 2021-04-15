
import redis from 'redis';
const redisClient = redis.createClient({
  host: '192.168.0.2',
  port: 6379
});

export default redisClient;