const assert = require("assert");
const { buildReplicationTasks } = require("../src/plan-builder");

module.exports = {
  "upload.completed plans missing replicas": () => {
    const tasks = buildReplicationTasks({
      sourceTopic: "upload.completed",
      event: {
        event_type: "upload.completed",
        data: {
          chunks: [{ chunk_id: "chunk-a", replicas: ["storage-node-a"] }]
        }
      },
      policy: { default_factor: 3 },
      targetNodes: ["storage-node-a", "storage-node-b", "storage-node-c"]
    });

    assert.strictEqual(tasks.length, 2);
    assert.deepStrictEqual(
      tasks.map((task) => task.target_node_id),
      ["storage-node-b", "storage-node-c"]
    );
  },

  "node.heartbeat.missed excludes the failed node": () => {
    const tasks = buildReplicationTasks({
      sourceTopic: "node.heartbeat.missed",
      event: {
        data: {
          failed_node_id: "storage-node-a",
          affected_chunks: [{ chunk_id: "chunk-b", healthy_node_id: "storage-node-b" }]
        }
      },
      policy: { default_factor: 3 },
      targetNodes: ["storage-node-a", "storage-node-b", "storage-node-c"]
    });

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].target_node_id, "storage-node-c");
    assert.strictEqual(tasks[0].reason, "node_heartbeat_missed");
  },

  "integrity.failed creates a repair task": () => {
    const tasks = buildReplicationTasks({
      sourceTopic: "integrity.failed",
      event: {
        data: {
          chunk_id: "chunk-c",
          corrupt_node_id: "storage-node-a",
          healthy_node_id: "storage-node-b"
        }
      },
      policy: { default_factor: 3 },
      targetNodes: ["storage-node-a", "storage-node-b", "storage-node-c"]
    });

    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].source_node_id, "storage-node-b");
    assert.strictEqual(tasks[0].target_node_id, "storage-node-c");
  }
};
