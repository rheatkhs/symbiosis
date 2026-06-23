import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Account, type RemoteFile, type RemoteAbout } from "../lib/api";
import { FileIcon } from "./FileIcon";

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
  const [deletingPaths, setDeletingPaths] = useState<string[]>([]);
  const [activeMenuPath, setActiveMenuPath] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ path: string; isDir: boolean; name: string } | null>(null);
  
  // File Preview States
  const [previewFile, setPreviewFile] = useState<RemoteFile | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string>("");
  const [previewTextLoading, setPreviewTextLoading] = useState(false);

  // Drag & Drop Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handlePreviewFile = async (file: RemoteFile) => {
    setPreviewFile(file);
    setActiveMenuPath(null);

    const ext = file.Name.split(".").pop()?.toLowerCase() || "";
    const textExts = ["txt", "md", "csv", "html", "css", "js", "ts", "jsx", "tsx", "json", "py", "go", "java", "c", "cpp", "sh", "yml", "yaml", "xml", "ini", "log"];

    if (textExts.includes(ext)) {
      setPreviewTextLoading(true);
      setPreviewTextContent("");
      try {
        const url = `/api/stream/download/${selectedAccountId}?path=${encodeURIComponent(file.Path)}`;
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          setPreviewTextContent(text.slice(0, 100000));
        } else {
          setPreviewTextContent("Failed to load file preview content.");
        }
      } catch (err: any) {
        setPreviewTextContent(`Error loading file: ${err.message}`);
      } finally {
        setPreviewTextLoading(false);
      }
    }
  };

  // Close dropdown when user clicks anywhere else
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuPath(null);
    };
    if (activeMenuPath) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [activeMenuPath]);

  const handleDeleteTrigger = (filePath: string, isDir: boolean) => {
    const cleanName = filePath.split("/").pop() || filePath;
    setDeleteConfirmItem({ path: filePath, isDir, name: cleanName });
    setActiveMenuPath(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmItem || !selectedAccountId) return;
    const { path, isDir } = deleteConfirmItem;

    setDeletingPaths((prev) => [...prev, path]);
    setError("");
    try {
      await api.deleteRemoteFile(selectedAccountId, path, isDir);
      
      // Refresh statistics and list
      loadDirectory(selectedAccountId, currentPath);
      loadAbout(selectedAccountId);
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransfers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      
      // Close modal
      setDeleteConfirmItem(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete item.");
    } finally {
      setDeletingPaths((prev) => prev.filter((p) => p !== path));
    }
  };

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

  const uploadFiles = async (filesList: File[]) => {
    if (!activeAccount || filesList.length === 0) return;
    setIsUploading(true);
    setError("");
    try {
      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        setUploadProgress(
          filesList.length > 1
            ? `Uploading ${file.name} (${i + 1}/${filesList.length})...`
            : `Uploading ${file.name}...`
        );
        await api.uploadFileToRemote(activeAccount.remoteName, currentPath, file);
      }
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
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);
    await uploadFiles(selectedFiles);
    e.target.value = ""; // Reset input value
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const next = prev - 1;
      if (next === 0) {
        setIsDragging(false);
      }
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    if (dragCounter > 0) {
      console.debug("Dropped files reset counter.");
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      await uploadFiles(droppedFiles);
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
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl flex flex-col h-[580px] overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300"
    >
      
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
            multiple
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
                <th className="pb-2 w-16 text-right pr-2">Actions</th>
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
                  <td className="py-2.5 text-right pr-2">-</td>
                </tr>
              )}

              {filteredFiles.map((file) => (
                <tr
                  key={file.Path}
                  onDoubleClick={() => file.IsDir ? handleNavigate(file.Path) : handlePreviewFile(file)}
                  className="group hover:bg-slate-50 dark:hover:bg-white/2 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 pl-2 font-medium text-slate-800 dark:text-gray-200 flex items-center gap-2 truncate max-w-[320px]">
                    <FileIcon name={file.Name} isDir={file.IsDir} className="text-base" />
                    <span
                      onClick={() => file.IsDir ? handleNavigate(file.Path) : handlePreviewFile(file)}
                      className="hover:underline text-brand-accent cursor-pointer"
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
                  <td className="py-2.5 text-right pr-2 relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuPath(activeMenuPath === file.Path ? null : file.Path);
                      }}
                      className="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 flex items-center justify-center cursor-pointer transition-all ml-auto"
                      title="Actions"
                    >
                      <span className="i-ri-more-2-fill text-sm"></span>
                    </button>
                    
                    <AnimatePresence>
                      {activeMenuPath === file.Path && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          transition={{ duration: 0.1 }}
                          className="absolute right-2 top-9 z-30 bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/10 rounded-lg shadow-lg py-1 w-32 text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!file.IsDir && (
                            <button
                              onClick={() => handlePreviewFile(file)}
                              className="w-full px-3 py-1.5 text-xs text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 border-none bg-transparent flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <span className="i-ri-eye-line text-sm text-slate-400"></span>
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTrigger(file.Path, file.IsDir)}
                            className="w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600 border-none bg-transparent flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <span className="i-ri-delete-bin-6-line text-sm"></span>
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                onDoubleClick={() => file.IsDir ? handleNavigate(file.Path) : handlePreviewFile(file)}
                onClick={() => file.IsDir ? handleNavigate(file.Path) : handlePreviewFile(file)}
                className="flex flex-col items-center justify-center p-4 border border-solid border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/2 cursor-pointer text-center relative group min-h-[110px] transition-colors"
              >
                {/* Actions button (floating, visible on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuPath(activeMenuPath === file.Path ? null : file.Path);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-white dark:bg-brand-dark border border-solid border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Actions"
                >
                  <span className="i-ri-more-2-fill text-[11px]"></span>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {activeMenuPath === file.Path && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-1.5 top-8 z-30 bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/10 rounded-lg shadow-lg py-1 w-28 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!file.IsDir && (
                        <button
                          onClick={() => handlePreviewFile(file)}
                          className="w-full px-2.5 py-1.5 text-[10px] text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 border-none bg-transparent flex items-center gap-1.5 cursor-pointer font-medium"
                        >
                          <span className="i-ri-eye-line text-xs text-slate-400"></span>
                          Preview
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTrigger(file.Path, file.IsDir)}
                        className="w-full px-2.5 py-1.5 text-[10px] text-red-500 hover:bg-red-500/10 hover:text-red-600 border-none bg-transparent flex items-center gap-1.5 cursor-pointer font-medium"
                      >
                        <span className="i-ri-delete-bin-6-line text-xs"></span>
                        Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmItem && (
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
              className="bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl transition-colors duration-300"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-solid border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/1">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase m-0 flex items-center gap-1.5">
                  <span className="i-ri-error-warning-line text-red-500 text-sm"></span>
                  Confirm Delete
                </h3>
                <button
                  onClick={() => setDeleteConfirmItem(null)}
                  className="w-6 h-6 rounded-lg bg-transparent hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white border-none flex items-center justify-center cursor-pointer transition-all"
                >
                  <span className="i-ri-close-line text-base"></span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed m-0 font-medium">
                  Are you sure you want to permanently delete the {deleteConfirmItem.isDir ? "directory" : "file"}{" "}
                  <strong className="text-slate-900 dark:text-white break-all font-semibold">"{deleteConfirmItem.name}"</strong>?
                </p>
                {deleteConfirmItem.isDir && (
                  <p className="text-[10px] text-red-500/90 dark:text-red-400/90 font-medium leading-relaxed bg-red-500/5 dark:bg-red-500/10 border border-solid border-red-500/10 rounded-lg p-2.5 m-0 flex items-start gap-1.5">
                    <span className="i-ri-alert-line mt-0.5 text-xs flex-shrink-0"></span>
                    <span>Warning: This action will recursively delete this folder and all of its contents. This cannot be undone.</span>
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="px-5 py-3.5 bg-slate-50/30 dark:bg-white/1 border-t border-solid border-slate-100 dark:border-white/5 flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmItem(null)}
                  disabled={deletingPaths.includes(deleteConfirmItem.path)}
                  className="btn-secondary py-1.5 px-3 text-xs border border-solid border-slate-200 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deletingPaths.includes(deleteConfirmItem.path)}
                  className="py-1.5 px-3.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none shadow-sm hover:shadow transition-all"
                >
                  {deletingPaths.includes(deleteConfirmItem.path) ? (
                    <>
                      <span className="i-ri-loader-4-line animate-spin"></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => {
              setPreviewFile(null);
              setPreviewTextContent("");
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl transition-colors duration-300 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-solid border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/1">
                <div className="flex items-center gap-2 truncate">
                  <FileIcon name={previewFile.Name} isDir={previewFile.IsDir} className="text-lg flex-shrink-0" />
                  <div className="truncate text-left">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase m-0 truncate">
                      {previewFile.Name}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono m-0 mt-0.5">
                      {formatBytes(previewFile.Size)} • {new Date(previewFile.ModTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/stream/download/${selectedAccountId}?path=${encodeURIComponent(previewFile.Path)}`}
                    download={previewFile.Name}
                    className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-400 hover:text-brand-accent border-none flex items-center justify-center cursor-pointer transition-all"
                    title="Download file"
                  >
                    <span className="i-ri-download-2-line text-lg"></span>
                  </a>
                  <button
                    onClick={() => {
                      setPreviewFile(null);
                      setPreviewTextContent("");
                    }}
                    className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white border-none flex items-center justify-center cursor-pointer transition-all"
                    title="Close"
                  >
                    <span className="i-ri-close-line text-xl"></span>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-brand-dark/20 min-h-[300px]">
                {(() => {
                  const ext = previewFile.Name.split(".").pop()?.toLowerCase() || "";
                  const previewUrl = `/api/stream/download/${selectedAccountId}?path=${encodeURIComponent(previewFile.Path)}`;
                  
                  const imageExts = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"];
                  const videoExts = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v"];
                  const audioExts = ["mp3", "wav", "flac", "ogg", "m4a", "wma", "aac"];
                  const textExts = ["txt", "md", "csv", "html", "css", "js", "ts", "jsx", "tsx", "json", "py", "go", "java", "c", "cpp", "sh", "yml", "yaml", "xml", "ini", "log"];

                  if (imageExts.includes(ext)) {
                    return (
                      <div className="relative group max-w-full">
                        <img
                          src={previewUrl}
                          alt={previewFile.Name}
                          className="max-w-full max-h-[60vh] object-contain rounded-lg border border-solid border-slate-200 dark:border-white/10 shadow-sm"
                        />
                      </div>
                    );
                  }

                  if (videoExts.includes(ext)) {
                    return (
                      <video
                        src={previewUrl}
                        controls
                        className="max-w-full max-h-[60vh] rounded-lg border border-solid border-slate-200 dark:border-white/10 shadow-sm"
                        autoPlay
                      />
                    );
                  }

                  if (audioExts.includes(ext)) {
                    return (
                      <div className="w-full max-w-md bg-white dark:bg-brand-card p-6 border border-solid border-slate-200 dark:border-white/5 rounded-2xl text-center shadow-md">
                        <span className="i-ri-music-2-fill text-5xl text-emerald-500 block mx-auto mb-4 animate-pulse"></span>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate px-4">{previewFile.Name}</h4>
                        <audio src={previewUrl} controls className="w-full mt-6" autoPlay />
                      </div>
                    );
                  }

                  if (ext === "pdf") {
                    return (
                      <iframe
                        src={previewUrl}
                        title={previewFile.Name}
                        className="w-full h-[60vh] rounded-lg border border-solid border-slate-200 dark:border-white/10 bg-white"
                      />
                    );
                  }

                  if (textExts.includes(ext)) {
                    if (previewTextLoading) {
                      return (
                        <div className="flex flex-col items-center gap-3 py-12">
                          <span className="i-ri-loader-4-line text-3xl text-brand-accent animate-spin"></span>
                          <span className="text-xs text-slate-500 dark:text-gray-400">Loading text content...</span>
                        </div>
                      );
                    }
                    return (
                      <div className="w-full h-[60vh] flex flex-col">
                        <pre className="flex-1 p-4 bg-slate-950 text-slate-100 rounded-xl text-[11px] overflow-auto font-mono leading-relaxed border border-solid border-white/5 text-left selection:bg-brand-accent/30 selection:text-white">
                          <code>{previewTextContent}</code>
                        </pre>
                      </div>
                    );
                  }

                  // Fallback: download option
                  return (
                    <div className="text-center py-12 max-w-sm">
                      <span className="i-ri-file-3-line text-6xl text-slate-300 dark:text-gray-700 block mx-auto mb-4"></span>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Preview unavailable</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-500 mt-2 mb-6 leading-relaxed">
                        This file format cannot be previewed directly in the browser. You can download the file to view it locally.
                      </p>
                      <a
                        href={previewUrl}
                        download={previewFile.Name}
                        className="btn-primary py-2 px-4 text-xs inline-flex items-center gap-1.5 cursor-pointer decoration-none shadow-sm hover:shadow"
                      >
                        <span className="i-ri-download-2-line"></span>
                        Download File ({formatBytes(previewFile.Size)})
                      </a>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-50/30 dark:bg-white/1 border-t border-solid border-slate-100 dark:border-white/5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setPreviewFile(null);
                    setPreviewTextContent("");
                  }}
                  className="btn-secondary py-1.5 px-4 text-xs border border-solid border-slate-200 dark:border-white/10"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-brand-dark/95 border-2 border-dashed border-brand-accent/50 rounded-xl flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="text-center p-6 max-w-sm"
            >
              <span className="i-ri-upload-cloud-2-line text-5xl text-brand-accent animate-bounce block mx-auto mb-4"></span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Drop to Upload</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Release your files here to stream them directly to your storage account under <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">/{currentPath || "root"}</span>.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
