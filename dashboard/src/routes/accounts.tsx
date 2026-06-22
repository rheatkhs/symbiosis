import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Account } from "../lib/api";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
});

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function AccountsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    remoteName: "",
    provider: "google drive",
    storageLimit: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  const { data: accountsList, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
  });

  const createMutation = useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeModal();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create account.");
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
    setFormData({
      name: "",
      remoteName: "",
      provider: "google drive",
      storageLimit: "",
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      remoteName: account.remoteName,
      provider: account.provider,
      storageLimit: account.storageLimit ? (account.storageLimit / (1024 * 1024 * 1024)).toString() : "",
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const limitInBytes = formData.storageLimit
      ? parseFloat(formData.storageLimit) * 1024 * 1024 * 1024
      : null;

    if (editingAccount) {
      updateMutation.mutate({
        id: editingAccount.id,
        data: {
          name: formData.name,
          provider: formData.provider,
          storageLimit: limitInBytes,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        remoteName: formData.remoteName,
        provider: formData.provider,
        storageLimit: limitInBytes,
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the account "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white m-0">Remote Storage Accounts</h2>
          <p className="text-xs text-gray-500 m-0 mt-1">Configure and manage backend Google Drive pools for Symbiosis.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <span className="i-lucide-plus"></span>
          Register Remote
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-44 bg-white/5 rounded-xl animate-pulse border border-solid border-white/5"></div>
          <div className="h-44 bg-white/5 rounded-xl animate-pulse border border-solid border-white/5"></div>
          <div className="h-44 bg-white/5 rounded-xl animate-pulse border border-solid border-white/5"></div>
        </div>
      ) : !accountsList || accountsList.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <span className="i-lucide-folder-open text-4xl text-gray-600 block mx-auto mb-4"></span>
          <h3 className="text-sm font-semibold text-white m-0">No remotes registered</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-2 leading-relaxed">
            Configure Google Drive or other storage integrations to enable real-time streaming pipelines.
          </p>
          <button onClick={openCreateModal} className="btn-primary mt-6 mx-auto">
            <span className="i-lucide-plus"></span>
            Add First Remote
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accountsList.map((account) => {
            const usagePercentage = account.storageLimit
              ? Math.min(100, Math.round((account.storageUsed / account.storageLimit) * 100))
              : 0;

            return (
              <div key={account.id} className="glass-card hover:border-violet-500/20 transition-all duration-300 flex flex-col justify-between h-44 relative">
                <div>
                  {/* Account Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white m-0 leading-tight">{account.name}</h4>
                      <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mt-1 block">
                        {account.provider}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(account)}
                        className="w-7 h-7 bg-white/5 hover:bg-white/10 rounded border border-solid border-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                        title="Edit Account"
                      >
                        <span className="i-lucide-edit-3 text-[13px]"></span>
                      </button>
                      <button
                        onClick={() => handleDelete(account.id, account.name)}
                        className="w-7 h-7 bg-red-950/20 hover:bg-red-900 border border-solid border-red-500/20 text-red-400 hover:text-white rounded transition-all flex items-center justify-center cursor-pointer"
                        title="Delete Account"
                      >
                        <span className="i-lucide-trash-2 text-[13px]"></span>
                      </button>
                    </div>
                  </div>

                  {/* Remote Mapping Info */}
                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-500">Rclone Target:</span>
                    <span className="text-[11px] font-mono bg-white/5 px-2 py-0.5 rounded border border-solid border-white/5 text-gray-300">
                      {account.remoteName}:
                    </span>
                  </div>
                </div>

                {/* Progress / Storage Stats */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                    <span>Used: {formatBytes(account.storageUsed)}</span>
                    <span>
                      {account.storageLimit ? `${usagePercentage}% of ${formatBytes(account.storageLimit)}` : "Unlimited"}
                    </span>
                  </div>
                  {account.storageLimit && (
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-solid border-white/5">
                      <div
                        className="h-full bg-violet-600 rounded-full transition-all duration-500"
                        style={{ width: `${usagePercentage}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-brand-card border border-solid border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-solid border-white/5 flex justify-between items-center bg-white/1">
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase m-0">
                {editingAccount ? "Edit Account" : "Register Remote Storage"}
              </h3>
              <button
                onClick={closeModal}
                className="w-6 h-6 rounded bg-transparent hover:bg-white/5 text-gray-400 hover:text-white border-none flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="i-lucide-x"></span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 m-0">
              {errorMsg && (
                <div className="bg-red-500/10 border border-solid border-red-500/20 text-red-400 text-xs rounded-lg p-3 flex items-start gap-2">
                  <span className="i-lucide-alert-circle mt-0.5"></span>
                  <div>{errorMsg}</div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backup Drive"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Rclone Remote Name</label>
                <input
                  type="text"
                  required
                  disabled={!!editingAccount}
                  placeholder="e.g. gdrive1"
                  value={formData.remoteName}
                  onChange={(e) => setFormData({ ...formData, remoteName: e.target.value })}
                  className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {!editingAccount && (
                  <p className="text-[10px] text-gray-600 m-0 mt-1 leading-normal">
                    Must match the configuration name in your Rclone config file (e.g. [gdrive1] config block).
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Provider Type</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="input-field bg-brand-dark"
                >
                  <option value="google drive">Google Drive</option>
                  <option value="dropbox">Dropbox</option>
                  <option value="s3">Amazon S3</option>
                  <option value="onedrive">OneDrive</option>
                  <option value="local">Local Disk</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Storage Limit (GB)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Unlimited"
                  value={formData.storageLimit}
                  onChange={(e) => setFormData({ ...formData, storageLimit: e.target.value })}
                  className="input-field font-mono"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-solid border-white/5 mt-6">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
