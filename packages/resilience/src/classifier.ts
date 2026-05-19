export enum FailureType {
  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
  UNKNOWN = 'UNKNOWN'
}

export class FailureClassifier {
  /**
   * Classifies an error to determine if it's worth replaying.
   */
  static classify(error: string): FailureType {
    const lowerError = error.toLowerCase();

    // Transient Errors (Network, Timeouts, Rate Limits)
    if (
      lowerError.includes('timeout') ||
      lowerError.includes('econnreset') ||
      lowerError.includes('econnrefused') ||
      lowerError.includes('rate limit') ||
      lowerError.includes('429') ||
      lowerError.includes('503') ||
      lowerError.includes('502') ||
      lowerError.includes('socket hang up')
    ) {
      return FailureType.TRANSIENT;
    }

    // Permanent Errors (Auth, Validation, Not Found)
    if (
      lowerError.includes('unauthorized') ||
      lowerError.includes('401') ||
      lowerError.includes('403') ||
      lowerError.includes('invalid') ||
      lowerError.includes('not found') ||
      lowerError.includes('404') ||
      lowerError.includes('syntax error')
    ) {
      return FailureType.PERMANENT;
    }

    return FailureType.UNKNOWN;
  }
}
