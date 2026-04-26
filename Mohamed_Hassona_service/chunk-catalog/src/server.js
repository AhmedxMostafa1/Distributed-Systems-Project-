const { MongoClient } = require("mongodb");

const { createApp } = require("./app");
const { createChunkRepository } = require("./repository");

const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/chunk_catalog";

async function start() {
  const client = new MongoClient(databaseUrl);
  await client.connect();

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "") || "chunk_catalog";
  const collection = client.db(databaseName).collection("chunks");
  const repository = createChunkRepository(collection);
  await repository.init();

  const app = createApp({ repository });
  app.listen(port, () => {
    console.log(`chunk-catalog listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start chunk-catalog", error);
  process.exit(1);
});
