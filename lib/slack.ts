export async function sendSlackNotification(foods: {
  name: string;
  expiryType: string;
  expiryDate: Date;
}[]): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL is not set. Skipping Slack notification.");
    return;
  }

  const foodList = foods
    .map((food) => {
      const dateStr = new Date(food.expiryDate).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return `• *${food.name}* — ${food.expiryType}：${dateStr}`;
    })
    .join("\n");

  const message = {
    text: `:warning: *食品期限のお知らせ* :warning:\n\n明日が期限の食品があります。お早めにご確認ください。\n\n${foodList}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "⚠️ 食品期限のお知らせ",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "明日が期限の食品があります。お早めにご確認ください。",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: foodList,
        },
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to send Slack notification: ${response.status} ${response.statusText}`
    );
  }
}
