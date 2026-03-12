const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export async function getHealth() {
  const r = await fetch(`${BASE}/health`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export function getBaseUrl() {
  return BASE
}

export async function postTranslate(formData) {
  const r = await fetch(`${BASE}/translate`, {
    method: 'POST',
    body: formData,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || data.detail || r.statusText)
  return data
}

export async function getCampaigns() {
  const r = await fetch(`${BASE}/campaigns`)
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText)
  return r.json()
}

export async function getCampaign(id) {
  const r = await fetch(`${BASE}/campaigns/${id}`)
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText)
  return r.json()
}

export async function postCampaign(body) {
  const r = await fetch(`${BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.detail || r.statusText)
  return data
}

export async function postContribution(campaignId, body) {
  const r = await fetch(`${BASE}/campaigns/${campaignId}/contributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.detail || r.statusText)
  return data
}

export async function getContributions(campaignId) {
  const r = await fetch(`${BASE}/campaigns/${campaignId}/contributions`)
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText)
  return r.json()
}

export async function getCheckInCards() {
  const r = await fetch(`${BASE}/check-in/cards`)
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText)
  return r.json()
}

export async function postCheckInExtract(body) {
  const r = await fetch(`${BASE}/check-in/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.detail || r.statusText)
  return data
}

export async function postCheckInActionPlan(body) {
  const r = await fetch(`${BASE}/check-in/action-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.detail || r.statusText)
  return data
}
