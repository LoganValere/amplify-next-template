export type TimeAccount = {
  id: string;
  name: string;
  status: string;
  trackable: boolean;
  balances: Array<{
    category: { id: string; name: string };
    balance: {
      remainingHours: number;
      grantedHours: number;
      usedHours: number;
      mode: string;
      nextRefillDate: string | null;
    };
  }>;
};

export type TimeCategory = {
  id: string;
  name: string;
  active: boolean;
};

export type TimeEntry = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  description: string;
  source: string;
  client: { id: string; name: string };
  hourCategory: { id: string; name: string };
  user: { id: string; name: string; email: string; role?: string };
};

export type ActiveTimer = {
  id: string;
  clientId: string;
  startedAt: string;
  note: string;
  client: { id: string; name: string };
};

export type SessionUser = {
  id: string;
  name: string;
  role: "ADMIN" | "STAFF" | "CLIENT";
  hourCategoryId: string | null;
};

export type TimeData = {
  accounts: TimeAccount[];
  categories: TimeCategory[];
  entries: TimeEntry[];
  timer: ActiveTimer | null;
  user: SessionUser | null;
};
