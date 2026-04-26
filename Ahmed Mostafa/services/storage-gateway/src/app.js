const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const {
  HttpError,
  asyncHandler,
  errorHandler,
  notFound,
  requestContext,
  success
} = require("../../../shared/http");
const {
  buildObjectRecord,
  normalizeChunkId,
  objectPathFor,
  parseObjectBody
} = require("./object-service");

function createStorageGatewayApp(options) {
  const {
    logger,
    publisher,
    readyCheck,
    repository,
    serviceName,
    storageRoot
  } = options;

  const app = express();
  const rawBody = express.raw({
    limit: process.env.MAX_OBJECT_BYTES || "50mb",
    type: "*/*"
  });

  app.use(requestContext(serviceName));

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

  app.put(
    "/objects/:chunk_id",
    rawBody,
    asyncHandler(async (req, res) => {
      const chunkId = normalizeChunkId(req.params.chunk_id);
      const contentType = req.get("content-type") || "application/octet-stream";
      const buffer = parseObjectBody(req.body, contentType);
      if (buffer.length === 0) {
        throw new HttpError(400, "EMPTY_OBJECT", "Uploaded object body cannot be empty");
      }

      const storagePath = objectPathFor(storageRoot, chunkId);
      await fs.mkdir(path.dirname(storagePath), { recursive: true });
      await fs.writeFile(storagePath, buffer);

      const record = buildObjectRecord({
        buffer,
        chunkId,
        contentType,
        storagePath
      });
      const saved = await repository.upsert(record);

      await publisher.publishChunkStored(saved, req.context.requestId);

      success(
        req,
        res,
        {
          chunk_id: saved.chunk_id,
          size: saved.size,
          hash: saved.hash,
          content_type: saved.content_type,
          stored_at: saved.updated_at
        },
        201
      );
    })
  );

  app.get(
    "/objects/:chunk_id",
    asyncHandler(async (req, res) => {
      const chunkId = normalizeChunkId(req.params.chunk_id);
      const record = await repository.findByChunkId(chunkId);
      if (!record) {
        throw new HttpError(404, "OBJECT_NOT_FOUND", "Chunk object was not found", { chunk_id: chunkId });
      }

      const buffer = await fs.readFile(record.path);
      if (req.query.raw === "true") {
        res.setHeader("content-type", record.content_type || "application/octet-stream");
        res.setHeader("x-object-hash", record.hash);
        res.setHeader("x-object-size", String(record.size));
        res.status(200).send(buffer);
        return;
      }

      success(req, res, {
        chunk_id: record.chunk_id,
        size: record.size,
        hash: record.hash,
        content_type: record.content_type,
        content_base64: buffer.toString("base64")
      });
    })
  );

  app.use(notFound);
  app.use(errorHandler(logger));

  return app;
}

module.exports = { createStorageGatewayApp };
