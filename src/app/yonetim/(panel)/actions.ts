"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/lib/auth";

// Çıkış: oturum kaydı veritabanından silinir, çerez temizlenir.
export async function logout() {
  await endSession();
  redirect("/yonetim/giris");
}
