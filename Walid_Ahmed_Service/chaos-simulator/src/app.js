const express = require("express");
const env = require("./config/env");
const chaosRoutes = require("./routes/chaosRoutes");
const requestContext = require("./middleware/requestContext");
const { getKafkaStatus } = require("./config/kafka");
const { mongoose } = require("./config/database");
const { countRules } = require("./services/chaosService");
const openApiDocument = require("../docs/openapi.json");

const app = express();

app.use(express.json());
app.use(requestContext(env.serviceName));
app.use(chaosRoutes);

app.get("/docs/openapi.json", (_req, res) => {
  return res.json(openApiDocument);
});

app.get("/health", async (req, res) => {
  const totalRules = await countRules().catch(() => 0);
  return res.json({
    success: true,
    data: {
      status: "ok",
      totalRules
    },
    meta: {
      service: req.serviceName,
      request_id: req.requestId
    }
  });
});

app.get("/ready", (req, res) => {
  const kafkaStatus = getKafkaStatus();
  const ready = mongoose.connection.readyState === 1 && kafkaStatus.producerConnected;

  return res.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      ready,
      database: mongoose.connection.readyState === 1,
      kafka: kafkaStatus
    },
    meta: {
      service: req.serviceName,
      request_id: req.requestId
    }
  });
});

module.exports = app;
