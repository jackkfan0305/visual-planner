// Fetch wrappers for the viewer server JSON API.

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function listPlans() {
  const data = await getJson("/api/plans");
  return data.plans || [];
}

export async function getManifest(slug) {
  return getJson(`/api/plans/${encodeURIComponent(slug)}`);
}

export async function getRevision(slug, rev) {
  const res = await fetch(`/api/plans/${encodeURIComponent(slug)}/rev/${rev}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

export async function getComments(slug, rev) {
  const data = await getJson(
    `/api/plans/${encodeURIComponent(slug)}/comments?rev=${rev}`
  );
  return data.comments || [];
}

export async function saveComments(slug, rev, comments) {
  const res = await fetch(
    `/api/plans/${encodeURIComponent(slug)}/comments?rev=${rev}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comments),
    }
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
