import { useEffect, useRef } from "react";
import { useI18n } from "./I18nContext";

interface ConfirmDialogProps {
  /** Called when the player confirms the destructive action. */
  onConfirm: () => void;
  /** Called when the player cancels (button, Escape, or backdrop click). */
  onCancel: () => void;
}

/**
 * In-game quit confirmation styled like the rest of the 16-bit UI, replacing
 * the native window.confirm popup. Renders as a modal alert dialog: focus
 * moves to "Keep playing" on open, Tab cycles between the two actions,
 * Escape and backdrop clicks cancel, and focus returns to the control that
 * opened the dialog on close.
 */
export function ConfirmDialog({ onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);

  // Keep the latest cancel handler without re-running the effect (a parent
  // re-render must not yank focus while the dialog is open).
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    stayRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      // Trap focus inside the dialog (its buttons are the only focusables).
      const buttons = dialogRef.current?.querySelectorAll("button");
      if (!buttons || buttons.length === 0) return;
      const first = buttons[0]!;
      const last = buttons[buttons.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="window modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="quit-dialog-title"
        aria-describedby="quit-dialog-body"
      >
        <h2 className="window-title" id="quit-dialog-title">
          {t("quit")}
        </h2>
        <p className="modal-body" id="quit-dialog-body">
          {t("confirmQuit")}
        </p>
        <div className="modal-actions">
          <button ref={stayRef} className="button button-primary" type="button" onClick={onCancel}>
            {t("quitCancel")}
          </button>
          <button className="button button-danger" type="button" onClick={onConfirm}>
            {t("quitConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
