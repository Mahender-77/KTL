import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Toast from "@/components/common/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import type { ToastVariant } from "@/constants/feedback";

export type { ToastVariant } from "@/constants/feedback";

export type ShowToastOptions = {
  variant?: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export type ShowConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

type FeedbackContextValue = {
  showToast: (options: ShowToastOptions) => void;
  hideToast: () => void;
  showConfirm: (options: ShowConfirmOptions) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

type ToastState = ShowToastOptions & { id: number; visible: true };

type ConfirmState = ShowConfirmOptions & { id: number };

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const toastSeq = useRef(0);
  const pendingConfirm = useRef<ShowConfirmOptions | null>(null);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((options: ShowToastOptions) => {
    const id = ++toastSeq.current;
    setToast({
      id,
      visible: true,
      variant: options.variant ?? "info",
      title: options.title,
      message: options.message,
      duration: options.duration,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      secondaryLabel: options.secondaryLabel,
      onSecondary: options.onSecondary,
    });
  }, []);

  const showConfirm = useCallback((options: ShowConfirmOptions) => {
    pendingConfirm.current = options;
    setConfirm({ ...options, id: Date.now() });
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      hideToast,
      showConfirm,
    }),
    [showToast, hideToast, showConfirm]
  );

  const handleConfirmDismiss = useCallback(() => {
    pendingConfirm.current = null;
    setConfirm(null);
  }, []);

  const handleConfirmPrimary = useCallback(() => {
    const opts = pendingConfirm.current;
    pendingConfirm.current = null;
    setConfirm(null);
    if (!opts) return;
    void Promise.resolve(opts.onConfirm()).catch(() => {
      /* caller may showToast on failure */
    });
  }, []);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Toast
        visible={Boolean(toast)}
        variant={toast?.variant ?? "info"}
        title={toast?.title}
        message={toast?.message ?? ""}
        duration={toast?.duration}
        actionLabel={toast?.actionLabel}
        onAction={toast?.onAction}
        secondaryLabel={toast?.secondaryLabel}
        onSecondary={toast?.onSecondary}
        onDismiss={hideToast}
      />
      {confirm ? (
        <ConfirmDialog
          visible
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel ?? "OK"}
          cancelLabel={confirm.cancelLabel ?? "Cancel"}
          destructive={confirm.destructive}
          onCancel={handleConfirmDismiss}
          onConfirm={handleConfirmPrimary}
        />
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return ctx;
}
