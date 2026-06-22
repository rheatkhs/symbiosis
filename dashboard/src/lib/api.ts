export interface Stats {
  totalAccounts: number;
  activeTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  totalStorageUsed: number;
  totalStorageLimit: number;
  totalStorageFree: number;
  hasUnlimitedLimit: boolean;
  rcloneHealthy: boolean;
}

export interface Account {
  id: string;
  name: string;
  remoteName: string;
  provider: string;
  status: "active" | "paused" | "error";
  storageUsed: number;
  storageLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: string;
  accountId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  status: "pending" | "streaming" | "completed" | "failed";
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface PaginatedTransfers {
  data: Transfer[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error! Status: ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  getStats: () => fetchApi<Stats>("/api/dash/stats"),
  getAccounts: () => fetchApi<Account[]>("/api/dash/accounts"),
  getAccount: (id: string) => fetchApi<Account>(`/api/dash/accounts/${id}`),
  createAccount: (data: Partial<Account>) =>
    fetchApi<Account>("/api/dash/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  oauthGdrive: (data: { name: string; remoteName: string }) =>
    fetchApi<Account>("/api/dash/accounts/oauth-gdrive", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAccount: (id: string, data: Partial<Account>) =>
    fetchApi<Account>(`/api/dash/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteAccount: (id: string) =>
    fetchApi<null>(`/api/dash/accounts/${id}`, {
      method: "DELETE",
    }),
  getTransfers: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    accountId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.accountId) searchParams.set("accountId", params.accountId);
    return fetchApi<PaginatedTransfers>(`/api/dash/transfers?${searchParams.toString()}`);
  },
  getRemoteAbout: (id: string) =>
    fetchApi<RemoteAbout>(`/api/dash/accounts/${id}/about`),
  getRemoteFiles: (id: string, path: string) =>
    fetchApi<RemoteFile[]>(`/api/dash/accounts/${id}/files?path=${encodeURIComponent(path)}`),
  createRemoteFolder: (id: string, path: string) =>
    fetchApi<{ success: boolean }>(`/api/dash/accounts/${id}/mkdir`, {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  uploadFileToRemote: (accountIdOrRemoteName: string, path: string, file: File) => {
    const headers = new Headers();
    headers.append("X-File-Path", path);
    headers.append("X-File-Name", file.name);
    return fetch(`/api/stream/upload/${accountIdOrRemoteName}`, {
      method: "POST",
      headers,
      body: file,
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Upload failed with status ${res.status}`);
      }
      return res.json();
    });
  },
};

export interface RemoteFile {
  Path: string;
  Name: string;
  Size: number;
  MimeType: string;
  IsDir: boolean;
  ModTime: string;
}

export interface RemoteAbout {
  total: number;
  used: number;
  free: number;
  trashed: number;
  other: number;
}

