export const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...jsonHeaders, ...headers },
  });
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}
