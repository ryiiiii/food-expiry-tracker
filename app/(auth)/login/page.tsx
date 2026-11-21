import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import Image from "next/image";
import LoginForm from "./LoginForm";

export const metadata = { title: "ログイン | ストックまどの家庭あれこれ" };

export default async function LoginPage() {
  // ログイン済みならトップへ
  if (await getSession()) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/icon.svg" alt="" width={96} height={96} unoptimized priority />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">ストックまどの家庭あれこれ</h1>
        </div>
      </div>
      <LoginForm />
    </main>
  );
}
