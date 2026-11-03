import { type Snapshot, type Action } from "@/domain/model";

export type Controller = {
  data: Snapshot;
  busy: boolean;
  error: string;
  act: (action: Action) => Promise<unknown>;
  run: (task: () => Promise<void>, message?: string) => Promise<void>;
};

export type PayTarget = { studentId: string; instalmentId: string };
