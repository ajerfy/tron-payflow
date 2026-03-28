import type { AppError } from "../types";

export function ErrorMessage({ error }: { error: AppError | null }) {
  if (!error) {
    return null;
  }

  return (
    <div className="panel error-panel">
      <strong>{error.title}</strong>
      <p>{error.message}</p>
      {error.suggestion ? <p className="muted">{error.suggestion}</p> : null}
    </div>
  );
}
