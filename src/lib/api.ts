import { ValidationError } from "./validation";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonError(error: unknown): Response {
  if (error instanceof ValidationError) {
    return json({ error: error.message }, error.status);
  }

  return json({ error: "Request failed." }, 500);
}

export async function readApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new ApiRequestError(
      typeof data?.error === "string" ? data.error : "Request failed.",
      response.status,
    );
  }

  return data as T;
}

export async function apiRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  return readApiResponse<T>(response);
}

export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
