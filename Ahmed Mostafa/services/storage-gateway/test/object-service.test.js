const assert = require("assert");
const {
  buildObjectRecord,
  hashBuffer,
  normalizeChunkId,
  parseObjectBody
} = require("../src/object-service");

module.exports = {
  "normalizeChunkId accepts safe ids": () => {
    assert.strictEqual(normalizeChunkId("chunk_01-A.bin"), "chunk_01-A.bin");
  },

  "normalizeChunkId rejects traversal values": () => {
    assert.throws(() => normalizeChunkId("../secret"), /chunk_id/);
  },

  "parseObjectBody supports JSON base64 uploads": () => {
    const body = Buffer.from(JSON.stringify({ content_base64: Buffer.from("hello").toString("base64") }));
    assert.strictEqual(parseObjectBody(body, "application/json").toString("utf8"), "hello");
  },

  "buildObjectRecord calculates deterministic sha256": () => {
    const buffer = Buffer.from("chunk payload");
    const record = buildObjectRecord({
      buffer,
      chunkId: "chunk-99",
      contentType: "text/plain",
      storagePath: "/tmp/chunk-99.bin"
    });

    assert.strictEqual(record.hash, hashBuffer(buffer));
    assert.strictEqual(record.size, buffer.length);
    assert.strictEqual(record.chunk_id, "chunk-99");
  }
};
