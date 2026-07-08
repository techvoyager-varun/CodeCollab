const Redis = require('ioredis');
const { Redis: UpstashRedis } = require('@upstash/redis');

let redis = null;
let isUpstash = false;

async function connectRedis() {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log('[REDIS] Connecting to Upstash Redis via REST...');
      redis = new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      // Test ping
      const res = await redis.ping();
      console.log('[REDIS] Connected to Upstash (Ping response:', res, ')');
      isUpstash = true;
      return;
    }

    if (!process.env.REDIS_URL) {
      console.warn('[REDIS] No REDIS_URL — running without Redis');
      return;
    }

    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true
    });

    redis.on('error', (err) => {
      // Catch connection errors to prevent unhandled process events
      console.warn('[REDIS] Connection error:', err.message);
    });

    await redis.connect();
    console.log('[REDIS] Connected');
  } catch (err) {
    console.warn('[REDIS] Connection failed — running without Redis:', err.message);
    redis = null;
  }
}

function getRedis() {
  return redis;
}

module.exports = { connectRedis, getRedis };
