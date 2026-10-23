// Fail closed when no backend is configured; never call a visitor's localhost.
function unavailable() {
  return Response.json(
    {
      code: "BACKEND_NOT_CONFIGURED",
      message:
        "This frontend is deployed, but its backend is not connected yet. Account and health-data features are unavailable.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = unavailable;
export const POST = unavailable;
export const PUT = unavailable;
export const PATCH = unavailable;
export const DELETE = unavailable;
