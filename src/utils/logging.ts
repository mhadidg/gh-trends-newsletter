export class TaggedError extends Error {
  constructor(
    public tag: string,
    public message: string
  ) {
    super(message);
    this.name = 'CustomError';
  }
}

export class HttpError extends TaggedError {
  constructor(
    public tag: string,
    public message: string,
    public response: Response
  ) {
    super(tag, message);
    this.name = 'HttpError';
  }
}

export function logInfo(tag: string, message: string) {
  console.info(`[INFO] ${tag}: ${message}`);
}

export function logWarn(tag: string, message: string) {
  console.warn(`[WARN] ${tag}: ${message}`);
}

export function logError(tag: string, err: TaggedError) {
  console.error(`[Error] ${tag}: ${err.message}`);
}

export async function logHttpError(tag: string, err: HttpError) {
  console.error(`[ERROR] ${tag}: ${err.message} (code: ${err.response.status})`);
  console.error(`  → URL: ${err.response.url}`);
  console.error(`  → Response: ${await err.response.text()}`);
}
