export type AccountBalance = {
  category: { id: string; name: string };
  balance: {
    remainingHours: number;
    grantedHours: number;
    usedHours: number;
    mode: string;
    nextRefillDate: string | null;
  };
};

export type AccountHealthRecord = {
  id: string;
  name: string;
  status: string;
  trackable: boolean;
  accountManager: string | null;
  projectManager?: string | null;
  balances: AccountBalance[];
};
