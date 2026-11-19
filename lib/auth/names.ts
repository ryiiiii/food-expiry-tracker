// ログイン名と表示名（クライアントからも参照できるよう、Node 依存を持たせない）
export const LOGIN_NAMES = ["ryo", "madoka"] as const;
export type LoginName = (typeof LOGIN_NAMES)[number];

export function isLoginName(v: unknown): v is LoginName {
  return typeof v === "string" && (LOGIN_NAMES as readonly string[]).includes(v);
}

export const DISPLAY_NAME: Record<LoginName, string> = {
  ryo: "りょう",
  madoka: "まどか",
};

/** 注意文「間違った場合、◯◯に通知されます」の宛先（もう一人） */
export const PARTNER_NAME: Record<LoginName, string> = {
  ryo: DISPLAY_NAME.madoka,
  madoka: DISPLAY_NAME.ryo,
};
