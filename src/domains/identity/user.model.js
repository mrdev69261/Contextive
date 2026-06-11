// src/domains/identity/user.model.js
//
// PURPOSE: Defines the User schema — the core identity record for every
// person in the system.
//
// SECURITY RULES ENFORCED AT THIS LAYER:
//   1. Password is excluded from all query results by default (select: false)
//   2. Password is hashed before every save where it was modified
//   3. passwordChangedAt is set automatically when password changes
//   4. toJSON transform strips internal fields before serialization
//
// WHAT THIS MODEL DOES NOT OWN:
//   - Workspace membership or roles (Workspace domain)
//   - Refresh tokens (refreshToken.model.js in this same domain)
//   - Audit history (Audit domain)

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 12;

// ─── Schema Definition ────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Core Identity ─────────────────────────────────────────────────────────

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [64, 'Name must be at most 64 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,     // Creates a unique index at the DB level — race-condition safe
      lowercase: true,  // Mongoose setter: normalizes to lowercase before saving
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address',
      ],
    },

    // ── Credentials ───────────────────────────────────────────────────────────

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [128, 'Password must be at most 128 characters'],
      // CRITICAL: Excluded from ALL query results by default.
      // To retrieve it, you must explicitly call .select('+password').
      // This prevents accidental exposure in any response.
      select: false,
    },

    // Automatically set when password is changed (see pre-save hook below).
    // Used to invalidate access tokens issued before a password change.
    // null = password has never been changed since account creation.
    passwordChangedAt: {
      type: Date,
      default: null,
      select: false, // Internal security field — never expose to clients
    },

    // ── Profile ───────────────────────────────────────────────────────────────

    avatar: {
      type: String,
      default: null,
      // Stores a URL string. No image upload infrastructure yet.
      // Field exists now to avoid a future schema migration.
    },

    // ── Account State ─────────────────────────────────────────────────────────

    isVerified: {
      type: Boolean,
      default: false,
      // Email verification flag. Defaulting to false is correct production behavior.
      // For MVP development: set to true in registration service until email
      // verification flow is implemented. Do not change the default here.
    },

    isActive: {
      type: Boolean,
      default: true,
      // Soft-disable mechanism. When false, authentication is rejected.
      // We NEVER hard-delete user records — they are referenced by decisions,
      // audit logs, and workspace memberships. Deletion corrupts history.
    },

    // ── Security Metadata ─────────────────────────────────────────────────────

    lastLoginAt: {
      type: Date,
      default: null,
      // Updated on every successful login.
      // Useful for: session UI, inactive account detection.
    },
  },

  {
    // Automatically manages createdAt and updatedAt fields.
    // Mongoose sets createdAt on insert and updatedAt on every save/update.
    timestamps: true,

    // Controls what the document looks like when converted to JSON
    // (e.g. when Express calls res.json()). Defined once here so
    // no controller or service needs to manually strip fields.
    toJSON: {
      transform(doc, ret) {
        // Remove Mongoose internal version key — meaningless to API consumers
        delete ret.__v;
        // Remove password hash — belt-and-suspenders alongside select: false
        delete ret.password;
        // Remove internal security metadata not needed by clients
        delete ret.passwordChangedAt;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email unique index is defined inline above via `unique: true`.
// Additional indexes are added here as query patterns emerge.
//
// FUTURE: If we add account suspension/filtering by isActive on login queries:
//   userSchema.index({ isActive: 1 });
//
// FUTURE: If we build admin tooling that queries by creation date:
//   userSchema.index({ createdAt: -1 });

// ─── Pre-Save Hook: Password Hashing ─────────────────────────────────────────
//
// Runs automatically before every .save() call.
// Hashing lives here — not in the service layer — so it is impossible
// to persist a plaintext password regardless of which code path saves the user.
//
// The isModified('password') check is critical:
//   Without it, every save (updating name, avatar, lastLoginAt, etc.) would
//   re-hash the already-hashed password, corrupting it permanently.

userSchema.pre('save', async function hashPasswordIfModified(next) {
  // 'this' refers to the document being saved
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, BCRYPT_COST_FACTOR);
    next();
  } catch (error) {
    next(error); // Forward hashing errors to Mongoose error handling
  }
});

// ─── Pre-Save Hook: Track Password Change Timestamp ──────────────────────────
//
// When a password is changed (not on initial creation), record the timestamp.
// This value is checked during token validation to invalidate access tokens
// that were issued before the password change — without a database lookup
// on every request.
//
// We subtract 1 second to handle the edge case where a token is issued in the
// same second the password is changed (clock precision).

userSchema.pre('save', function setPasswordChangedAt(next) {
  // Only run if password was modified AND this is not a new document
  if (!this.isModified('password') || this.isNew) return next();

  // Subtract 1 second to ensure tokens issued right at this moment
  // are still correctly flagged as pre-change
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// ─── Instance Method: Compare Password ───────────────────────────────────────
//
// Provides a clean interface for password comparison in the auth service.
// Called as: await user.comparePassword(submittedPassword)
//
// Lives on the model because it is intrinsically tied to how passwords
// are stored here. The service doesn't need to know bcrypt exists.
//
// NOTE: To use this method, the query must have selected the password field:
//   User.findOne({ email }).select('+password')

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Was Password Changed After Token Issued ─────────────────
//
// Used in auth middleware to check if a valid access token has been
// superseded by a password change.
//
// Called as: user.wasPasswordChangedAfter(tokenIssuedAt)
// Returns true if password was changed AFTER the token was issued → reject token.
//
// tokenIssuedAt is the JWT 'iat' claim value (Unix timestamp in seconds).

userSchema.methods.wasPasswordChangedAfter = function wasPasswordChangedAfter(tokenIssuedAt) {
  if (!this.passwordChangedAt) return false; // Password was never changed

  // Convert passwordChangedAt to Unix timestamp (seconds) for comparison
  const changedAtSeconds = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return tokenIssuedAt < changedAtSeconds;
};

// ─── Model Export ─────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);

export default User;
