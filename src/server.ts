import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error("PORT must be a valid integer between 1 and 65535");
}

const server = app.listen(port, () => {
  process.stdout.write(`reputation-engine listening on :${port}\n`);
});

const shutdown = (signal: string) => {
  process.stdout.write(`received ${signal}, shutting down gracefully...\n`);
  server.close((error) => {
    if (error) {
      process.stderr.write(`shutdown error: ${error.message}\n`);
      process.exit(1);
    }

    process.stdout.write("http server closed\n");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
