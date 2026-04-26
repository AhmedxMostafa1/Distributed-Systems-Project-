const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");

async function bootstrap() {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`[secrets-broker] listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("[secrets-broker] startup failed", error);
  process.exit(1);
});
