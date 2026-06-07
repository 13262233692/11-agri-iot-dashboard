export default {
  get mqtt() {
    return {
      brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
      topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'sensor/lora',
      backoffBaseMs: parseInt(process.env.MQTT_BACKOFF_BASE_MS || '1000'),
      backoffMaxMs: parseInt(process.env.MQTT_BACKOFF_MAX_MS || '60000'),
      backoffJitter: parseFloat(process.env.MQTT_BACKOFF_JITTER || '0.3'),
      messageBucketCapacity: parseInt(process.env.MQTT_MSG_BUCKET_CAPACITY || '200'),
      messageBucketRefillPerSec: parseInt(process.env.MQTT_MSG_BUCKET_REFILL || '100'),
      connectTimeoutMs: parseInt(process.env.MQTT_CONNECT_TIMEOUT_MS || '10000'),
    }
  },
  get influxdb() {
    return {
      url: process.env.INFLUXDB_URL || 'http://localhost:8086',
      token: process.env.INFLUXDB_TOKEN || 'my-super-secret-token',
      org: process.env.INFLUXDB_ORG || 'agri',
      bucket: process.env.INFLUXDB_BUCKET || 'agri_iot',
      writeBucketCapacity: parseInt(process.env.INFLUX_WRITE_BUCKET_CAPACITY || '500'),
      writeBucketRefillPerSec: parseInt(process.env.INFLUX_WRITE_BUCKET_REFILL || '200'),
      highWatermark: parseInt(process.env.INFLUX_HIGH_WATERMARK || '1000'),
      lowWatermark: parseInt(process.env.INFLUX_LOW_WATERMARK || '200'),
    }
  },
  get ws() {
    return {
      maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '50'),
      emitBucketCapacity: parseInt(process.env.WS_EMIT_BUCKET_CAPACITY || '30'),
      emitBucketRefillPerSec: parseInt(process.env.WS_EMIT_BUCKET_REFILL || '10'),
    }
  },
  get simulator() {
    return {
      enabled: process.env.SIMULATOR_ENABLED === 'true',
      probeCount: parseInt(process.env.SIMULATOR_PROBE_COUNT || '20') || 20,
    }
  },
}
