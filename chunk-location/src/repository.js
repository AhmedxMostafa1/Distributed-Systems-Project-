const { randomUUID } = require("crypto");

const { AppError } = require("./errors");

function createChunkLocationRepository(collection) {
  return {
    async init() {
      await collection.createIndex({ chunk_id: 1, node_id: 1 }, { unique: true });
      await collection.createIndex({ chunk_id: 1 });
    },

    async ping() {
      await collection.db.admin().ping();
    },

    async createLocation({ chunkId, nodeId }) {
      const location = {
        id: randomUUID(),
        chunk_id: chunkId,
        node_id: nodeId,
        created_at: new Date().toISOString()
      };

      try {
        await collection.insertOne(location);
        return mapLocation(location);
      } catch (error) {
        if (error.code === 11000) {
          throw new AppError(
            409,
            "CHUNK_LOCATION_ALREADY_EXISTS",
            "A replica for this chunk and node already exists.",
            { chunk_id: chunkId, node_id: nodeId }
          );
        }

        throw error;
      }
    },

    async listReplicas(chunkId) {
      const documents = await collection.find({ chunk_id: chunkId }).sort({ created_at: 1 }).toArray();
      return documents.map(mapLocation);
    }
  };
}

function mapLocation(document) {
  return {
    id: document.id,
    chunk_id: document.chunk_id,
    node_id: document.node_id,
    created_at: document.created_at
  };
}

module.exports = {
  createChunkLocationRepository
};
