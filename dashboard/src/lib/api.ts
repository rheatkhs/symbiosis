export interface Stats {
  totalAccounts: number;
  activeTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  totalStorageUsed: number;
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
};
