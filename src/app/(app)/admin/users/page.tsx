import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { PageSkeleton } from "@/components/PageSkeleton";
import { UserManager } from "@/components/UserManager";
import { loadAdminUsers } from "@/lib/auth/admin-users";
import { getSessionUser } from "@/lib/auth/auth";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminUsersContent />
    </Suspense>
  );
}

async function AdminUsersContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "admin") {
    notFound();
  }

  const users = await loadAdminUsers();
  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-ink text-2xl">{t("admin.title")}</h1>
          <p className="text-muted mt-1 text-sm font-semibold">
            {t("admin.subtitle")}
          </p>
        </div>
        <div className="card p-6">
          <UserManager users={users} currentUserId={user.id} />
        </div>
      </main>
    </I18nProvider>
  );
}
