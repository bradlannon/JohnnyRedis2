import { TOPICS, RETAIN } from '@johnnyredis/shared'

// Placeholder entrypoint — confirms cross-package import from @johnnyredis/shared works
console.log('JohnnyRedis Hub starting...')
console.log('Available MQTT topics:', Object.keys(TOPICS))
console.log('Retain policy:', RETAIN)
