// Server-only structured logging for gallery uploads.
// Emits one JSON line per stage with a traceable upload reference.
// NEVER logs tokens, signed URLs, file contents or secrets.

export type UploadStage =
  | "UPLOAD_START"
  | "AUTH_CHECK"
  | "PERMISSION_CHECK"
  | "FILE_VALIDATION"
  | "UPLOAD_INITIALIZATION"
  | "STORAGE_REQUEST"
  | "STORAGE_RESPONSE"
  | "DATABASE_RECORD"
  | "PROCESSING_START"
  | "PROCESSING_COMPLETE"
  | "UPLOAD_COMPLETE"
  | "UPLOAD_FAILED";

export type UploadTrace = {
  ref: string;
  log: (stage: UploadStage, extra?: Record<string, unknown>) => void;
  fail: (stage: UploadStage, err: unknown, extra?: Record<string, unknown>) => Error;
};

function shortId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
}

function stamp() {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}

/** Sanitised message: no URLs, no tokens, capped length. */
function safeMessage(err: unknown): string {
  const raw =
    typeof err === "string" ? err : ((err as any)?.message ?? String(err ?? "unknown error"));
  return String(raw)
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]")
    .slice(0, 300);
}

export function startUploadTrace(base: Record<string, unknown> = {}): UploadTrace {
  const ref = `gallery-upload-${stamp()}-${shortId()}`;
  const log = (stage: UploadStage, extra: Record<string, unknown> = {}) => {
    console.log(
      JSON.stringify({
        scope: "gallery-upload",
        ref,
        stage,
        at: new Date().toISOString(),
        ...base,
        ...extra,
      }),
    );
  };
  const fail = (stage: UploadStage, err: unknown, extra: Record<string, unknown> = {}) => {
    console.error(
      JSON.stringify({
        scope: "gallery-upload",
        ref,
        stage: "UPLOAD_FAILED",
        failedStage: stage,
        at: new Date().toISOString(),
        errorType: (err as any)?.name ?? typeof err,
        errorCode: (err as any)?.code ?? (err as any)?.statusCode ?? null,
        httpStatus: (err as any)?.status ?? (err as any)?.statusCode ?? null,
        message: safeMessage(err),
        ...base,
        ...extra,
      }),
    );
    return new Error(`Could not start upload. Reference: ${ref}`);
  };
  log("UPLOAD_START", base);
  return { ref, log, fail };
}
