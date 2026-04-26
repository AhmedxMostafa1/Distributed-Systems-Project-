const express = require("express");
const env = require("./config/env");
const secretRoutes = require("./routes/secretRoutes");
const requestContext = require("./middleware/requestContext");
const { mongoose } = require("./config/database");
const { countActiveSecrets } = require("./services/secretService");
const openApiDocument = require("../docs/openapi.json");

const app = express();

app.use(express.json());
app.use(requestContext(env.serviceName));
app.use(secretRoutes);

app.get("/docs/openapi.json", (_req, res) => {
  return res.json(openApiDocument);
});

app.get("/health", async (req, res) => {
  const activeSecrets = await countActiveSecrets().catch(() => 0);
  return res.json({
    success: true,
    data: {
      status: "ok",
      activeSecrets
    },
    meta: {
      service: req.serviceName,
      request_id: req.requestId
    }
  });
});

app.get("/ready", (req, res) => {
  const ready = mongoose.connection.readyState === 1;

  return res.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      ready,
      database: mongoose.connection.readyState === 1
    },
    meta: {
      service: req.serviceName,
      request_id: req.requestId
    }
  });
});

module.exports = app;
