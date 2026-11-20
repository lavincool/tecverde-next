const RETRIES = 2;

function putOnce(
  url: string,
  headers: Record<string, string>,
  blob: Blob,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${request.status}`));
    });
    request.addEventListener("error", () => reject(new Error("Network error")));
    request.addEventListener("abort", () => reject(new Error("Aborted")));
    request.send(blob);
  });
}

/** Uploads to a presigned URL with progress, retrying transient failures twice. */
export async function uploadWithRetry(
  ticket: { url: string; headers: Record<string, string> },
  blob: Blob,
  onProgress: (fraction: number) => void,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- retries must run one after another.
      await putOnce(ticket.url, ticket.headers, blob, onProgress);
      return;
    } catch (error) {
      lastError = error;
      // oxlint-disable-next-line no-await-in-loop -- back off before the next attempt.
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}
