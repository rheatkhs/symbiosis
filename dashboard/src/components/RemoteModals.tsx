import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Account } from "../lib/api";

interface RemoteModalsProps {
  isOpen: boolean;
  editingAccount: Account | null;
  onClose: () => void;
  onSubmit: (
    formData: {
      name: string;
      remoteName: string;
      provider: string;
      storageLimit: string;
    },
    mode: "oauth" | "manual"
  ) => void;
  isPending: boolean;
  errorMsg: string;
}

export function RemoteModals({
  isOpen,
  editingAccount,
  onClose,
  onSubmit,
  isPending,
  errorMsg,
}: RemoteModalsProps) {
  const [formData, setFormData] = useState({
    name: "",
    remoteName: "",
    provider: "google drive",
    storageLimit: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (editingAccount) {
        setFormData({
          name: editingAccount.name,
          remoteName: editingAccount.remoteName,
          provider: editingAccount.provider,
          storageLimit: editingAccount.storageLimit
            ? (editingAccount.storageLimit / (1024 * 1024 * 1024)).toString()
            : "",
        });
      } else {
        setFormData({
          name: "",
          remoteName: "",
          provider: "google drive",
          storageLimit: "",
        });
      }
    }
  }, [isOpen, editingAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Always submit in oauth mode
    onSubmit(formData, "oauth");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.96, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-colors duration-300"
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-solid border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/1">
              <div className="flex items-center">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase m-0">
                  {editingAccount ? "Modify Remote" : "Link Google Drive"}
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={isPending}
                className="w-7 h-7 rounded-lg bg-transparent hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white border-none flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="i-ri-close-line text-lg"></span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5.5 m-0">
              {errorMsg && (
                <div className="bg-red-500/10 border border-solid border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
                  <span className="i-ri-error-warning-fill text-red-500 text-sm flex-shrink-0 mt-0.5 animate-pulse"></span>
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              {/* Form Input fields */}
              <div className="space-y-4.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    placeholder="e.g. Google Drive (Work)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field py-2.5 text-xs bg-slate-50 dark:bg-brand-dark/40"
                  />
                  <p className="text-[9.5px] text-slate-400 dark:text-gray-500 m-0 mt-1 leading-normal">
                    Friendly label to identify this remote cloud pool.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                    Rclone Mount Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingAccount || isPending}
                    placeholder="e.g. gdrive_pool"
                    value={formData.remoteName}
                    onChange={(e) => setFormData({ ...formData, remoteName: e.target.value })}
                    className="input-field py-2.5 text-xs bg-slate-50 dark:bg-brand-dark/40 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  />
                  {!editingAccount && (
                    <p className="text-[9.5px] text-slate-400 dark:text-gray-500 m-0 mt-1 leading-normal">
                      The alphanumeric identifier inside Rclone. Cannot contain spaces or symbols.
                    </p>
                  )}
                </div>
              </div>

              {/* Information Notice */}
              {!editingAccount && (
                <div className="bg-brand-accent/5 border border-solid border-brand-accent/15 rounded-xl p-4 flex gap-3 items-start">
                  <span className="i-ri-google-fill text-brand-accent text-xl flex-shrink-0 mt-0.5"></span>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                      Google OAuth Authorization
                    </span>
                    <p className="text-[10px] leading-relaxed text-slate-500 dark:text-gray-400 m-0">
                      Symbiosis will redirect to Google's sign-in screen to authorize read/write access. Tokens are saved securely on your host.
                    </p>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-solid border-slate-100 dark:border-white/5 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="btn-secondary py-2 text-xs border border-solid border-slate-200 dark:border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary py-2 text-xs flex items-center justify-center gap-2 font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <span className="i-ri-loader-4-line animate-spin text-sm"></span>
                      Linking Account...
                    </>
                  ) : editingAccount ? (
                    <>
                      <span className="i-ri-save-2-fill text-sm"></span>
                      Apply Edits
                    </>
                  ) : (
                    <>
                      <span className="i-ri-external-link-line text-sm"></span>
                      Sign in with Google
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
