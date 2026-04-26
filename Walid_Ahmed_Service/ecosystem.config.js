module.exports = {
  apps: [
    {
      name: "secrets-broker",
      script: "./src/server.js",
      cwd: "./secrets-broker",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
        SERVICE_NAME: "secrets-broker",
        MONGO_URI: "mongodb://localhost:27017",
        DB_NAME: "secrets_broker_db"
      }
    },
    {
      name: "chaos-simulator",
      script: "./src/server.js",
      cwd: "./chaos-simulator",
      env: {
        NODE_ENV: "development",
        PORT: 3002,
        SERVICE_NAME: "chaos-simulator",
        MONGO_URI: "mongodb://localhost:27018",
        DB_NAME: "chaos_simulator_db",
        KAFKA_BROKERS: "localhost:9092",
        KAFKA_CLIENT_ID: "chaos-simulator-client"
      }
    }
  ]
};
