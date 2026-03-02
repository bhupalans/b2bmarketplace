export function normalizeServerError(
  error: unknown,
  fallback: string
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (
    message.includes("Unable to detect a Project Id") ||
    message.includes("authentication and Google APIs")
  ) {
    return "Server update failed: Firebase Admin is not configured in this environment. Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service-account JSON file and restart dev server.";
  }

  return message || fallback;
}

