export type KimaiParsedRow = {
  date: string;
  fromTime: string;
  toTime: string;
  email: string;
  user: string;
  project: string;
  customer: string;
  activity: string;
  description: string;
  durationSeconds: number;
  hash: string;
};

function csvSplit(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function headerIndex(headers: string[], names: string[]): number {
  const lower = headers.map((header) => header.toLowerCase());
  for (const name of names) {
    const index = lower.indexOf(name.toLowerCase());
    if (index >= 0) {
      return index;
    }
  }
  return -1;
}

export function parseKimaiCsv(text: string): KimaiParsedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }
  const headers = csvSplit(lines[0]);
  const idx = {
    date: headerIndex(headers, ["Date", "date"]),
    from: headerIndex(headers, ["From", "from", "Begin"]),
    to: headerIndex(headers, ["To", "to", "End"]),
    email: headerIndex(headers, ["Email", "email"]),
    user: headerIndex(headers, ["User", "Username"]),
    project: headerIndex(headers, ["Project"]),
    customer: headerIndex(headers, ["Customer", "Customer Name"]),
    activity: headerIndex(headers, ["Activity"]),
    description: headerIndex(headers, ["Description"]),
    duration: headerIndex(headers, ["Duration"]),
  };
  const rows: KimaiParsedRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = csvSplit(line);
    const date = cols[idx.date] ?? "";
    const fromTime = cols[idx.from] ?? "";
    const toTime = cols[idx.to] ?? "";
    const email = (cols[idx.email] ?? "").toLowerCase();
    const customer = cols[idx.customer] ?? "";
    const project = cols[idx.project] ?? "";
    const activity = cols[idx.activity] ?? "";
    const description = idx.description >= 0 ? cols[idx.description] ?? "" : "";
    let durationSeconds = 0;
    if (idx.duration >= 0 && cols[idx.duration]) {
      const raw = cols[idx.duration];
      durationSeconds = Number(raw);
      if (Number.isNaN(durationSeconds)) {
        const parts = raw.split(":").map(Number);
        if (parts.length === 3) {
          durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
      }
    }
    const hash = `${date}|${fromTime}|${toTime}|${email}|${customer}|${project}|${activity}`;
    rows.push({
      date,
      fromTime,
      toTime,
      email,
      user: idx.user >= 0 ? cols[idx.user] ?? "" : "",
      project,
      customer,
      activity,
      description,
      durationSeconds,
      hash,
    });
  }
  return rows;
}
