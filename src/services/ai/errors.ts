/** Raised when an AI engine cannot service a request (no key, offline, bad response). */
export class AIUnavailableError extends Error {
  constructor(message = 'AI engine is unavailable') {
    super(message);
    this.name = 'AIUnavailableError';
  }
}

/** Raised when an AI request exceeds its time budget. */
export class AITimeoutError extends Error {
  constructor(message = 'AI request timed out') {
    super(message);
    this.name = 'AITimeoutError';
  }
}
