"use client";
import { useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/shared";
import { Policy } from "@/components/parent";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { Locale } from "@/domain/model";
export default function Page() {
  const [locale, setLocale] = useState<Locale>("en");
  return (
    <main className="policy-page" lang={locale}>
      <div className="section-heading">
        <Brand />
        <NativeSelect
          aria-label="Language / भाषा"
          value={locale}
          onChange={(e) => setLocale(e.target.value === "hi" ? "hi" : "en")}
        >
          <NativeSelectOption value="en">English</NativeSelectOption>
          <NativeSelectOption value="hi">हिन्दी</NativeSelectOption>
        </NativeSelect>
      </div>
      <h1>{locale === "hi" ? "फीस वापसी नीति" : "Fee refund policy"}</h1>
      <p>
        {locale === "hi"
          ? "डेमो नीति और मान्यताएँ"
          : "Published demo policy and assignment assumptions"}
      </p>
      <Policy locale={locale} />
      <Link className="text-link" href="/">
        {locale === "hi" ? "पोर्टल खोलें" : "Open your portal"}
      </Link>
    </main>
  );
}
