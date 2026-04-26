const express = require("express");
const {
  asyncHandler,
  errorHandler,
  notFound,
  requestContext,
  success
} = require("../../../shared/http");

function createReplicationPlannerApp(options) {
  const { logger, planner, readyCheck, serviceName } = options;
  const app = express();

  app.use(requestContext(serviceName));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => {
    success(req, res, { status: "ok" });
  });

  app.get(
    "/ready",
    asyncHandler(async (req, res) => {
      const checks = await readyCheck();
      success(req, res, { status: "ready", checks });
    })
  );

  app.post(
    "/replication/plan",
    asyncHandler(async (req, res) => {
      const sourceTopic = req.body.topic || req.body.source_topic || req.body.event_type || "manual.replication.plan";
      const event = req.body.event || req.body;
      const result = await planner.planFromEvent(sourceTopic, event, {
        requestId: req.context.requestId
      });
      success(req, res, result, 202);
    })
  );

  app.use(notFound);
  app.use(errorHandler(logger));

  return app;
}

module.exports = { createReplicationPlannerApp };
