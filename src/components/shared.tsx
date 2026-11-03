"use client";

import { BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

export const Brand = () => (
  <Link className="brand" href="/">
    <span className="brand-mark">
      <BookOpen aria-hidden="true" />
    </span>
    <span>
      Setu<span className="brand-sub">Coaching fees</span>
    </span>
  </Link>
);

export function Nothing({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return (
    <Alert variant={error ? "destructive" : "default"}>
      <AlertTitle>{error ? "Action needed" : "Update"}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
