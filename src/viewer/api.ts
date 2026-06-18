// Fetch wrappers for the viewer server JSON API.

import type { Comment, Manifest, PlanSummary } from "./store.js";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function listPlans(): Promise<PlanSummary[]> {
  const data = await getJson<{ plans?: PlanSummary[] }>("/api/plans");
  return data.plans ?? [];
}

export async function getManifest(slug: string): Promise<Manifest> {
  return getJson<Manifest>(`/api/plans/${encodeURIComponent(slug)}`);
}

export async function getRevision(slug: string, rev: number): Promise<string> {
  const res = await fetch(`/api/plans/${encodeURIComponent(slug)}/rev/${rev}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

export async function getComments(slug: string, rev: number): Promise<Comment[]> {
  const data = await getJson<{ comments?: Comment[] }>(
    `/api/plans/${encodeURIComponent(slug)}/comments?rev=${rev}`
  );
  return data.comments ?? [];
}

export async function saveComments(slug: string, rev: number, comments: Comment[]): Promise<void> {
  const res = await fetch(`/api/plans/${encodeURIComponent(slug)}/comments?rev=${rev}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(comments),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}
