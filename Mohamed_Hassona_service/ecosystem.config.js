module.exports = {
  apps: [
    {
      name: "chunk-catalog",
      cwd: "./chunk-catalog",
      script: "npm",
      args: "start",
      env: {
        PORT: 3001
      }
    },
    {
      name: "chunk-location",
      cwd: "./chunk-location",
      script: "npm",
      args: "start",
      env: {
        PORT: 3002
      }
    }
  ]
};
