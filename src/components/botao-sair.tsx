"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function BotaoSair() {
  const router = useRouter();
  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={sair}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}
