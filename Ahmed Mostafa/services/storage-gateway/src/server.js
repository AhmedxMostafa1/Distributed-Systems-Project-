const path = require("path");
const { stringEnv } = require("../../../shared/config");
const { createLogger } = require("../../../shared/logger");
const { connectProducer, createKafka, makeEvent, publishJson, topic } = require("../../../shared/kafka");
const { connectMongo, pingMongo } = require("../../../shared/mongo");
const { createObjectRepository } = require("./object-repository");
const { createStorageGatewayApp } = require("./app");

const serviceName = stringEnv("SERVICE_NAME", "storage-gateway");
const logger = createLogger(serviceName);

async function main() {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const storageRoot = stringEnv(
    "OBJECT_STORAGE_ROOT",
    path.join(process.cwd(), "object-data", "storage-gateway")
  );

  const { client: mongoClient, db } = await connectMongo(serviceName, logger);
  const repository = createObjectRepository(db);
  await repository.ensureIndexes();

  const kafka = createKafka(serviceName);
  const producer = await connectProducer(kafka);
  const chunkStoredTopic = topic("CHUNK_STORED_TOPIC", "chunk.stored");

  const publisher = {
    async publishChunkStored(record, requestId) {
      const event = makeEvent(
        "chunk.stored",
        serviceName,
        {
          chunk_id: record.chunk_id,
          content_type: record.content_type,
          hash: record.hash,
          path: record.path,
          size: record.size
        },
        { request_id: requestId }
      );
      await publishJson(producer, chunkStoredTopic, event, record.chunk_id);
      logger.info("published chunk.stored", { chunk_id: record.chunk_id, topic: chunkStoredTopic });
    }
  };

  const app = createStorageGatewayApp({
    logger,
    publisher,
    readyCheck: async () => {
      await pingMongo(db);
      return { database: "mongodb", kafka_producer: "ok", storage_root: storageRoot };
    },
    repository,
    serviceName,
    storageRoot
  });

  const server = app.listen(port, () => {
    logger.info("service listening", { port, storage_root: storageRoot });
  });

  async function shutdown(signal) {
    logger.info("shutdown requested", { signal });
    server.close(async () => {
      await producer.disconnect();
      await mongoClient.close();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  logger.error("service failed to start", { error: error.message, stack: error.stack });
  process.exit(1);
});
