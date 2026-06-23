import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Account, type RemoteFile, type RemoteAbout } from "../lib/api";
import { FileIcon } from "./FileIcon";
import { StorageIndicator } from "./StorageIndicator";

interface FileExplorerProps {
  accounts: Account[];
  initialAccountId?: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function FileExplorer({ accounts, initialAccountId }: FileExplorerProps) {
  const queryClient = useQueryClient();

  // Selected remote account
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Directory navigation states
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [about, setAbout] = useState<RemoteAbout | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [error, setError] = useState("");

  // Toolbar operations states
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Set initial account selection
  useEffect(() => {
    if (accounts.length > 0) {
      if (initialAccountId && accounts.some((a) => a.id === initialAccountId)) {
        setSelectedAccountId(initialAccountId);
      } else {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [accounts, initialAccountId]);

  // Load directory & quota whenever active remote account or path changes
  useEffect(() => {
    if (selectedAccountId) {
      loadDirectory(selectedAccountId, currentPath);
      loadAbout(selectedAccountId);
    }
  }, [selectedAccountId, currentPath]);

  const loadDirectory = async (accountId: string, path: string) => {
    setFilesLoading(true);
    setError("");
    try {
      const result = await api.getRemoteFiles(accountId, path);
      // Sort: directories first, then alphabetical
      const sorted = [...result].sort((a, b) => {
        if (a.IsDir && !b.IsDir) return -1;
        if (!a.IsDir && b.IsDir) return 1;
        return a.Name.localeCompare(b.Name);
      });
      setFiles(sorted);
    } catch (err: any) {
      setError(err.message || "Failed to load storage files.");
    } finally {
      setFilesLoading(false);
    }
  };

  const loadAbout = async (accountId: string) => {
    setAboutLoading(true);
    try {
      const result = await api.getRemoteAbout(accountId);
      setAbout(result);
    } catch (err) {
      console.error("Failed to fetch storage quota detail:", err);
    } finally {
      setAboutLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSearchQuery("");
  };

  const handleGoUp = () => {
    const segments = currentPath.split("/").filter(Boolean);
    segments.pop();
    handleNavigate(segments.join("/"));
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedAccountId) return;

    setIsCreatingFolder(true);
    setError("");
    try {
      const folderPath = currentPath
        ? `${currentPath}/${newFolderName.trim()}`
        : newFolderName.trim();
      await api.createRemoteFolder(selectedAccountId, folderPath);
      setNewFolderName("");
      loadDirectory(selectedAccountId, currentPath);
    } catch (err: any) {
      setError(err.message || "Failed to create folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeAccount) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);
    setError("");
    try {
      await api.uploadFileToRemote(activeAccount.remoteName, currentPath, file);
      // Refresh statistics and list
      loadDirectory(activeAccount.id, currentPath);
      loadAbout(activeAccount.id);
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransfers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err: any) {
      setError(err.message || "File upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      e.target.value = ""; // Reset input value
    }
  };

  // Filter files locally via search query
  const filteredFiles = files.filter((f) =>
    f.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (accounts.length === 0) {
    return (
      <div className="bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/5 rounded-xl p-8 py-16 text-center transition-colors duration-300">
        <span className="i-ri-cloud-off-line text-5xl text-slate-400 dark:text-gray-600 block mx-auto mb-4"></span>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white m-0">No active storage remotes</h3>
        <p className="text-xs text-slate-500 dark:text-gray-500 max-w-sm mx-auto mt-2 leading-relaxed">
          Please add a Google Drive or other Rclone cloud integration in the Remotes view to start browsing files.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl flex flex-col h-[580px] overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
      
      {/* FileExplorer Toolbar */}
      <div className="p-4 border-b border-solid border-slate-200 dark:border-white/5 bg-transparent flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Left Side: Account Selector & Upload actions */}
        <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
          {/* Active Remote Selector */}
          <select
            value={selectedAccountId}
            onChange={(e) => {
              setSelectedAccountId(e.target.value);
              setCurrentPath("");
              setSearchQuery("");
            }}
            className="input-field py-1.5 px-3 text-xs w-48 bg-white dark:bg-brand-dark"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.remoteName}:)
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <input
            type="file"
            id="file-explorer-upload"
            disabled={isUploading}
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="file-explorer-upload"
            className={`btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer select-none ${
              isUploading ? "opacity-75 pointer-events-none" : ""
            }`}
          >
            {isUploading ? (
              <span className="i-ri-loader-4-line animate-spin"></span>
            ) : (
              <span className="i-ri-upload-cloud-2-line"></span>
            )}
            Upload File
          </label>

          {/* Create Folder Form */}
          <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5">
            <input
              type="text"
              required
              disabled={isCreatingFolder}
              placeholder="New Folder..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="input-field py-1.5 px-2.5 text-xs w-32 bg-white dark:bg-transparent"
            />
            <button
              type="submit"
              disabled={isCreatingFolder || !newFolderName.trim()}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              title="Create folder"
            >
              {isCreatingFolder ? (
                <span className="i-ri-loader-4-line animate-spin"></span>
              ) : (
                <span className="i-ri-folder-add-line"></span>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Local Search & View Toggles */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Search Input */}
          <div className="relative w-full md:w-48">
            <span className="i-ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></span>
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field py-1.5 pl-8 pr-3 text-xs w-full bg-white dark:bg-transparent"
            />
          </div>

          {/* Sync Button */}
          <button
            onClick={() => {
              if (selectedAccountId) {
                loadDirectory(selectedAccountId, currentPath);
                loadAbout(selectedAccountId);
              }
            }}
            disabled={filesLoading}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 border border-solid border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:text-brand-accent flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
            title="Refresh directory"
          >
            <span className={`i-ri-refresh-line text-sm ${filesLoading ? "animate-spin" : ""}`}></span>
          </button>

          {/* View Toggles */}
          <div className="flex border border-solid border-slate-200 dark:border-white/10 rounded-lg overflow-hidden p-0.5 bg-slate-100 dark:bg-white/5">
            <button
              onClick={() => setViewMode("list")}
              className={`w-7 h-7 border-none rounded flex items-center justify-center cursor-pointer transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-white/10 text-brand-accent shadow-sm"
                  : "bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white"
              }`}
              title="List View"
            >
              <span className="i-ri-list-check-2 text-sm"></span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`w-7 h-7 border-none rounded flex items-center justify-center cursor-pointer transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-white/10 text-brand-accent shadow-sm"
                  : "bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white"
              }`}
              title="Grid View"
            >
              <span className="i-ri-grid-fill text-sm"></span>
            </button>
          </div>
        </div>

      </div>

      {/* Path Breadcrumbs */}
      <div className="bg-transparent px-4 py-2 border-b border-solid border-slate-200 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto text-[11px] select-none font-medium">
        <button
          onClick={() => handleNavigate("")}
          className="text-brand-accent hover:underline bg-transparent border-none cursor-pointer p-0"
        >
          Root
        </button>
        {currentPath.split("/").filter(Boolean).map((segment, index, arr) => {
          const subPath = arr.slice(0, index + 1).join("/");
          return (
            <div key={index} className="flex items-center gap-1.5 text-slate-400">
              <span>/</span>
              <button
                onClick={() => handleNavigate(subPath)}
                className="text-brand-accent hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                {segment}
              </button>
            </div>
          );
        })}
      </div>

      {/* Uploading progress notification */}
      {isUploading && (
        <div className="bg-brand-accent/10 border-b border-solid border-brand-accent/20 px-4 py-2 text-[11px] text-brand-accent flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <span className="i-ri-loader-4-line animate-spin"></span>
            <span>{uploadProgress}</span>
          </div>
          <span className="font-mono animate-pulse">STREAMING LIVE</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 bg-red-500/10 border border-solid border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-lg p-3 flex items-start gap-2">
          <span className="i-ri-error-warning-line mt-0.5 animate-pulse"></span>
          <div className="flex-1">{error}</div>
          <button onClick={() => setError("")} className="bg-transparent border-none text-slate-400 hover:text-slate-700 cursor-pointer">
            <span className="i-ri-close-line"></span>
          </button>
        </div>
      )}

      {/* Directory Contents Panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {filesLoading ? (
          <div className="space-y-3 py-6">
            <div className="h-10 bg-slate-100 dark:bg-white/3 rounded-xl animate-pulse"></div>
            <div className="h-10 bg-slate-100 dark:bg-white/3 rounded-xl animate-pulse"></div>
            <div className="h-10 bg-slate-100 dark:bg-white/3 rounded-xl animate-pulse"></div>
            <div className="h-10 bg-slate-100 dark:bg-white/3 rounded-xl animate-pulse"></div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 dark:text-gray-500">
            <span className="i-ri-folder-open-line text-4xl block mx-auto mb-3 text-slate-300 dark:text-gray-700"></span>
            {searchQuery ? "No search results match query." : "This directory is empty."}
          </div>
        ) : viewMode === "list" ? (
          // LIST VIEW
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-solid border-slate-200 dark:border-white/5 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="pb-2 pl-2">Name</th>
                <th className="pb-2 w-24">Size</th>
                <th className="pb-2 w-32">Type</th>
                <th className="pb-2 w-40 text-right pr-2">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-solid divide-slate-100 dark:divide-white/3">
              {/* Go Up row */}
              {currentPath && (
                <tr
                  onClick={handleGoUp}
                  className="hover:bg-slate-50 dark:hover:bg-white/2 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 pl-2 font-medium text-brand-accent flex items-center gap-2">
                    <span className="i-ri-folder-upload-fill text-base text-brand-accent"></span>
                    <span>.. (Go Up)</span>
                  </td>
                  <td className="py-2.5 text-slate-400">-</td>
                  <td className="py-2.5 text-slate-400">Parent Directory</td>
                  <td className="py-2.5 text-slate-400 text-right pr-2 font-mono text-[10px]">-</td>
                </tr>
              )}

              {filteredFiles.map((file) => (
                <tr
                  key={file.Path}
                  onDoubleClick={() => file.IsDir && handleNavigate(file.Path)}
                  className={`group transition-colors ${
                    file.IsDir
                      ? "hover:bg-slate-50 dark:hover:bg-white/2 cursor-pointer"
                      : "hover:bg-slate-50/50 dark:hover:bg-white/1"
                  }`}
                >
                  <td className="py-2.5 pl-2 font-medium text-slate-800 dark:text-gray-200 flex items-center gap-2 truncate max-w-[320px]">
                    <FileIcon name={file.Name} isDir={file.IsDir} className="text-base" />
                    <span
                      onClick={() => file.IsDir && handleNavigate(file.Path)}
                      className={file.IsDir ? "hover:underline text-brand-accent" : ""}
                    >
                      {file.Name}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-500 dark:text-gray-400 font-mono">
                    {file.IsDir ? "-" : formatBytes(file.Size)}
                  </td>
                  <td className="py-2.5 text-slate-500 dark:text-gray-500 truncate max-w-[120px]" title={file.MimeType}>
                    {file.IsDir ? "Directory" : file.Name.split(".").pop()?.toUpperCase() || "File"}
                  </td>
                  <td className="py-2.5 text-slate-500 dark:text-gray-500 text-right pr-2 font-mono text-[10px]">
                    {new Date(file.ModTime).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // GRID VIEW
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 select-none">
            {/* Go Up Card */}
            {currentPath && (
              <motion.div
                whileHover={{ y: -2 }}
                onClick={handleGoUp}
                className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/2 cursor-pointer text-center group transition-colors min-h-[110px]"
              >
                <span className="i-ri-folder-upload-fill text-3xl text-brand-accent group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-semibold text-brand-accent mt-2">.. Go Up</span>
              </motion.div>
            )}

            {filteredFiles.map((file) => (
              <motion.div
                key={file.Path}
                whileHover={{ y: -2 }}
                onDoubleClick={() => file.IsDir && handleNavigate(file.Path)}
                onClick={() => file.IsDir && handleNavigate(file.Path)}
                className="flex flex-col items-center justify-center p-4 border border-solid border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/2 cursor-pointer text-center relative group min-h-[110px] transition-colors"
              >
                <div className="group-hover:scale-105 transition-transform">
                  <FileIcon name={file.Name} isDir={file.IsDir} className="text-3xl" />
                </div>
                <span
                  className="text-[11px] font-semibold text-slate-700 dark:text-gray-300 mt-2 truncate w-full px-1"
                  title={file.Name}
                >
                  {file.Name}
                </span>
                {!file.IsDir && (
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 font-mono mt-0.5">
                    {formatBytes(file.Size)}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Explorer Capacity Footer */}
      <div className="px-4 py-3.5 border-t border-solid border-slate-200 dark:border-white/5 bg-transparent flex flex-col sm:flex-row justify-between items-center gap-2">
        <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">
          {filteredFiles.length} item{filteredFiles.length !== 1 ? "s" : ""} in view
        </span>
        
        {about && !aboutLoading ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 dark:text-gray-400">
              Pool Status: {formatBytes(about.used)} of {about.total ? formatBytes(about.total) : "Unlimited"} Used
            </span>
            {about.total && (
              <div className="w-20 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-accent"
                  style={{ width: `${Math.min(100, Math.round((about.used / about.total) * 100))}%` }}
                ></div>
              </div>
            )}
          </div>
        ) : null}
      </div>

    </div>
  );
}
