"use client";

import { useState } from "react";
import { z } from "zod";
import { ArrowUpRight, ShieldCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldDescription,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import type { Controller } from "@/components/types";
import { Brand, Notice } from "@/components/shared";
import { api } from "@/lib/client";

export function Login({
  busy,
  error,
  run,
  onSignedIn,
}: {
  busy: boolean;
  error: string;
  run: Controller["run"];
  onSignedIn: () => Promise<void>;
}) {
  const [role, setRole] = useState("accounts"),
    [staff, setStaff] = useState("central"),
    [password, setPassword] = useState("SetuDemo2026!"),
    [parent, setParent] = useState("PARENT-01"),
    [code, setCode] = useState("");
  const [otp, setOtp] = useState<{
    challenge: string;
    demoCode: string;
  } | null>(null);
  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand />
        <div className="login-story-copy">
          <h1>
            Less chasing.
            <br />
            More clarity.
          </h1>
          <p>
            One shared view of fees, payments, and progress. For your centre.
            For every family.
          </p>
          <div className="sample-statement">
            <div>
              <span>Ishita Sharma</span>
              <Badge variant="outline">Part paid</Badge>
            </div>
            <p>JEE 2027 Evening</p>
            <Separator />
            <dl>
              <div>
                <dt>Instalment</dt>
                <dd>₹30,000</dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>₹15,000</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>₹15,000</dd>
              </div>
            </dl>
            <small>Sample record from the assignment brief</small>
          </div>
        </div>
        <p className="login-footnote">
          Built for the coaching day, from the first reminder to the final
          receipt.
        </p>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <Badge variant="secondary">Interactive assignment demo</Badge>
          <h2>Welcome to Setu</h2>
          <p>Choose a role to explore your own private workspace.</p>
          {error && <Notice error message={error} />}
          <Tabs
            value={role}
            onValueChange={(v) => {
              setRole(String(v));
              setOtp(null);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="accounts">Accounts executive</TabsTrigger>
              <TabsTrigger value="parent">Parent / अभिभावक</TabsTrigger>
            </TabsList>
            <TabsContent value="accounts">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await api("/api/auth", { action: "demo" });
                    await api("/api/auth", {
                      action: "staff",
                      id: staff,
                      password,
                    });
                    await onSignedIn();
                  });
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="account">Demo account</FieldLabel>
                    <NativeSelect
                      id="account"
                      value={staff}
                      onChange={(e) => setStaff(e.target.value)}
                      className="w-full"
                    >
                      <NativeSelectOption value="central">
                        Central accounts · All four centres
                      </NativeSelectOption>
                      {["Central", "North", "East", "West"].map((s, i) => (
                        <NativeSelectOption key={s} value={`centre-${i + 1}`}>
                          {s} centre only
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <FieldDescription>
                      Demo password: SetuDemo2026!
                    </FieldDescription>
                  </Field>
                  <Button size="lg" type="submit" disabled={busy}>
                    {busy && (
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    )}
                    Open accounts workspace
                    <ArrowUpRight data-icon="inline-end" />
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
            <TabsContent value="parent">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    if (!otp) {
                      await api("/api/auth", { action: "demo" });
                      const result = z
                        .object({ challenge: z.string(), demoCode: z.string() })
                        .parse(
                          await api("/api/auth", {
                            action: "requestOtp",
                            id: parent,
                          }),
                        );
                      setOtp(result);
                    } else {
                      await api("/api/auth", {
                        action: "verifyOtp",
                        challenge: otp.challenge,
                        code,
                      });
                      await onSignedIn();
                    }
                  });
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="parent-id">
                      Parent demo ID / अभिभावक आईडी
                    </FieldLabel>
                    <Input
                      id="parent-id"
                      value={parent}
                      disabled={Boolean(otp)}
                      onChange={(e) => setParent(e.target.value.toUpperCase())}
                    />
                    <FieldDescription>
                      PARENT-01 for Ishita, PARENT-02 for Aarav, PARENT-03 for
                      Mohit.
                    </FieldDescription>
                  </Field>
                  {otp && (
                    <>
                      <Alert>
                        <AlertTitle>Demo inbox / डेमो ओटीपी</AlertTitle>
                        <AlertDescription>
                          <span className="otp-code">{otp.demoCode}</span>Valid
                          for five minutes. No SMS is sent.
                        </AlertDescription>
                      </Alert>
                      <Field>
                        <FieldLabel htmlFor="otp">
                          Six-digit code / छह अंकों का कोड
                        </FieldLabel>
                        <Input
                          id="otp"
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="one-time-code"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          required
                        />
                      </Field>
                    </>
                  )}
                  <Button size="lg" disabled={busy} type="submit">
                    {busy && (
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    )}
                    {otp
                      ? "Verify and sign in / साइन इन"
                      : "Get demo OTP / ओटीपी पाएँ"}
                  </Button>
                  {otp && (
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setOtp(null);
                        setCode("");
                      }}
                    >
                      Request a new code
                    </Button>
                  )}
                </FieldGroup>
              </form>
            </TabsContent>
          </Tabs>
          <div className="login-privacy">
            <ShieldCheck />
            <p>
              Fictional records. Mock payments. Real workflows.
              <br />
              Your changes stay inside your demo for 48 hours.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
