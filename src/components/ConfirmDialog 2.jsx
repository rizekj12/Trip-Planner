import React from 'react';
import Modal from "./Modal";

export default function ConfirmDialog({ open, onClose, title = "Confirm", message, confirmText = "Delete", onConfirm }) {
    return (
        <Modal open={open} onClose={onClose} theme={{ header: "bg-rose-600 text-white" }}>
            <div className="grid gap-3">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm opacity-80">{message}</p>
                <div className="mt-1 flex items-center justify-end gap-2">
                    <button onClick={onClose} className="rounded-md bg-zinc-600 px-3 py-2 text-white hover:bg-zinc-700">Cancel</button>
                    <button onClick={onConfirm} className="rounded-md bg-rose-600 px-3 py-2 text-white hover:bg-rose-700">{confirmText}</button>
                </div>
            </div>
        </Modal>
    );
}
