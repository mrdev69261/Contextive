// server.js
//
// PURPOSE: Process entry point. Owns the startup sequence and shutdown logic.
//
// SEPARATION FROM app.js:
//   app.js   = what the application IS  (Express configuration)
//   server.js = how it RUNS             (port binding, DB connection, shutdown)
//
// This separation means app.js can be imported in tests without starting
// a real server or database connection. Clean testability from day one.
//
// GRACEFUL SHUTDOWN: When the process receives SIGTERM (from a container
// orchestrator like Kubernetes) or SIGINT (Ctrl+C in terminal), we:
//   1. Stop accepting new connections
//   2. Wait for in-flight requests to complete
//   3. Close the database connection cleanly
// This prevents data corruption and dropped requests during deployments.

import app from './src/app.js';
import config from './src/config/env.js';
import { connectDB, disconnectDB } from './src/config/database.js';

// ─── Startup ──────────────────────────────────────────────────────────────────

const start = async () => {
  // 1. Connect to MongoDB before accepting any requests.
  //    connectDB exits the process if connection fails — no server starts.
  await connectDB();

  // 2. Start the HTTP server.
  const server = app.listen(config.PORT, () => {
    console.log(`[Server] ReasonLoop API running on port ${config.PORT} [${config.NODE_ENV}]`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────

  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully`);

    // Stop accepting new connections
    server.close(async () => {
      console.log('[Server] HTTP server closed');

      // Close database connection cleanly
      await disconnectDB();

      console.log('[Server] Shutdown complete');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long (10 seconds)
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  // ─── Unhandled Rejection Catch ────────────────────────────────────────────
  // Any unhandled promise rejection reaches here.
  // We log it and exit — a running server in an unknown state is dangerous.

  process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled rejection:', reason);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    console.error('[Process] Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  // Register shutdown signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

start();