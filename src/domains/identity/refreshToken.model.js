//
// PURPOSE: Stores one refresh-token session per device/client.
// Raw refresh tokens are NEVER stored here — only a secure hash.
//
// WHY A SEPARATE COLLECTION:
// - One user can have many active sessions
// - Sessions need independent expiration and revocation
// - Security audits and device management are easier
// - Token rotation becomes cleaner and more traceable

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const refreshTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    tokenId: {
     type: String,
     required: true,
     unique: true,
     index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // password: {
    //     type: String,
    //     required: true,
    //     select: false,
    // },

    userAgent: {
      type: String,
      default: null,
      trim: true,
    },

    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },

    expiresAt: {
        type: Date,
        required: true,
    },

    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// TTL index:
// MongoDB automatically deletes documents after expiresAt passes.
// expireAfterSeconds: 0 means "expire at the exact time in expiresAt"
// as processed by MongoDB's background TTL monitor.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Helpful compound index for session lookups per user.
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });

const RefreshToken = model('RefreshToken', refreshTokenSchema);

export default RefreshToken;