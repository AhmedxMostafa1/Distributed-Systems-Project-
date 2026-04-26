const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");
const { connectKafka } = require("./config/kafka");

async function bootstrap() {
  await connectDatabase();
  await connectKafka();

  app.listen(env.port, () => {
    console.log(`[chaos-simulator] listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("[chaos-simulator] startup failed", error);
  process.exit(1);
});
