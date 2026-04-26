const { MongoClient } = require("mongodb");

const { createApp } = require("./app");
const { createChunkLocationRepository } = require("./repository");

const port = Number(process.env.PORT || 3002);
const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost:27018/chunk_location";

async function start() {
  const client = new MongoClient(databaseUrl);
  await client.connect();

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "") || "chunk_location";
  const collection = client.db(databaseName).collection("chunk_locations");
  const repository = createChunkLocationRepository(collection);
  await repository.init();

  const app = createApp({ repository });
  app.listen(port, () => {
    console.log(`chunk-location listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start chunk-location", error);
  process.exit(1);
});
