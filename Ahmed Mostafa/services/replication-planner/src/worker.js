const crypto = require("crypto");
const { intEnv, listEnv, stringEnv } = require("../../../shared/config");
const {
  connectProducer,
  createKafka,
  makeEvent,
  parseKafkaMessage,
  publishJson,
  topic
} = require("../../../shared/kafka");
const { createLogger } = require("../../../shared/logger");
const { connectMongo, pingMongo } = require("../../../shared/mongo");
const { createReplicationPlannerApp } = require("./app");
const { buildReplicationTasks } = require("./plan-builder");
const { createReplicationPlannerRepository } = require("./repository");

const serviceName = stringEnv("SERVICE_NAME", "replication-planner");
const logger = createLogger(serviceName);

async function main() {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const defaultFactor = intEnv("DEFAULT_REPLICATION_FACTOR", 3);
  const inputTopics = listEnv(
    "PLANNER_INPUT_TOPICS",
    "upload.completed,node.heartbeat.missed,integrity.failed"
  );
  const targetNodes = listEnv("DEFAULT_TARGET_NODES", "storage-node-a,storage-node-b,storage-node-c");
  const outputTopic = topic("REPLICATION_TASK_TOPIC", "replication.task.created");
  const dlqTopic = topic("REPLICATION_TASK_DLQ_TOPIC", "replication.task.created.DLQ");

  const { client: mongoClient, db } = await connectMongo(serviceName, logger);
  const repository = createReplicationPlannerRepository(db);
  await repository.ensureIndexes();
  await repository.ensureDefaultPolicy(defaultFactor);

  const kafka = createKafka(serviceName);
  const producer = await connectProducer(kafka);
  const consumer = kafka.consumer({
    groupId: stringEnv("KAFKA_GROUP_ID", "replication-planner-group")
  });

  const state = {
    consumer_running: false,
    kafka_producer: "ok"
  };

  const planner = createPlanner({ dlqTopic, logger, outputTopic, producer, repository, targetNodes });

  await consumer.connect();
  for (const inputTopic of inputTopics) {
    await consumer.subscribe({ fromBeginning: false, topic: inputTopic });
  }

  await consumer.run({
    eachMessage: async ({ message, partition, topic: sourceTopic }) => {
      const sourceEventId = `${sourceTopic}-${partition}-${message.offset}`;
      let event;
      try {
        event = parseKafkaMessage(message);
        await planner.planFromEvent(sourceTopic, event, { sourceEventId });
      } catch (error) {
        logger.error("failed to process kafka event", {
          error: error.message,
          offset: message.offset,
          partition,
          source_topic: sourceTopic
        });
        await planner.publishDlq(sourceTopic, event || { raw: message.value && message.value.toString("utf8") }, error, {
          sourceEventId
        });
      }
    }
  });
  state.consumer_running = true;

  const app = createReplicationPlannerApp({
    logger,
    planner,
    readyCheck: async () => {
      await pingMongo(db);
      return {
        database: "mongodb",
        input_topics: inputTopics,
        output_topic: outputTopic,
        ...state
      };
    },
    serviceName
  });

  const server = app.listen(port, () => {
    logger.info("service listening", { input_topics: inputTopics, output_topic: outputTopic, port });
  });

  async function shutdown(signal) {
    logger.info("shutdown requested", { signal });
    server.close(async () => {
      await consumer.disconnect();
      await producer.disconnect();
      await mongoClient.close();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function createPlanner({ dlqTopic, logger, outputTopic, producer, repository, targetNodes }) {
  async function planFromEvent(sourceTopic, event, context = {}) {
    const sourceEventId = event.event_id || context.sourceEventId || crypto.randomUUID();
    const policy = await repository.getDefaultPolicy();
    const tasks = buildReplicationTasks({ event, policy, sourceTopic, targetNodes });
    const run = await repository.recordRun({
      error: null,
      id: crypto.randomUUID(),
      source_event_id: sourceEventId,
      source_topic: sourceTopic,
      status: "planned",
      task_count: tasks.length,
      trigger_type: event.event_type || sourceTopic
    });

    for (const task of tasks) {
      await publishJson(
        producer,
        outputTopic,
        makeEvent(
          "replication.task.created",
          serviceName,
          { ...task, plan_id: run.id, source_event_id: sourceEventId },
          { correlation_id: sourceEventId, request_id: context.requestId || null }
        ),
        task.chunk_id
      );
    }

    logger.info("replication plan created", {
      plan_id: run.id,
      source_event_id: sourceEventId,
      source_topic: sourceTopic,
      task_count: tasks.length
    });

    return {
      plan_id: run.id,
      source_event_id: sourceEventId,
      source_topic: sourceTopic,
      task_count: tasks.length,
      tasks
    };
  }

  async function publishDlq(sourceTopic, event, error, context = {}) {
    const sourceEventId = event.event_id || context.sourceEventId || crypto.randomUUID();
    await repository.recordRun({
      error: error.message,
      id: crypto.randomUUID(),
      source_event_id: sourceEventId,
      source_topic: sourceTopic,
      status: "failed",
      task_count: 0,
      trigger_type: event.event_type || sourceTopic
    });

    await publishJson(
      producer,
      dlqTopic,
      makeEvent("replication.task.created.DLQ", serviceName, {
        error: error.message,
        source_event: event,
        source_topic: sourceTopic
      }),
      sourceEventId
    );
  }

  return { planFromEvent, publishDlq };
}

main().catch((error) => {
  logger.error("service failed to start", { error: error.message, stack: error.stack });
  process.exit(1);
});
