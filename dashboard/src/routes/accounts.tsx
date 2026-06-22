import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Account, type RemoteFile, type RemoteAbout } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

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
  
  // Registration modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [registrationMode, setRegistrationMode] = useState<"oauth" | "manual">("oauth");

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    remoteName: "",
    provider: "google drive",
    storageLimit: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  // Explorer states
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerAccount, setExplorerAccount] = useState<Account | null>(null);
  const [explorerPath, setExplorerPath] = useState("");
  const [explorerFiles, setExplorerFiles] = useState<RemoteFile[]>([]);
  const [explorerAbout, setExplorerAbout] = useState<RemoteAbout | null>(null);
  const [explorerFilesLoading, setExplorerFilesLoading] = useState(false);
  const [explorerAboutLoading, setExplorerAboutLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [explorerError, setExplorerError] = useState("");

  // Syncing state
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

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

  const oauthMutation = useMutation({
    mutationFn: api.oauthGdrive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeModal();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to connect Google account. Make sure you complete browser login.");
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
    setRegistrationMode("oauth");
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
    setRegistrationMode("manual");
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
    } else if (registrationMode === "oauth") {
      oauthMutation.mutate({
        name: formData.name,
        remoteName: formData.remoteName,
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

  // Sync Storage details from Rclone (updates DB limit & used stats)
  const syncStorageCapacity = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      await api.getRemoteAbout(accountId);
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err) {
      console.error("Failed to sync storage capacity:", err);
    } finally {
      setSyncingAccountId(null);
    }
  };

  // Directory explorer loaders
  const loadDirectory = async (accountId: string, path: string) => {
    setExplorerFilesLoading(true);
    setExplorerError("");
    try {
      const files = await api.getRemoteFiles(accountId, path);
      // Sort: Folders first, then files alphabetically
      const sorted = [...files].sort((a, b) => {
        if (a.IsDir && !b.IsDir) return -1;
        if (!a.IsDir && b.IsDir) return 1;
        return a.Name.localeCompare(b.Name);
      });
      setExplorerFiles(sorted);
    } catch (err: any) {
      setExplorerError(err.message || "Failed to load files from remote.");
    } finally {
      setExplorerFilesLoading(false);
    }
  };

  const loadAbout = async (accountId: string) => {
    setExplorerAboutLoading(true);
    try {
      const about = await api.getRemoteAbout(accountId);
      setExplorerAbout(about);
    } catch (err) {
      console.error("Failed to load storage details:", err);
    } finally {
      setExplorerAboutLoading(false);
    }
  };

  const openExplorer = (account: Account) => {
    setExplorerAccount(account);
    setExplorerPath("");
    setExplorerFiles([]);
    setExplorerAbout(null);
    setExplorerError("");
    setNewFolderName("");
    setIsExplorerOpen(true);
    
    loadDirectory(account.id, "");
    loadAbout(account.id);
  };

  const closeExplorer = () => {
    setIsExplorerOpen(false);
    setExplorerAccount(null);
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const navigateToFolder = (subPath: string) => {
    setExplorerPath(subPath);
    if (explorerAccount) {
      loadDirectory(explorerAccount.id, subPath);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !explorerAccount) return;
    setIsCreatingFolder(true);
    setExplorerError("");
    try {
      const folderPath = explorerPath 
        ? `${explorerPath}/${newFolderName.trim()}` 
        : newFolderName.trim();
      await api.createRemoteFolder(explorerAccount.id, folderPath);
      setNewFolderName("");
      loadDirectory(explorerAccount.id, explorerPath);
    } catch (err: any) {
      setExplorerError(err.message || "Failed to create folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !explorerAccount) return;
    const file = e.target.files[0];
    setIsUploadingFile(true);
    setExplorerError("");
    try {
      await api.uploadFileToRemote(explorerAccount.remoteName, explorerPath, file);
      // Reload details
      loadDirectory(explorerAccount.id, explorerPath);
      loadAbout(explorerAccount.id);
    } catch (err: any) {
      setExplorerError(err.message || "Upload failed.");
    } finally {
      setIsUploadingFile(false);
      // Reset input value
      e.target.value = "";
    }
  };

  const handleGoUp = () => {
    const segments = explorerPath.split("/").filter(Boolean);
    segments.pop();
    const newPath = segments.join("/");
    navigateToFolder(newPath);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8 relative"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white m-0">Remote Storage Accounts</h2>
          <p className="text-xs text-slate-500 dark:text-gray-500 m-0 mt-1">Configure and manage backend Google Drive pools for Symbiosis.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <span className="i-ri-add-line"></span>
          Register Remote
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse border border-solid border-slate-200 dark:border-white/5"></div>
          <div className="h-44 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse border border-solid border-slate-200 dark:border-white/5"></div>
          <div className="h-44 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse border border-solid border-slate-200 dark:border-white/5"></div>
        </div>
      ) : !accountsList || accountsList.length === 0 ? (
        <div className="bg-white dark:bg-brand-card/95 border border-solid border-slate-200 dark:border-white/5 rounded-xl p-8 shadow-sm dark:shadow-none py-16 text-center transition-colors duration-300">
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
            {accountsList.map((account) => {
              const usagePercentage = account.storageLimit
                ? Math.min(100, Math.round((account.storageUsed / account.storageLimit) * 100))
                : 0;
              const isSyncing = syncingAccountId === account.id;

              return (
                <motion.div
                  key={account.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-white dark:bg-brand-card/95 border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none flex flex-col justify-between h-44 relative transition-colors duration-300"
                >
                  <div>
                    {/* Account Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white m-0 leading-tight">{account.name}</h4>
                        <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 uppercase tracking-widest mt-1 block">
                          {account.provider}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openExplorer(account)}
                          className="w-7 h-7 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-900 border border-solid border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 hover:text-white rounded transition-all flex items-center justify-center cursor-pointer"
                          title="Browse Files & Upload"
                        >
                          <span className="i-ri-folder-shield-line text-[13px]"></span>
                        </button>
                        <button
                          onClick={() => openEditModal(account)}
                          className="w-7 h-7 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded border border-solid border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
                          title="Edit Account"
                        >
                          <span className="i-ri-edit-line text-[13px]"></span>
                        </button>
                        <button
                          onClick={() => handleDelete(account.id, account.name)}
                          className="w-7 h-7 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900 border border-solid border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-white rounded transition-all flex items-center justify-center cursor-pointer"
                          title="Delete Account"
                        >
                          <span className="i-ri-delete-bin-line text-[13px]"></span>
                        </button>
                      </div>
                    </div>

                    {/* Remote Mapping Info */}
                    <div className="mt-4 flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-gray-500">Rclone Target:</span>
                      <span className="text-[11px] font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-solid border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300">
                        {account.remoteName}:
                      </span>
                    </div>
                  </div>

                  {/* Progress / Storage Stats */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-gray-400 font-mono items-center">
                      <div className="flex items-center gap-1">
                        <span>Used: {formatBytes(account.storageUsed)}</span>
                        <button
                          onClick={() => syncStorageCapacity(account.id)}
                          disabled={isSyncing}
                          className="w-3.5 h-3.5 rounded bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white border-none flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
                          title="Refresh actual remote size"
                        >
                          <span className={`i-ri-refresh-line text-[10px] ${isSyncing ? "animate-spin" : ""}`}></span>
                        </button>
                      </div>
                      <span>
                        {account.storageLimit ? `${usagePercentage}% of ${formatBytes(account.storageLimit)}` : "Unlimited"}
                      </span>
                    </div>
                    {account.storageLimit && (
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-solid border-slate-200 dark:border-white/5">
                        <div
                          className="h-full bg-violet-600 rounded-full transition-all duration-500"
                          style={{ width: `${usagePercentage}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Account Settings Edit/Create Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl transition-colors duration-300"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-solid border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/1">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white tracking-wide uppercase m-0">
                  {editingAccount ? "Edit Account" : "Register Remote Storage"}
                </h3>
                <button
                  onClick={closeModal}
                  disabled={oauthMutation.isPending || createMutation.isPending || updateMutation.isPending}
                  className="w-6 h-6 rounded bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white border-none flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="i-ri-close-line"></span>
                </button>
              </div>

              {/* Registration Mode Tabs */}
              {!editingAccount && (
                <div className="flex border-b border-solid border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/1 text-xs">
                  <button
                    type="button"
                    disabled={oauthMutation.isPending || createMutation.isPending}
                    onClick={() => setRegistrationMode("oauth")}
                    className={`flex-1 py-3.5 text-center font-medium border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      registrationMode === "oauth"
                        ? "text-violet-600 dark:text-violet-400 border-b-2 border-b-solid border-b-violet-500 bg-slate-100 dark:bg-white/2"
                        : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white bg-transparent"
                    }`}
                  >
                    <span className="i-ri-google-fill text-sm"></span>
                    Link Google Drive (OAuth)
                  </button>
                  <button
                    type="button"
                    disabled={oauthMutation.isPending || createMutation.isPending}
                    onClick={() => setRegistrationMode("manual")}
                    className={`flex-1 py-3.5 text-center font-medium border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      registrationMode === "manual"
                        ? "text-violet-600 dark:text-violet-400 border-b-2 border-b-solid border-b-violet-500 bg-slate-100 dark:bg-white/2"
                        : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white bg-transparent"
                    }`}
                  >
                    <span className="i-ri-settings-4-line text-sm"></span>
                    Manual Connection
                  </button>
                </div>
              )}

              {/* Modal Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 m-0">
                {errorMsg && (
                  <div className="bg-red-500/10 border border-solid border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-lg p-3 flex items-start gap-2">
                    <span className="i-ri-error-warning-line mt-0.5"></span>
                    <div>{errorMsg}</div>
                  </div>
                )}

                {registrationMode === "oauth" && !editingAccount ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Display Name</label>
                      <input
                        type="text"
                        required
                        disabled={oauthMutation.isPending}
                        placeholder="e.g. My Personal Drive"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Rclone Remote Name</label>
                      <input
                        type="text"
                        required
                        disabled={oauthMutation.isPending}
                        placeholder="e.g. gdrive"
                        value={formData.remoteName}
                        onChange={(e) => setFormData({ ...formData, remoteName: e.target.value })}
                        className="input-field"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 m-0 mt-1 leading-normal">
                        The internal identifier Rclone will use to map this storage pool.
                      </p>
                    </div>

                    <div className="bg-violet-50 dark:bg-violet-950/20 border border-solid border-violet-100 dark:border-violet-500/20 rounded-lg p-3.5 flex gap-3 items-start">
                      <span className="i-ri-information-line text-violet-600 dark:text-violet-400 text-lg flex-shrink-0 mt-0.5 animate-pulse"></span>
                      <p className="text-[10.5px] leading-relaxed text-violet-700 dark:text-violet-300 m-0">
                        <strong>Interactive Authorization:</strong> Submitting will open your web browser on this machine to verify your Google Account. Please allow the requested permissions to complete the link.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Display Name</label>
                      <input
                        type="text"
                        required
                        disabled={createMutation.isPending || updateMutation.isPending}
                        placeholder="e.g. Backup Drive"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Rclone Remote Name</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingAccount || createMutation.isPending}
                        placeholder="e.g. gdrive1"
                        value={formData.remoteName}
                        onChange={(e) => setFormData({ ...formData, remoteName: e.target.value })}
                        className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {!editingAccount && (
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 m-0 mt-1 leading-normal">
                          Must match the configuration name in your Rclone config file (e.g. [gdrive1] config block).
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Provider Type</label>
                      <select
                        value={formData.provider}
                        disabled={!!editingAccount || createMutation.isPending}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                        className="input-field bg-slate-100 dark:bg-brand-dark"
                      >
                        <option value="google drive">Google Drive</option>
                        <option value="dropbox">Dropbox</option>
                        <option value="s3">Amazon S3</option>
                        <option value="onedrive">OneDrive</option>
                        <option value="local">Local Disk</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Storage Limit (GB)</label>
                      <input
                        type="number"
                        step="any"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        placeholder="Unlimited"
                        value={formData.storageLimit}
                        onChange={(e) => setFormData({ ...formData, storageLimit: e.target.value })}
                        className="input-field font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-solid border-slate-200 dark:border-white/5 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={oauthMutation.isPending || createMutation.isPending || updateMutation.isPending}
                    className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={oauthMutation.isPending || createMutation.isPending || updateMutation.isPending}
                    className="btn-primary flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {oauthMutation.isPending ? (
                      <>
                        <span className="i-ri-loader-4-line animate-spin text-sm"></span>
                        Authorizing...
                      </>
                    ) : createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <span className="i-ri-loader-4-line animate-spin text-sm"></span>
                        Saving...
                      </>
                    ) : registrationMode === "oauth" && !editingAccount ? (
                      <>
                        <span className="i-ri-google-fill text-sm"></span>
                        Authorize & Connect
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Drive / Remote File Explorer Modal */}
      <AnimatePresence>
        {isExplorerOpen && explorerAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/10 rounded-xl w-full max-w-4xl h-[620px] flex flex-col overflow-hidden shadow-2xl transition-colors duration-300"
            >
              {/* Explorer Header */}
              <div className="px-6 py-4 border-b border-solid border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/1 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white m-0 flex items-center gap-1.5">
                    <span className="i-ri-folder-shield-line text-violet-500 text-base"></span>
                    File Manager: <span className="text-slate-600 dark:text-gray-300">{explorerAccount.name}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-gray-500 m-0 mt-0.5">
                    Rclone Remote Target: <span className="font-mono text-violet-600 dark:text-violet-400">{explorerAccount.remoteName}:</span>
                  </p>
                </div>

                {/* Explorer Capacity Meter */}
                <div className="text-right flex items-center gap-4">
                  {explorerAboutLoading ? (
                    <div className="h-6 w-32 bg-slate-200 dark:bg-white/5 rounded animate-pulse"></div>
                  ) : explorerAbout ? (
                    <div className="hidden sm:block text-left max-w-[180px] space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-600 dark:text-gray-400 font-mono">
                        <span>Used: {formatBytes(explorerAbout.used)}</span>
                        <span>{explorerAbout.total ? `${Math.round((explorerAbout.used / explorerAbout.total) * 100)}% of ${formatBytes(explorerAbout.total)}` : "Unlimited"}</span>
                      </div>
                      {explorerAbout.total && (
                        <div className="w-36 h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-violet-600 rounded-full"
                            style={{ width: `${Math.min(100, Math.round((explorerAbout.used / explorerAbout.total) * 100))}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <button
                    onClick={closeExplorer}
                    className="w-7 h-7 rounded bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white border-none flex items-center justify-center cursor-pointer transition-all"
                  >
                    <span className="i-ri-close-line text-lg"></span>
                  </button>
                </div>
              </div>

              {/* Breadcrumbs Path */}
              <div className="bg-slate-100/50 dark:bg-black/10 px-6 py-2.5 border-b border-solid border-slate-200 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <button
                  onClick={() => navigateToFolder("")}
                  className="text-violet-600 dark:text-violet-400 hover:underline bg-transparent border-none cursor-pointer p-0 font-medium"
                >
                  Root
                </button>
                {explorerPath.split("/").filter(Boolean).map((segment, index, arr) => {
                  const subPath = arr.slice(0, index + 1).join("/");
                  return (
                    <div key={index} className="flex items-center gap-1.5 text-slate-400">
                      <span>/</span>
                      <button
                        onClick={() => navigateToFolder(subPath)}
                        className="text-violet-600 dark:text-violet-400 hover:underline bg-transparent border-none cursor-pointer p-0 font-medium"
                      >
                        {segment}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Explorer Operations Action Bar */}
              <div className="px-6 py-3 border-b border-solid border-slate-200 dark:border-white/5 flex flex-wrap gap-4 items-center justify-between bg-slate-50/20">
                {/* Create Folder Form */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled={isCreatingFolder}
                    placeholder="New folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="input-field py-1.5 px-3 text-xs w-48 bg-white dark:bg-transparent"
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={isCreatingFolder || !newFolderName.trim()}
                    className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingFolder ? (
                      <span className="i-ri-loader-4-line animate-spin text-[11px]"></span>
                    ) : (
                      <span className="i-ri-folder-add-line text-[11px]"></span>
                    )}
                    Create Folder
                  </button>
                </div>

                {/* Upload File Input */}
                <div>
                  <input
                    type="file"
                    id="explorer-file-picker"
                    disabled={isUploadingFile}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="explorer-file-picker"
                    className={`btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 cursor-pointer ${
                      isUploadingFile ? "opacity-75 pointer-events-none" : ""
                    }`}
                  >
                    {isUploadingFile ? (
                      <>
                        <span className="i-ri-loader-4-line animate-spin text-sm"></span>
                        Uploading File...
                      </>
                    ) : (
                      <>
                        <span className="i-ri-upload-cloud-2-line text-sm"></span>
                        Upload File
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Error Alert inside explorer */}
              {explorerError && (
                <div className="mx-6 mt-4 bg-red-500/10 border border-solid border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-lg p-3 flex items-start gap-2">
                  <span className="i-ri-error-warning-line mt-0.5"></span>
                  <div className="flex-1">{explorerError}</div>
                  <button onClick={() => setExplorerError("")} className="bg-transparent border-none text-slate-400 hover:text-slate-700 cursor-pointer">
                    <span className="i-ri-close-line"></span>
                  </button>
                </div>
              )}

              {/* Directory Browser File Grid / List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {explorerFilesLoading ? (
                  <div className="space-y-3 py-6">
                    <div className="h-9 bg-slate-100 dark:bg-white/3 rounded animate-pulse"></div>
                    <div className="h-9 bg-slate-100 dark:bg-white/3 rounded animate-pulse"></div>
                    <div className="h-9 bg-slate-100 dark:bg-white/3 rounded animate-pulse"></div>
                    <div className="h-9 bg-slate-100 dark:bg-white/3 rounded animate-pulse"></div>
                  </div>
                ) : explorerFiles.length === 0 && !explorerPath ? (
                  <div className="py-20 text-center text-xs text-slate-500 dark:text-gray-500">
                    <span className="i-ri-folder-2-line text-4xl block mx-auto mb-3 text-slate-300 dark:text-gray-700"></span>
                    No files or folders in this Google Drive.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-solid border-slate-200 dark:border-white/5 text-[10px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                        <th className="pb-2.5">Name</th>
                        <th className="pb-2.5 w-24">Size</th>
                        <th className="pb-2.5 w-32">Type</th>
                        <th className="pb-2.5 w-44 text-right">Modified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-solid divide-slate-100 dark:divide-white/3">
                      {/* Parent directory navigate back dot dot row */}
                      {explorerPath && (
                        <tr 
                          onClick={handleGoUp}
                          className="hover:bg-slate-50 dark:hover:bg-white/2 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 font-medium text-violet-600 dark:text-violet-400 flex items-center gap-2">
                            <span className="i-ri-folder-upload-line text-base text-violet-500"></span>
                            <span>.. (Go Up)</span>
                          </td>
                          <td className="py-2.5 text-slate-400">-</td>
                          <td className="py-2.5 text-slate-400">Parent Directory</td>
                          <td className="py-2.5 text-slate-400 text-right font-mono text-[10px]">-</td>
                        </tr>
                      )}

                      {explorerFiles.map((file) => (
                        <tr 
                          key={file.Path}
                          onClick={() => file.IsDir && navigateToFolder(file.Path)}
                          className={`group transition-colors ${
                            file.IsDir 
                              ? "hover:bg-slate-50 dark:hover:bg-white/2 cursor-pointer" 
                              : "hover:bg-slate-50/50 dark:hover:bg-white/1"
                          }`}
                        >
                          <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200 flex items-center gap-2 truncate max-w-[320px]">
                            {file.IsDir ? (
                              <span className="i-ri-folder-5-fill text-base text-yellow-500 flex-shrink-0"></span>
                            ) : (
                              <span className="i-ri-file-3-line text-base text-slate-400 flex-shrink-0"></span>
                            )}
                            <span className={file.IsDir ? "group-hover:underline text-violet-700 dark:text-violet-300" : ""}>
                              {file.Name}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-600 dark:text-gray-400 font-mono">
                            {file.IsDir ? "-" : formatBytes(file.Size)}
                          </td>
                          <td className="py-2.5 text-slate-500 dark:text-gray-500 truncate max-w-[120px]" title={file.MimeType}>
                            {file.IsDir ? "Directory" : file.Name.split(".").pop()?.toUpperCase() || "File"}
                          </td>
                          <td className="py-2.5 text-slate-500 dark:text-gray-500 text-right font-mono text-[10px]">
                            {new Date(file.ModTime).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Explorer Footer */}
              <div className="px-6 py-4 border-t border-solid border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/1 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 dark:text-gray-500">
                  {explorerFiles.length} item{explorerFiles.length !== 1 ? "s" : ""} in current view
                </span>
                <button
                  onClick={closeExplorer}
                  className="btn-secondary py-1.5 px-4 text-xs font-semibold"
                >
                  Close Manager
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
