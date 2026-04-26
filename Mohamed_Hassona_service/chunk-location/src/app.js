const express = require("express");
const { randomUUID } = require("crypto");

const { AppError } = require("./errors");
const { successResponse, errorResponse } = require("./response");

const SERVICE_NAME = "chunk-location";

function createApp({ repository }) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    req.requestId = req.header("x-request-id") || randomUUID();
    next();
  });

  app.get("/health", (req, res) => {
    res.json(
      successResponse(SERVICE_NAME, req.requestId, {
        status: "ok"
      })
    );
  });

  app.get("/ready", async (req, res, next) => {
    try {
      await repository.ping();
      res.json(
        successResponse(SERVICE_NAME, req.requestId, {
          status: "ready"
        })
      );
    } catch (error) {
      next(new AppError(503, "SERVICE_NOT_READY", "Database connection is not ready."));
    }
  });

  app.post("/chunk-locations", async (req, res, next) => {
    try {
      const payload = validateCreateLocation(req.body);
      const location = await repository.createLocation(payload);
      res
        .status(201)
        .json(successResponse(SERVICE_NAME, req.requestId, location));
    } catch (error) {
      next(error);
    }
  });

  app.get("/chunks/:id/replicas", async (req, res, next) => {
    try {
      const chunkId = req.params.id;
      if (!chunkId) {
        throw new AppError(400, "VALIDATION_ERROR", "chunk id is required.", { chunk_id: "required" });
      }

      const replicas = await repository.listReplicas(chunkId);
      res.json(successResponse(SERVICE_NAME, req.requestId, replicas));
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).json(
      errorResponse(SERVICE_NAME, req.requestId || randomUUID(), "NOT_FOUND", "Route not found.", {})
    );
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const statusCode = error.statusCode || 500;
    const code = error.code || "INTERNAL_SERVER_ERROR";
    const message = error.statusCode ? error.message : "Unexpected server error.";
    const details = error.details || {};

    res.status(statusCode).json(errorResponse(SERVICE_NAME, req.requestId, code, message, details));
  });

  return app;
}

function validateCreateLocation(body) {
  const details = {};

  if (!body || typeof body.chunk_id !== "string" || body.chunk_id.trim() === "") {
    details.chunk_id = "chunk_id must be a non-empty string.";
  }

  if (!body || typeof body.node_id !== "string" || body.node_id.trim() === "") {
    details.node_id = "node_id must be a non-empty string.";
  }

  if (Object.keys(details).length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid chunk location payload.", details);
  }

  return {
    chunkId: body.chunk_id.trim(),
    nodeId: body.node_id.trim()
  };
}

module.exports = {
  createApp
};
