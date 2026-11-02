import { CircleHelp, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A modal popup built on the native dialog element, which handles keeping focus
 * inside and closing on Esc. Leave out onConfirm to show a message with only Close.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Delete',
  pendingLabel = 'Deleting…',
  pending = false,
  confirmDisabled = false,
  tone = 'danger',
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  confirmDisabled?: boolean;
  tone?: 'danger' | 'brand';
  onConfirm?: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-text"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(event) => {
        // A click landing on the dialog itself, not its contents, is on the backdrop.
        if (event.target === dialog.current && !pending) onClose();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-black/50"
    >
      <div className="p-5 text-center">
        <span className={`mx-auto flex size-12 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-red-100 text-red-600' : 'bg-brand-soft text-brand'}`}>
          {tone === 'danger' ? <TriangleAlert className="size-6" /> : <CircleHelp className="size-6" />}
        </span>
        <h2 id="confirm-title" className="mt-3 break-words text-lg font-semibold">{title}</h2>
        <div id="confirm-text" className="mt-1 break-words text-sm text-neutral-600">{children}</div>
        <div className="mt-5 flex justify-center gap-2">
          {/* Focus starts on the safe choice, so pressing Enter by accident deletes nothing. */}
          <button type="button" autoFocus className="btn-outline min-w-24" disabled={pending} onClick={onClose}>
            {onConfirm ? 'Cancel' : 'Close'}
          </button>
          {onConfirm && (
            <button type="button" className={`btn min-w-24 text-white ${tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'}`} disabled={pending || confirmDisabled} onClick={onConfirm}>
              {pending ? pendingLabel : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
