import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

export function parseDriveFolderId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  return trimmed;
}

export async function connectDriveFolder(clientId: string, folderUrlOrId: string) {
  const folderId = parseDriveFolderId(folderUrlOrId);
  return prisma.integrationLink.create({
    data: {
      clientId,
      kind: "drive_folder",
      externalId: folderId,
      metadata: JSON.stringify({ source: folderUrlOrId }),
    },
  });
}

export async function connectMondayWorkspace(clientId: string, workspaceId: string) {
  return prisma.integrationLink.create({
    data: {
      clientId,
      kind: "monday_workspace",
      externalId: workspaceId.trim(),
    },
  });
}

export async function ingestDriveFolder(clientId: string, folderId: string): Promise<number> {
  const env = getEnv();
  if (!env.APP_GOOGLE_REFRESH_TOKEN || !env.APP_GOOGLE_CLIENT_ID) {
    await prisma.contractChunk.create({
      data: {
        clientId,
        sourceFile: `drive://${folderId}/placeholder.txt`,
        text: "Drive ingest skipped: Google credentials are not configured. Folder id stored for the account.",
        embedding: "[]",
      },
    });
    return 1;
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.APP_GOOGLE_CLIENT_ID,
      client_secret: env.APP_GOOGLE_CLIENT_SECRET,
      refresh_token: env.APP_GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenRes.ok) {
    throw new Error("Google token refresh failed");
  }
  const tokenJson = (await tokenRes.json()) as { access_token: string };
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed=false`)}&fields=files(id,name,mimeType)`,
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
  );
  if (!listRes.ok) {
    throw new Error("Drive list failed");
  }
  const listJson = (await listRes.json()) as {
    files: Array<{ id: string; name: string; mimeType: string }>;
  };
  let count = 0;
  for (const file of listJson.files ?? []) {
    const exportMime =
      file.mimeType === "application/vnd.google-apps.document"
        ? "text/plain"
        : file.mimeType === "application/pdf"
          ? "text/plain"
          : "text/plain";
    const downloadUrl =
      file.mimeType.startsWith("application/vnd.google-apps")
        ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`
        : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const fileRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!fileRes.ok) {
      continue;
    }
    const text = (await fileRes.text()).slice(0, 20000);
    const pieces = chunkText(text, 1200);
    for (const piece of pieces) {
      await prisma.contractChunk.create({
        data: {
          clientId,
          sourceFile: file.name,
          text: piece,
          embedding: "[]",
        },
      });
      count += 1;
    }
  }
  return count;
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length ? chunks : [text];
}
