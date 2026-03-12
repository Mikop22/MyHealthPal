import { useState } from 'react'
import {
  getHealth,
  getBaseUrl,
  postTranslate,
  getCampaigns,
  getCampaign,
  postCampaign,
  postContribution,
  getContributions,
  getCheckInCards,
  postCheckInExtract,
  postCheckInActionPlan,
} from './api'

export default function App() {
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(null)

  const [translateFile, setTranslateFile] = useState(null)
  const [culture, setCulture] = useState('')
  const [diet, setDiet] = useState('')
  const [biometrics, setBiometrics] = useState('')
  const [translateResult, setTranslateResult] = useState(null)
  const [translateError, setTranslateError] = useState(null)

  const [campaigns, setCampaigns] = useState(null)
  const [campaignDetail, setCampaignDetail] = useState(null)
  const [contributions, setContributions] = useState(null)
  const [cfError, setCfError] = useState(null)
  const [campaignId, setCampaignId] = useState('')
  const [createCampaign, setCreateCampaign] = useState({ owner_identifier: '', title: '', description: '', goal_amount: '', deadline: '' })
  const [contributionForm, setContributionForm] = useState({ campaign_id: '', contributor_identifier: '', amount: '', message: '' })

  const [checkInCards, setCheckInCards] = useState(null)
  const [extractTranscript, setExtractTranscript] = useState('')
  const [extractResult, setExtractResult] = useState(null)
  const [actionTranscript, setActionTranscript] = useState('')
  const [actionConfirmed, setActionConfirmed] = useState('')
  const [actionRejected, setActionRejected] = useState('')
  const [actionResult, setActionResult] = useState(null)
  const [checkInError, setCheckInError] = useState(null)

  async function handleHealth() {
    setHealthError(null)
    setHealth(null)
    try {
      const data = await getHealth()
      setHealth(data)
    } catch (e) {
      setHealthError(e.message)
    }
  }

  async function handleTranslate(e) {
    e.preventDefault()
    setTranslateError(null)
    setTranslateResult(null)
    if (!translateFile) {
      setTranslateError('Select an image')
      return
    }
    try {
      const formData = new FormData()
      formData.append('image', translateFile)
      if (culture.trim()) formData.append('culture', culture.trim())
      if (diet.trim()) formData.append('diet', diet.trim())
      if (biometrics.trim()) formData.append('biometrics', biometrics.trim())
      const data = await postTranslate(formData)
      setTranslateResult(data)
    } catch (e) {
      setTranslateError(e.message)
    }
  }

  async function handleListCampaigns() {
    setCfError(null)
    setCampaigns(null)
    try {
      const data = await getCampaigns()
      setCampaigns(data)
    } catch (e) {
      setCfError(e.message)
    }
  }

  async function handleGetCampaign(e) {
    e.preventDefault()
    setCfError(null)
    setCampaignDetail(null)
    if (!campaignId.trim()) return
    try {
      const data = await getCampaign(campaignId.trim())
      setCampaignDetail(data)
    } catch (e) {
      setCfError(e.message)
    }
  }

  async function handleCreateCampaign(e) {
    e.preventDefault()
    setCfError(null)
    try {
      const body = {
        owner_identifier: createCampaign.owner_identifier.trim(),
        title: createCampaign.title.trim(),
        description: createCampaign.description.trim(),
        goal_amount: parseFloat(createCampaign.goal_amount, 10),
        deadline: createCampaign.deadline.trim() || undefined,
      }
      const data = await postCampaign(body)
      setCampaignDetail(data)
      setCreateCampaign({ owner_identifier: '', title: '', description: '', goal_amount: '', deadline: '' })
    } catch (e) {
      setCfError(e.message)
    }
  }

  async function handleAddContribution(e) {
    e.preventDefault()
    setCfError(null)
    const cid = contributionForm.campaign_id.trim()
    if (!cid) return
    try {
      const body = {
        contributor_identifier: contributionForm.contributor_identifier.trim(),
        amount: parseFloat(contributionForm.amount, 10),
        message: contributionForm.message.trim() || undefined,
      }
      await postContribution(cid, body)
      setContributionForm((prev) => ({ ...prev, campaign_id: prev.campaign_id, contributor_identifier: '', amount: '', message: '' }))
    } catch (e) {
      setCfError(e.message)
    }
  }

  async function handleListContributions(e) {
    e.preventDefault()
    setCfError(null)
    setContributions(null)
    const cid = contributionForm.campaign_id.trim()
    if (!cid) return
    try {
      const data = await getContributions(cid)
      setContributions(data)
    } catch (e) {
      setCfError(e.message)
    }
  }

  async function handleLoadCards() {
    setCheckInError(null)
    setCheckInCards(null)
    try {
      const data = await getCheckInCards()
      setCheckInCards(data)
    } catch (e) {
      setCheckInError(e.message)
    }
  }

  async function handleExtract(e) {
    e.preventDefault()
    setCheckInError(null)
    setExtractResult(null)
    if (!extractTranscript.trim()) return
    try {
      const data = await postCheckInExtract({ transcript: extractTranscript.trim() })
      setExtractResult(data)
    } catch (e) {
      setCheckInError(e.message)
    }
  }

  async function handleActionPlan(e) {
    e.preventDefault()
    setCheckInError(null)
    setActionResult(null)
    if (!actionTranscript.trim()) return
    const confirmed = actionConfirmed.split(',').map((s) => s.trim()).filter(Boolean)
    const rejected = actionRejected.split(',').map((s) => s.trim()).filter(Boolean)
    try {
      const data = await postCheckInActionPlan({
        transcript: actionTranscript.trim(),
        confirmed_card_ids: confirmed,
        rejected_card_ids: rejected,
      })
      setActionResult(data)
    } catch (e) {
      setCheckInError(e.message)
    }
  }

  return (
    <div>
      <h1>MyHealthPal Backend Test</h1>
      <p>API base: {getBaseUrl()}</p>

      <section>
        <h2>Health</h2>
        <button type="button" onClick={handleHealth}>Check health</button>
        {healthError && <p className="error">{healthError}</p>}
        {health && <pre>{JSON.stringify(health, null, 2)}</pre>}
      </section>

      <section>
        <h2>Vision (POST /translate)</h2>
        <form onSubmit={handleTranslate}>
          <div>
            <label>Image (required): </label>
            <input type="file" accept="image/jpeg,image/png" onChange={(e) => setTranslateFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label>Culture: </label>
            <input type="text" value={culture} onChange={(e) => setCulture(e.target.value)} placeholder="optional" />
          </div>
          <div>
            <label>Diet: </label>
            <input type="text" value={diet} onChange={(e) => setDiet(e.target.value)} placeholder="optional" />
          </div>
          <div>
            <label>Biometrics: </label>
            <input type="text" value={biometrics} onChange={(e) => setBiometrics(e.target.value)} placeholder="optional JSON" />
          </div>
          <button type="submit">Translate</button>
        </form>
        {translateError && <p className="error">{translateError}</p>}
        {translateResult && (
          <div>
            <p><strong>Summary:</strong></p>
            <ul>
              {translateResult.summaryBullets?.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
            <p><strong>Nutritional swap:</strong> {translateResult.nutritionalSwap}</p>
          </div>
        )}
      </section>

      <section>
        <h2>Crowdfunding</h2>
        {cfError && <p className="error">{cfError}</p>}
        <div>
          <button type="button" onClick={handleListCampaigns}>List campaigns</button>
          {campaigns && <pre>{JSON.stringify(campaigns, null, 2)}</pre>}
        </div>
        <form onSubmit={handleCreateCampaign} style={{ marginTop: '1rem' }}>
          <h3>Create campaign</h3>
          <div><label>Owner: </label><input type="text" value={createCampaign.owner_identifier} onChange={(e) => setCreateCampaign((p) => ({ ...p, owner_identifier: e.target.value }))} required /></div>
          <div><label>Title: </label><input type="text" value={createCampaign.title} onChange={(e) => setCreateCampaign((p) => ({ ...p, title: e.target.value }))} required /></div>
          <div><label>Description: </label><input type="text" value={createCampaign.description} onChange={(e) => setCreateCampaign((p) => ({ ...p, description: e.target.value }))} required /></div>
          <div><label>Goal amount: </label><input type="number" step="any" value={createCampaign.goal_amount} onChange={(e) => setCreateCampaign((p) => ({ ...p, goal_amount: e.target.value }))} required /></div>
          <div><label>Deadline (YYYY-MM-DD): </label><input type="text" value={createCampaign.deadline} onChange={(e) => setCreateCampaign((p) => ({ ...p, deadline: e.target.value }))} placeholder="optional" /></div>
          <button type="submit">Create</button>
        </form>
        <form onSubmit={handleGetCampaign} style={{ marginTop: '1rem' }}>
          <h3>Get campaign by ID</h3>
          <input type="text" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} placeholder="campaign id" />
          <button type="submit">Get</button>
        </form>
        {campaignDetail && <pre>{JSON.stringify(campaignDetail, null, 2)}</pre>}
        <form onSubmit={handleAddContribution} style={{ marginTop: '1rem' }}>
          <h3>Add contribution</h3>
          <div><label>Campaign ID: </label><input type="text" value={contributionForm.campaign_id} onChange={(e) => setContributionForm((p) => ({ ...p, campaign_id: e.target.value }))} required /></div>
          <div><label>Contributor: </label><input type="text" value={contributionForm.contributor_identifier} onChange={(e) => setContributionForm((p) => ({ ...p, contributor_identifier: e.target.value }))} required /></div>
          <div><label>Amount: </label><input type="number" step="any" value={contributionForm.amount} onChange={(e) => setContributionForm((p) => ({ ...p, amount: e.target.value }))} required /></div>
          <div><label>Message: </label><input type="text" value={contributionForm.message} onChange={(e) => setContributionForm((p) => ({ ...p, message: e.target.value }))} placeholder="optional" /></div>
          <button type="submit">Add contribution</button>
        </form>
        <form onSubmit={handleListContributions} style={{ marginTop: '0.5rem' }}>
          <label>List contributions for campaign ID: </label>
          <input type="text" value={contributionForm.campaign_id} onChange={(e) => setContributionForm((p) => ({ ...p, campaign_id: e.target.value }))} />
          <button type="submit">List</button>
        </form>
        {contributions != null && <pre>{JSON.stringify(contributions, null, 2)}</pre>}
      </section>

      <section>
        <h2>Check In</h2>
        {checkInError && <p className="error">{checkInError}</p>}
        <div>
          <button type="button" onClick={handleLoadCards}>Load cards</button>
          {checkInCards && <pre>{JSON.stringify(checkInCards, null, 2)}</pre>}
        </div>
        <form onSubmit={handleExtract} style={{ marginTop: '1rem' }}>
          <h3>Extract (POST /check-in/extract)</h3>
          <div><label>Transcript: </label></div>
          <textarea value={extractTranscript} onChange={(e) => setExtractTranscript(e.target.value)} rows={3} style={{ width: '100%' }} required />
          <button type="submit">Extract</button>
        </form>
        {extractResult && <pre>{JSON.stringify(extractResult, null, 2)}</pre>}
        <form onSubmit={handleActionPlan} style={{ marginTop: '1rem' }}>
          <h3>Action plan (POST /check-in/action-plan)</h3>
          <div><label>Transcript: </label></div>
          <textarea value={actionTranscript} onChange={(e) => setActionTranscript(e.target.value)} rows={2} style={{ width: '100%' }} required />
          <div><label>Confirmed card IDs (comma-separated): </label><input type="text" value={actionConfirmed} onChange={(e) => setActionConfirmed(e.target.value)} /></div>
          <div><label>Rejected card IDs (comma-separated): </label><input type="text" value={actionRejected} onChange={(e) => setActionRejected(e.target.value)} /></div>
          <button type="submit">Get action plan</button>
        </form>
        {actionResult && (
          <div>
            <p><strong>Summary:</strong></p>
            <ul>{actionResult.summary_bullets?.map((b, i) => <li key={i}>{b}</li>)}</ul>
            <p><strong>Questions:</strong></p>
            <ol>{actionResult.questions?.map((q, i) => <li key={i}>{q}</li>)}</ol>
          </div>
        )}
      </section>
    </div>
  )
}
