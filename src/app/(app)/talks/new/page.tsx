import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateTalkForm } from "@/components/CreateTalkForm";
import { I18nProvider } from "@/components/I18nProvider";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getSessionUser } from "@/lib/auth/auth";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";

export default function NewTalkPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewTalkContent />
    </Suspense>
  );
}

async function NewTalkContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "attendee") {
    notFound();
  }

  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto w-full max-w-lg px-6 py-12">
        <h1 className="font-display text-ink mb-8 text-2xl">
          {t("createTalk.create")}
        </h1>
        <div className="card p-6">
          <CreateTalkForm />
        </div>
      </main>
    </I18nProvider>
  );
}
