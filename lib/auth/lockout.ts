import { prisma } from "../prisma";
import type { LoginName } from "./names";

export const MAX_FAILURES = 5;
export const LOCK_WINDOW_MS = 15 * 60 * 1000;

export type LockState =
  | { locked: false; remaining: number }
  | { locked: true; minutes: number };

/** 直近15分の失敗が5回以上ならロック。解除までの残り分数も返す */
export async function getLockState(name: LoginName): Promise<LockState> {
  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  const fails = await prisma.loginAttempt.findMany({
    where: { name, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: MAX_FAILURES,
  });

  if (fails.length >= MAX_FAILURES) {
    // 5件のうち最も古い失敗が窓から外れた時点で、5回未満に戻る
    const unlockAt = fails[MAX_FAILURES - 1].createdAt.getTime() + LOCK_WINDOW_MS;
    return { locked: true, minutes: Math.max(1, Math.ceil((unlockAt - Date.now()) / 60000)) };
  }
  return { locked: false, remaining: MAX_FAILURES - fails.length };
}

export async function recordFailure(name: LoginName): Promise<void> {
  await prisma.loginAttempt.create({ data: { name } });
  // 窓より古い記録は不要なので掃除する
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - LOCK_WINDOW_MS) } },
  });
}

export async function clearFailures(name: LoginName): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { name } });
}
