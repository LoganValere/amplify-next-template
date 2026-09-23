export const handler = async () => {
  const base = process.env.APP_BASE_URL;
  const secret = process.env.APP_CRON_SECRET;
  if (!base || !secret) {
    throw new Error("APP_BASE_URL and APP_CRON_SECRET are required");
  }
  const response = await fetch(`${base}/api/internal/cron`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cron-secret": secret },
    body: JSON.stringify({ job: "monday" }),
  });
  if (!response.ok) {
    throw new Error(`Monday sync failed: ${response.status}`);
  }
  return response.json();
};
