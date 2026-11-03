"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import useSWR from "swr";
import { z } from "zod";
import {
  LayoutDashboard,
  Users,
  Inbox,
  Upload,
  LogOut,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { snapshotSchema, type Snapshot, type Action } from "@/domain/model";
import { copy } from "@/lib/i18n";
import type { PayTarget, Controller } from "@/components/types";
import { api } from "@/lib/client";
import { Login } from "@/components/login";
import { Brand, Notice } from "@/components/shared";
import { Consent, ParentPortal, Checkout, Policy } from "@/components/parent";
import {
  StudentLedger,
  Operations,
  BatchUploads,
  AccountsOverview,
} from "@/components/accounts";

async function fetchSnapshot(): Promise<Snapshot | null> {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (response.status === 401) return null;
  const value: unknown = await response.json();
  if (!response.ok) {
    const e = z.object({ error: z.string() }).safeParse(value);
    throw new Error(e.success ? e.data.error : "Could not load the workspace.");
  }
  return snapshotSchema.parse(value);
}
function subscribeLocation(changed: () => void) {
  window.addEventListener("popstate", changed);
  return () => window.removeEventListener("popstate", changed);
}
export default function Workspace() {
  const {
    data,
    error: loadError,
    isLoading: loading,
    mutate,
  } = useSWR<Snapshot | null, Error>("/api/state", fetchSnapshot, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [screen, setScreen] = useState("overview"),
    [studentId, setStudentId] = useState(""),
    [manualPay, setPay] = useState<PayTarget | null>(null),
    [policy, setPolicy] = useState(false);
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
  const search = useSyncExternalStore(
    subscribeLocation,
    () => window.location.search,
    () => "",
  );
  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);
  useEffect(() => {
    document.documentElement.lang = data?.actor.locale ?? "en";
  }, [data]);
  const run = async (task: () => Promise<void>, success?: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      if (success) setNotice(success);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The action failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const act = async (action: Action) => {
    const result = await api("/api/action", action);
    await refresh();
    const message = z.object({ message: z.string() }).safeParse(result);
    if (message.success) setNotice(message.data.message);
    return result;
  };
  if (loading)
    return (
      <main className="loading-layout" aria-label="Loading workspace">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </main>
    );
  if (!data)
    return (
      <Login
        busy={busy}
        error={error || loadError?.message || ""}
        run={run}
        onSignedIn={refresh}
      />
    );
  const q = new URLSearchParams(search),
    linkedStudent = q.get("student"),
    linkedInstalment = q.get("instalment");
  const pay =
    manualPay ??
    (search !== dismissedQuery &&
    linkedStudent &&
    linkedInstalment &&
    data.students.some((s) => s.id === linkedStudent)
      ? { studentId: linkedStudent, instalmentId: linkedInstalment }
      : null);
  const openPay = (target: PayTarget) => {
    setError("");
    setPay(target);
  };
  const c: Controller = { data, busy, error, act, run },
    locale = data.actor.locale,
    t = copy[locale];
  const selected = data.students.find((s) => s.id === studentId);
  const nav = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "students", label: "Students & fees", icon: Users },
    { id: "operations", label: "Operations", icon: Inbox },
    { id: "imports", label: "Batch uploads", icon: Upload },
  ];
  const logOut = () =>
    run(async () => {
      await api("/api/auth", { action: "logout" });
      setStudentId("");
      await refresh();
    });
  return (
    <div
      className={data.actor.role === "parent" ? "portal-layout" : "app-layout"}
      lang={locale}
    >
      {data.actor.role === "accounts" && (
        <aside className="sidebar">
          <Brand />
          <div className="sidebar-description">Accounts workspace</div>
          <nav aria-label="Main navigation">
            {nav.map((n) => (
              <Button
                key={n.id}
                variant={screen === n.id && !selected ? "secondary" : "ghost"}
                onClick={() => {
                  setScreen(n.id);
                  setStudentId("");
                }}
              >
                <n.icon data-icon="inline-start" />
                {n.label}
              </Button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <ShieldCheck />
            <p>
              Your private demo
              <br />
              <span>80 fictional student records</span>
            </p>
            <Button variant="ghost" onClick={() => setPolicy(true)}>
              <CircleHelp data-icon="inline-start" />
              Refund policy
            </Button>
          </div>
        </aside>
      )}
      <div className="app-body">
        <header className="topbar">
          {data.actor.role === "parent" ? (
            <Brand />
          ) : (
            <div className="topbar-context">
              Company A, Jaipur <span> / </span>{" "}
              {data.actor.centres.length === 4
                ? "All centres"
                : data.actor.centres.join(", ")}
            </div>
          )}
          <div className="topbar-actions">
            {data.actor.role === "parent" && (
              <NativeSelect
                aria-label={t.language}
                value={locale}
                onChange={(e) =>
                  run(async () => {
                    await act({
                      action: "language",
                      locale: e.target.value === "hi" ? "hi" : "en",
                    });
                  })
                }
              >
                <NativeSelectOption value="en">English</NativeSelectOption>
                <NativeSelectOption value="hi">हिन्दी</NativeSelectOption>
              </NativeSelect>
            )}
            <span className="user-name">
              {data.actor.role === "accounts" ? data.actor.name : t.portal}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={logOut}
              aria-label={t.logout}
              disabled={busy}
            >
              <LogOut />
            </Button>
          </div>
        </header>
        {data.actor.role === "accounts" && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {nav.map((n) => (
              <Button
                key={n.id}
                size="sm"
                variant={screen === n.id ? "secondary" : "ghost"}
                onClick={() => {
                  setScreen(n.id);
                  setStudentId("");
                }}
              >
                {n.label}
              </Button>
            ))}
          </nav>
        )}
        <main className="main-content">
          {(error || notice) && (
            <div className="feedback" aria-live="polite">
              <Notice message={error || notice} error={Boolean(error)} />
            </div>
          )}
          {data.actor.role === "parent" ? (
            !data.actor.consent ? (
              <Consent c={c} />
            ) : (
              <ParentPortal
                c={c}
                onPay={openPay}
                onPolicy={() => setPolicy(true)}
              />
            )
          ) : selected ? (
            <StudentLedger
              c={c}
              student={selected}
              onBack={() => setStudentId("")}
              onPay={openPay}
            />
          ) : screen === "operations" ? (
            <Operations c={c} onStudent={setStudentId} />
          ) : screen === "imports" ? (
            <BatchUploads c={c} />
          ) : (
            <AccountsOverview
              c={c}
              listOnly={screen === "students"}
              onStudent={setStudentId}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>{t.demo}</span>
          <button onClick={() => setPolicy(true)}>{t.policy}</button>
        </footer>
      </div>
      {pay && (
        <Checkout
          c={c}
          target={pay}
          onClose={() => {
            setPay(null);
            setDismissedQuery(search);
          }}
        />
      )}
      <Dialog open={policy} onOpenChange={setPolicy}>
        <DialogContent className="policy-dialog">
          <DialogHeader>
            <DialogTitle>{t.policy}</DialogTitle>
            <DialogDescription>
              {locale === "hi"
                ? "डेमो नीति · वास्तविक ग्राहक की नीति नहीं"
                : "Published demo policy · Assignment assumptions"}
            </DialogDescription>
          </DialogHeader>
          <Policy locale={locale} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
