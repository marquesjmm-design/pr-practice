import { useSyncExternalStore } from "react";
import { Sheet } from "./Sheet";

// Confirmação dentro da app (substitui window.confirm, que alguns WebViews/iframes ignoram).
interface Request {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

let current: Request | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function confirmAction(opts: Omit<Request, "resolve">): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = {
      ...opts,
      resolve: (ok) => {
        current = null;
        emit();
        resolve(ok);
      },
    };
    emit();
  });
}

export function ConfirmHost() {
  const req = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
  if (!req) return null;
  return (
    <Sheet
      title={req.title}
      labelledBy="confirm-title"
      onClose={() => req.resolve(false)}
      footer={
        <>
          <button className="btn" onClick={() => req.resolve(false)}>Cancelar</button>
          <button className={req.danger ? "btn danger" : "btn primary"} onClick={() => req.resolve(true)}>{req.confirmLabel}</button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{req.message}</p>
    </Sheet>
  );
}
