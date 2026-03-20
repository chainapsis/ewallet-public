export async function sendSlackAlert(
  message: string,
  webhookUrl: string | null,
): Promise<boolean> {
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL is not set. Skipping Slack alert.");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      console.error(
        `Failed to send Slack alert: ${response.status} ${response.statusText}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending Slack alert:", error);
    return false;
  }
}
