// src/utils/asyncHandler.js
//
// PURPOSE: Wraps async controller functions to automatically forward errors
// to Express's next() error handling pipeline.
//
// THE PROBLEM IT SOLVES: Without this, every async controller needs:
//   try { ... } catch (err) { next(err) }
// That's 3 lines of boilerplate per controller. It also means forgetting
// a try/catch causes unhandled promise rejections that crash the server.
//
// HOW IT WORKS: Returns a new function that calls the original and
// catches any rejection, passing it to next() automatically.
//
// USAGE:
//   router.get('/workflows', asyncHandler(workflowController.getAll))
//
// HOW TO EXTEND: Add request timing, distributed tracing, or logging
// inside the wrapper without touching any controller.

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;