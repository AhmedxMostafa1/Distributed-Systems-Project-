module.exports = {
  apps: [
    {
      name: "storage-gateway",
      script: "services/storage-gateway/src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        CHUNK_STORED_TOPIC: "chunk.stored",
        KAFKA_BROKERS: "localhost:9094",
        MONGO_DB_NAME: "storage_gateway",
        MONGO_URI: "mongodb://storage_gateway:storage_gateway_pw@localhost:27019/storage_gateway?authSource=admin",
        NODE_ENV: "production",
        OBJECT_STORAGE_ROOT: "object-data/storage-gateway",
        PORT: 3019,
        SERVICE_NAME: "storage-gateway"
      }
    },
    {
      name: "replication-planner",
      script: "services/replication-planner/src/worker.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        DEFAULT_REPLICATION_FACTOR: "3",
        DEFAULT_TARGET_NODES: "storage-node-a,storage-node-b,storage-node-c",
        KAFKA_BROKERS: "localhost:9094",
        KAFKA_GROUP_ID: "replication-planner-group",
        MONGO_DB_NAME: "replication_planner",
        MONGO_URI: "mongodb://replication_planner:replication_planner_pw@localhost:27020/replication_planner?authSource=admin",
        NODE_ENV: "production",
        PLANNER_INPUT_TOPICS: "upload.completed,node.heartbeat.missed,integrity.failed",
        PORT: 3020,
        REPLICATION_TASK_DLQ_TOPIC: "replication.task.created.DLQ",
        REPLICATION_TASK_TOPIC: "replication.task.created",
        SERVICE_NAME: "replication-planner"
      }
    }
  ]
};
