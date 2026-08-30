import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, () => {
    console.log(
        `API server running on port ${env.port} in ${env.nodeEnv} mode`,
    );
});

const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));