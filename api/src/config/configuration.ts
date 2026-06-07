export default {
  get mqtt() {
    return {
      brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
      topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'sensor/lora',
    }
  },
  get influxdb() {
    return {
      url: process.env.INFLUXDB_URL || 'http://localhost:8086',
      token: process.env.INFLUXDB_TOKEN || 'my-super-secret-token',
      org: process.env.INFLUXDB_ORG || 'agri',
      bucket: process.env.INFLUXDB_BUCKET || 'agri_iot',
    }
  },
  get simulator() {
    return {
      enabled: process.env.SIMULATOR_ENABLED === 'true',
      probeCount: parseInt(process.env.SIMULATOR_PROBE_COUNT || '20') || 20,
    }
  },
}
