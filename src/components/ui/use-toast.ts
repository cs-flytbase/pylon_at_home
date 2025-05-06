// Adapted from shadcn/ui (https://ui.shadcn.com/docs/components/toast)
import { useState, useEffect, useCallback } from "react";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

type Toast = {
  id: string;
  props: ToastProps;
};

type UseToast = {
  toasts: Toast[];
  toast: (props: ToastProps) => void;
  dismiss: (id: string) => void;
};

export function useToast(): UseToast {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = props.duration || 3000;

    setToasts((prev) => [...prev, { id, props }]);

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Expose the toast API
  return {
    toasts,
    toast,
    dismiss,
  };
}
