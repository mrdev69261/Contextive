// src/config/database.js
//
// PURPOSE: Owns the MongoDB connection lifecycle.
//
// WHY ISOLATED: Connection logic, retry strategy, and event handling
// all live here. Nothing else needs to know how the DB connects —
// only that it is connected before the server accepts requests.
//
// HOW TO EXTEND: Add connection pooling options, replica set config,
// or a retry strategy inside connectDB without touching any other file.

import mongoose from 'mongoose';
import config from './env.js';

// ─── Connection Options ──────────────────────────────────────────────────────
// These are intentionally minimal — Mongoose 8+ handles most of this
// automatically. Add options here as your production needs evolve.

const MONGOOSE_OPTIONS = {
  // Mongoose will buffer commands if the connection drops and reconnect
  // automatically. Acceptable for this stage of the project.
};

// ─── Connect ─────────────────────────────────────────────────────────────────

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(config.MONGODB_URI, MONGOOSE_OPTIONS);

    console.log(`[Database] Connected: ${connection.connection.host}`);

    // Mongoose connection event listeners
    // These log issues without crashing the process on transient failures.
    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] Disconnected from MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] Reconnected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Database] Connection error:', err.message);
    });

  } catch (error) {
    // Fatal — if we can't connect on startup, the app should not run.
    console.error('[Database] Initial connection failed:', error.message);
    process.exit(1);
  }
};

// ─── Disconnect ───────────────────────────────────────────────────────────────
// Used during graceful shutdown and in test teardowns.

export const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('[Database] Connection closed');
};