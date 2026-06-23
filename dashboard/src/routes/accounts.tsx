import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Account } from "../lib/api";
import { RemoteCard } from "../components/RemoteCard";
import { RemoteModals } from "../components/RemoteModals";
import { FileExplorer } from "../components/FileExplorer";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const queryClient = useQueryClient();

  // Dialog and Explorer modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerAccountId, setExplorerAccountId] = useState<string>("");

  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: accountsList, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
  });

  const oauthMutation = useMutation({
    mutationFn: api.oauthGdrive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeModal();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to connect Google account. Verify browser authentication.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) =>
      api.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeModal();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update account.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const openCreateModal = () => {
    setEditingAccount(null);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleModalSubmit = (
    formData: {
      name: string;
      remoteName: string;
      provider: string;
      storageLimit: string;
    },
    registrationMode: "oauth" | "manual"
  ) => {
    setErrorMsg("");

    if (editingAccount) {
      updateMutation.mutate({
        id: editingAccount.id,
        data: {
          name: formData.name,
        },
      });
    } else {
      oauthMutation.mutate({
        name: formData.name,
        remoteName: formData.remoteName,
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the account "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      await api.getRemoteAbout(accountId);
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    } catch (err) {
      console.error("Failed to sync storage details:", err);
    } finally {
      setSyncingAccountId(null);
    }
  };

  const openExplorer = (account: Account) => {
    setExplorerAccountId(account.id);
    setIsExplorerOpen(true);
  };

  const closeExplorer = () => {
    setIsExplorerOpen(false);
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
  };

  const isPending = oauthMutation.isPending || updateMutation.isPending;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-6 relative"
      >
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-solid border-slate-200 dark:border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white m-0">Cloud Remotes</h2>
            <p className="text-xs text-slate-500 dark:text-gray-500 m-0 mt-1">
              Register and manage the Rclone remote storage pools used by the Symbiosis stream proxy.
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary">
            <span className="i-ri-add-line"></span>
            Register Remote
          </button>
        </div>

        {/* Remotes List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-44 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse border border-solid border-slate-200 dark:border-white/5"></div>
            <div className="h-44 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse border border-solid border-slate-200 dark:border-white/5"></div>
            <div className="h-44 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse border border-solid border-slate-200 dark:border-white/5"></div>
          </div>
        ) : !accountsList || accountsList.length === 0 ? (
          <div className="bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/5 rounded-xl p-8 shadow-sm dark:shadow-none py-16 text-center transition-colors duration-300">
            <span className="i-ri-folder-open-line text-4xl text-slate-400 dark:text-gray-600 block mx-auto mb-4"></span>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white m-0">No remotes registered</h3>
            <p className="text-xs text-slate-500 dark:text-gray-500 max-w-sm mx-auto mt-2 leading-relaxed">
              Configure Google Drive or other storage integrations to enable real-time streaming pipelines.
            </p>
            <button onClick={openCreateModal} className="btn-primary mt-6 mx-auto">
              <span className="i-ri-add-line"></span>
              Add First Remote
            </button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {accountsList.map((account) => (
                <motion.div
                  key={account.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <RemoteCard
                    account={account}
                    onBrowse={openExplorer}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onSync={handleSync}
                    isSyncing={syncingAccountId === account.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* Account Settings Edit/Create Modal Dialog */}
      <RemoteModals
        isOpen={isModalOpen}
        editingAccount={editingAccount}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isPending={isPending}
        errorMsg={errorMsg}
      />

      {/* Reusable File Explorer Modal */}
      <AnimatePresence>
        {isExplorerOpen && accountsList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-4xl relative"
            >
              {/* Close floating button */}
              <button
                onClick={closeExplorer}
                className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-all shadow-md z-10"
              >
                <span className="i-ri-close-line text-lg"></span>
              </button>

              <FileExplorer accounts={accountsList} initialAccountId={explorerAccountId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
