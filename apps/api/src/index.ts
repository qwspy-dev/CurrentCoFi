import { readEnvironment } from "./env.js";
import { buildServer } from "./server.js";

const environment = readEnvironment();
const server = buildServer();

try {
  await server.listen({
    host: environment.API_HOST,
    port: environment.API_PORT,
  });
} catch (error) {
  server.log.error(error);
  process.exitCode = 1;
}
