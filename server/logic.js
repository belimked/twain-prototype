import { OBJECTS, BILLING_PARAMS, DEFAULT_BILLING_CONFIG, recommendCapacity } from '../shared/objects.js'
import { bad, today, nowIso, toRecord, uid } from './store.js'
import * as s from './schema.js'
import { eq } from 'drizzle-orm'

export const addMonths = (date, n) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}
export const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const round = (n, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp
const has = (v) => v !== null && v !== undefined && v !== ''

export async function billingConfig(db) {
  const [row] = await db.select().from(s.meta).where(eq(s.meta.key, 'billingConfig'))
  return { ...DEFAULT_BILLING_CONFIG, ...(row?.value || {}) }
}

async function limitFor(store, approvalId, parameterId) {
  const params = await store.list('sampleParameter', { approvalId, parameterId })
  const sp = params[0]
  if (sp) return sp.variation && has(sp.variationLimit) ? sp.variationLimit : sp.limit
  return (await store.get(parameterId))?.defaultLimit ?? null
}

export const hooks = {
  async beforeSave(store, def, d, before, { system } = {}) {
    const get = (id) => (id ? store.get(id) : null)
    switch (def.key) {
      case 'approval': {
        if (!system && d.status === 'Cancelled' && before?.status !== 'Cancelled') throw bad('Use the "Cancel Approval" action; cancellation needs Coordinator approval')
        if (!has(d.propertyAddress) && d.billingAccountId) d.propertyAddress = (await get(d.billingAccountId))?.propertyAddress ?? null
        d.enrolledForBilling = d.status === 'Active' && [d.employees, d.showeringEmployees, d.workingDays, d.tradeWasteFraction].every(has)
        if (d.enrolledForBilling && !d.billingStartDate) {
          d.billingStartDate = today()
          d.nextBillingDate = addMonths(d.billingStartDate, 3)
        }
        d.billingFrequency = 'Quarterly'
        break
      }
      case 'occupier': d.approvalId = (await get(d.siteId))?.approvalId ?? null; break
      case 'pts': {
        const site = await get(d.siteId)
        d.approvalId = site?.approvalId ?? null
        if (d.occupierId) {
          const occ = await get(d.occupierId)
          if (occ?.siteId !== d.siteId) throw bad('The occupier must belong to the selected site')
        }
        break
      }
      case 'fixture': d.approvalId = (await get(d.occupierId))?.approvalId ?? null; break
      case 'meterReading': {
        d.approvalId = (await get(d.meterId))?.approvalId ?? null
        const prev = (await store.list('meterReading', { meterId: d.meterId }))
          .filter((r) => r.id !== before?.id && r.readingDate < d.readingDate)
          .sort((a, b) => b.readingDate.localeCompare(a.readingDate))[0]
        if (prev && d.reading < prev.reading) throw bad(`Reading is lower than the previous reading (${prev.reading} kL on ${prev.readingDate})`)
        d.consumption = prev ? round(d.reading - prev.reading) : null
        break
      }
      case 'sampleParameter': {
        const p = await get(d.parameterId)
        d.parameterName = p?.paramName ?? null
        d.unit = p?.unit ?? null
        if (!has(d.limit)) d.limit = p?.defaultLimit ?? null
        break
      }
      case 'samplingEvent':
        d.volumeKl = has(d.meterStart) && has(d.meterEnd) ? round(d.meterEnd - d.meterStart) : null
        if (d.volumeKl !== null && d.volumeKl < 0) throw bad('24h meter end must not be lower than the start reading')
        if (d.status === 'Sample Collected' && before?.status !== 'Sample Collected') {
          if (!d.limsId) d.limsId = 'LIMS-' + String(Math.floor(Math.random() * 9e6) + 1e6)
          if (!d.sampleDate) d.sampleDate = today()
        }
        if (d.status === 'Results Received' && before?.status !== 'Results Received' && !system) throw bad('Results arrive from the laboratory (use "Simulate LIMS results")')
        break
      case 'sample': {
        const ev = await get(d.samplingEventId)
        d.approvalId = ev?.approvalId ?? null
        break
      }
      case 'sampleResult': {
        const sample = await get(d.sampleId)
        d.samplingEventId = sample?.samplingEventId ?? null
        d.approvalId = sample?.approvalId ?? null
        const p = await get(d.parameterId)
        d.parameterName = p?.paramName ?? null
        d.unit = p?.unit ?? null
        d.limit = await limitFor(store, d.approvalId, d.parameterId)
        d.exceeded = has(d.limit) && d.value > d.limit
        break
      }
      case 'case':
        if (d.status === 'Closed' && before?.status !== 'Closed') {
          if (d.caseType === 'Non-Compliance') {
            for (const k of ['outcome', 'preventativeAction', 'correctiveAction']) if (!has(d[k])) throw bad(`${OBJECTS.case.fieldMap[k].label} is required to close a Non-Compliance case`)
          }
          d.resolutionDate = today()
        }
        if (d.status !== 'Closed') d.resolutionDate = null
        if (!has(d.address) && d.approvalId) d.address = (await get(d.approvalId))?.propertyAddress ?? null
        break
      case 'planAssessment': {
        const fixtures = d.occupierId ? await store.list('fixture', { occupierId: d.occupierId }) : []
        d.recommendedCapacity = fixtures.length || d.mealsPerDay ? recommendCapacity(fixtures, d.mealsPerDay) : null
        if (d.status === 'Completed' && !d.outcome) throw bad('Select an Outcome before completing the assessment')
        d.completedDate = d.status === 'Completed' ? d.completedDate || today() : null
        break
      }
      case 'invoice':
        d.gst = has(d.amount) ? round(d.amount * DEFAULT_BILLING_CONFIG.gstRate) : null
        d.total = has(d.amount) ? round(d.amount + d.gst) : null
        break
      case 'approvalCondition': {
        const c = await get(d.conditionId)
        d.code = c?.code ?? null
        d.text = c?.text ?? null
        break
      }
      case 'workItem':
        if (!before && !system) throw bad('Work items are created by actions such as "Cancel Approval"')
        break
    }
    return d
  },

  async afterSave(store, def, rec, before) {
    if (def.key === 'samplingEvent' && rec.status === 'Sample Collected' && before?.status !== 'Sample Collected') {
      await ensureSamples(store, rec)
    }
  }
}

async function ensureSamples(store, event) {
  const existing = await store.list('sample', { samplingEventId: event.id })
  if (existing.length) return existing
  const locations = (await store.list('sampleLocation', { approvalId: event.approvalId })).filter((l) => l.isDefault && l.status === 'Active')
  const out = []
  for (const l of locations) {
    out.push(await store.create('sample', { samplingEventId: event.id, sampleLocationId: l.id, method: l.method, collectedAt: nowIso(), status: 'Pending' }))
  }
  return out
}

// Pseudo-random but stable per sample/parameter, so repeated simulations look plausible.
function fakeValue(seed, limit, typical) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const r = ((h >>> 0) % 10000) / 10000
  const base = has(typical) ? typical : has(limit) ? limit * 0.55 : 50
  const v = r > 0.88 && has(limit) ? limit * (1.05 + r * 0.4) : base * (0.4 + r * 0.9)
  return round(v, v < 10 ? 2 : 1)
}

export const actions = {
  async limsResults(store, { eventId }) {
    const event = await store.must(eventId, 'samplingEvent')
    if (event.status !== 'Sample Collected') throw bad('Set the status to "Sample Collected" first so LIMS can register the samples')
    const samples = await ensureSamples(store, event)
    if (!samples.length) throw bad('No samples: add a default sample location or a sample first')
    const params = await store.list('sampleParameter', { approvalId: event.approvalId })
    if (!params.length) throw bad('This approval has no default sample parameters')
    const exceeded = []
    for (const sample of samples) {
      const done = new Set((await store.list('sampleResult', { sampleId: sample.id })).map((r) => r.parameterId))
      for (const p of params) {
        if (done.has(p.parameterId)) continue
        const r = await store.create('sampleResult', { sampleId: sample.id, parameterId: p.parameterId, value: fakeValue(sample.id + p.parameterId, p.variation ? p.variationLimit : p.limit) })
        if (r.exceeded) exceeded.push(r)
      }
      await store.update(sample.id, { status: 'Received', limsSampleId: sample.limsSampleId || `${event.limsId}-${sample.name.slice(-3)}` }, { system: true })
    }
    await store.update(event.id, { status: 'Results Received' }, { system: true })
    let nc = null
    if (exceeded.length) nc = await raiseExceedanceCase(store, event, exceeded)
    return { results: params.length * samples.length, exceeded: exceeded.length, caseId: nc?.id ?? null, caseName: nc?.name ?? null }
  },

  async massLoad(store, { eventId }) {
    const event = await store.must(eventId, 'samplingEvent')
    if (event.status !== 'Results Received') throw bad('Mass load needs laboratory results first')
    if (!has(event.volumeKl)) throw bad('Enter the 24h meter start and end readings first')
    const samples = (await store.list('sample', { samplingEventId: event.id })).filter((x) => x.method === 'Composite')
    if (!samples.length) throw bad('Mass load applies to composite samples; this event has none')
    let n = 0
    for (const sample of samples) {
      for (const r of await store.list('sampleResult', { sampleId: sample.id })) {
        if (r.unit !== 'mg/L') continue
        await store.update(r.id, { massLoadKg: round((r.value * event.volumeKl) / 1000, 3) }, { system: true })
        n++
      }
    }
    await store.update(event.id, { massLoadCalculated: true, massLoadAt: nowIso() }, { system: true })
    return { updated: n }
  },

  async setDefaultParameters(store, { approvalId }) {
    await store.must(approvalId, 'approval')
    const sites = await store.list('site', { approvalId })
    const types = new Set(sites.map((x) => x.activityType).filter(Boolean))
    if (!types.size) throw bad('At least one site needs an Activity Type')
    const existing = new Set((await store.list('sampleParameter', { approvalId })).map((p) => p.parameterId))
    const params = (await store.list('testParameter')).filter((p) => p.status === 'Active' && (p.activityTypes || []).some((t) => types.has(t)))
    let added = 0
    for (const p of params) {
      if (existing.has(p.id)) continue
      await store.create('sampleParameter', { approvalId, parameterId: p.id })
      added++
    }
    return { added }
  },

  async cancelApproval(store, { approvalId, reason }) {
    const a = await store.must(approvalId, 'approval')
    if (a.status === 'Cancelled') throw bad('Approval is already cancelled')
    if (!has(reason)) throw bad('Give a reason for the cancellation')
    const wi = await createWorkItem(store, { itemType: 'Cancel Approval', approvalId, summary: `Cancel ${a.name} (${a.tradingName}): ${reason}` }, { reason })
    return { workItemId: wi.id, workItemName: wi.name }
  },

  async changeFrequencies(store, { approvalId, values }) {
    const a = await store.must(approvalId, 'approval')
    if (a.status !== 'Active') throw bad('Inspection frequencies can be changed on Active approvals')
    const patch = {}
    for (const k of ['freqPerformanceReview', 'freqApprovalReview', 'freqSampling']) if (k in (values || {})) patch[k] = values[k]
    if (store.user.role === 'coordinator') return { applied: !!(await store.update(approvalId, patch)) }
    const summary = Object.entries(patch).map(([k, v]) => `${OBJECTS.approval.fieldMap[k].label}: ${a[k] ?? '—'} → ${v ?? '—'}`).join('; ')
    const wi = await createWorkItem(store, { itemType: 'Inspection Frequency Change', approvalId, summary }, { patch })
    return { workItemId: wi.id, workItemName: wi.name }
  },

  async endorseInvoice(store, { invoiceId }) {
    const inv = await store.must(invoiceId, 'invoice')
    if (inv.status !== 'Draft') throw bad('Only draft invoices can be sent for endorsement')
    await store.update(inv.id, { status: 'Pending Endorsement' }, { system: true })
    const wi = await createWorkItem(store, { itemType: 'Invoice Endorsement', approvalId: inv.approvalId, invoiceId: inv.id, summary: `Endorse ${inv.name} – $${inv.total?.toFixed(2)} (${inv.periodStart} to ${inv.periodEnd})` }, {})
    return { workItemId: wi.id, workItemName: wi.name }
  },

  async decideWorkItem(store, { id, decision, comments }) {
    if (store.user.role !== 'coordinator') throw bad('Only a Trade Waste Coordinator can decide work items', 403)
    const wi = await store.must(id, 'workItem')
    if (wi.status !== 'Pending') throw bad('This work item has already been decided')
    if (wi.submittedBy === store.user.id) throw bad('You cannot approve your own work item; another Coordinator must decide it', 403)
    if (!['Approved', 'Rejected'].includes(decision)) throw bad('Invalid decision')
    if (decision === 'Rejected' && !has(comments)) throw bad('Give a reason when rejecting')
    const payload = wi.payload || {}
    if (decision === 'Approved') {
      if (wi.itemType === 'Cancel Approval') await store.update(wi.approvalId, { status: 'Cancelled', cancelledDate: today(), enrolledForBilling: false }, { system: true })
      if (wi.itemType === 'Inspection Frequency Change') await store.update(wi.approvalId, payload.patch || {}, { system: true })
      if (wi.itemType === 'Invoice Endorsement') await store.update(wi.invoiceId, { status: 'Queued for Billing' }, { system: true })
      if (wi.itemType === 'Hydraulic Variation' && payload.recordId) await store.update(payload.recordId, payload.patch || {}, { system: true })
    } else if (wi.itemType === 'Invoice Endorsement') {
      await store.update(wi.invoiceId, { status: 'Draft' }, { system: true })
    }
    return store.update(id, { status: decision, decidedBy: store.user.id, decidedAt: nowIso(), decisionComments: comments || null }, { system: true })
  },

  async billingPreview(store, { startDate, endDate }) {
    return { approvals: (await eligibleApprovals(store, startDate, endDate)).map((a) => ({ id: a.id, name: a.name, tradingName: a.tradingName, nextBillingDate: a.nextBillingDate, isDeemedQuality: !!a.isDeemedQuality })) }
  },

  // Called repeatedly by the client with 5 approvals at a time (like TWAIN's batch of 5).
  async billingRunBatch(store, { runId, approvalIds }) {
    const run = await store.must(runId, 'billingRun')
    if (run.status === 'Completed') throw bad('This billing run has already completed')
    if (!Array.isArray(approvalIds) || approvalIds.length > 5) throw bad('Send at most 5 approvals per batch')
    if (run.status === 'Draft') await store.update(run.id, { status: 'Running', runAt: nowIso(), runBy: store.user.id }, { system: true })
    const cfg = await billingConfig(store.db)
    const approvals = await store.getMany(approvalIds)
    const due = approvals.filter((a) => a.object === 'approval' && a.enrolledForBilling && a.nextBillingDate && a.nextBillingDate >= run.startDate && a.nextBillingDate <= run.endDate)
    const params = await store.list('testParameter', { billable: true })
    return { calculations: await Promise.all(due.map((a) => billApproval(store, run, a, cfg, params))) }
  },

  async billingRunFinish(store, { runId }) {
    const run = await store.must(runId, 'billingRun')
    const calcs = await store.list('billingCalc', { billingRunId: runId })
    return store.update(run.id, { status: 'Completed', approvalCount: calcs.length, totalAmount: round(calcs.reduce((x, c) => x + (c.amount || 0), 0)) }, { system: true })
  }
}

async function createWorkItem(store, fields, payload) {
  return store.create('workItem', { ...fields, status: 'Pending', submittedBy: store.user.id, submittedAt: nowIso(), payload }, { system: true })
}

async function raiseExceedanceCase(store, event, exceeded) {
  const open = (await store.list('case', { samplingEventId: event.id })).find((c) => c.caseType === 'Non-Compliance')
  if (open) return open
  const approval = await store.get(event.approvalId)
  const lines = exceeded.map((r) => `${r.parameterName}: ${r.value} ${r.unit} (limit ${r.limit})`).join('\n')
  return store.create('case', {
    caseType: 'Non-Compliance', subject: `Exceedance – ${event.name} – ${approval?.tradingName ?? ''}`.trim(), status: 'New', priority: 'High',
    approvalId: event.approvalId, samplingEventId: event.id, nonComplianceType: 'Exceeded acceptance criteria', reportedBy: 'Laboratory',
    incidentDate: event.sampleDate, description: `Laboratory results exceeded the acceptance criteria:\n${lines}`, ownerId: approval?.ownerId ?? null
  })
}

async function eligibleApprovals(store, startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) throw bad('Choose a valid start and end date')
  return (await store.list('approval', { status: 'Active' }))
    .filter((a) => a.enrolledForBilling && a.nextBillingDate && a.nextBillingDate >= startDate && a.nextBillingDate <= endDate)
}

async function billApproval(store, run, a, cfg, params) {
  const periodEnd = addDays(a.nextBillingDate, -1)
  const periodStart = addMonths(a.nextBillingDate, -3)
  // One query for everything under the approval keeps a batch of 5 well inside Worker limits.
  const [rows, account] = await Promise.all([
    store.db.select().from(s.records).where(eq(s.records.approvalId, a.id)),
    a.billingAccountId ? store.get(a.billingAccountId) : null
  ])
  const of = (o) => rows.filter((r) => r.object === o).map(toRecord)
  const [meters, readings, samples, results, locations, events] = ['meter', 'meterReading', 'sample', 'sampleResult', 'sampleLocation', 'samplingEvent'].map(of)
  const billingMeters = meters.filter((m) => m.usedForBilling && !m.alternateSupplyId)
  const discharge = billingMeters.filter((m) => m.kind === 'Discharge')
  const useMeters = new Set((discharge.length ? discharge : billingMeters).map((m) => m.id))
  const inflowKl = round(readings.filter((r) => useMeters.has(r.meterId) && r.readingDate >= periodStart && r.readingDate <= periodEnd).reduce((x, r) => x + (r.consumption || 0), 0))
  const dischargeFactor = discharge.length ? 1 : account?.sewageDischargeFactor ?? 0.95
  const weeks = 13
  const domesticOffsetKl = round(((a.employees || 0) * cfg.domesticLitresPerEmployeeDay + (a.showeringEmployees || 0) * cfg.domesticLitresPerShowerDay) * (a.workingDays || 5) * weeks / 1000)
  const tradeWasteKl = Math.max(0, round(inflowKl * dischargeFactor - domesticOffsetKl))

  const billingLocations = new Set(locations.filter((l) => l.usedForBilling).map((l) => l.id))
  const eventById = Object.fromEntries(events.map((e) => [e.id, e]))
  const usable = new Set(samples.filter((x) => {
    const ev = eventById[x.samplingEventId]
    return !x.excludeFromBilling && x.status === 'Received' && billingLocations.has(x.sampleLocationId) && ev?.sampleDate >= periodStart && ev?.sampleDate <= periodEnd &&
      (x.method !== 'Composite' || ev.massLoadCalculated)
  }).map((x) => x.id))
  const codeOf = Object.fromEntries(params.map((p) => [p.id, p.code]))
  const conc = {}
  let deemed = !!a.isDeemedQuality
  for (const bp of BILLING_PARAMS) {
    const vals = results.filter((r) => usable.has(r.sampleId) && codeOf[r.parameterId] === bp.code).map((r) => r.value)
    conc[bp.key] = vals.length ? round(vals.reduce((x, v) => x + v, 0) / vals.length, 1) : null
  }
  const noSamples = BILLING_PARAMS.every((bp) => conc[bp.key] === null)
  if (deemed || noSamples) {
    deemed = true
    for (const bp of BILLING_PARAMS) conc[bp.key] = a[bp.deemed] ?? OBJECTS.approval.fieldMap[bp.deemed].default
  }
  const breakdown = BILLING_PARAMS.map((bp) => {
    const excess = Math.max(0, conc[bp.key] - cfg.domesticStrength[bp.key])
    const kg = round((tradeWasteKl * excess) / 1000, 2)
    return { parameter: bp.label, code: bp.code, concentration: conc[bp.key], domesticStrength: cfg.domesticStrength[bp.key], excess: round(excess, 1), kg, rate: cfg.rates[bp.key], charge: round(kg * cfg.rates[bp.key]) }
  })
  const amount = round(breakdown.reduce((x, b) => x + b.charge, 0))
  const sampleCount = deemed ? 0 : usable.size
  const calcId = uid(), invId = uid()
  const calc = await store.prepareCreate('billingCalc', {
    billingRunId: run.id, approvalId: a.id, invoiceId: invId, periodStart, periodEnd, inflowKl, dischargeFactor, domesticOffsetKl, tradeWasteKl, deemed,
    ...conc, sampleCount, amount, breakdown: { lines: breakdown, note: noSamples && !a.isDeemedQuality ? 'No usable samples in the period; deemed quality applied' : null }
  }, calcId)
  const gst = round(amount * DEFAULT_BILLING_CONFIG.gstRate)
  const inv = await store.prepareCreate('invoice', { approvalId: a.id, billingRunId: run.id, billingCalcId: calcId, invoiceType: 'Trade Waste Quality', status: 'Draft', periodStart, periodEnd, amount, gst, total: round(amount + gst) }, invId)
  // All writes for one approval commit together, so a retried batch never bills an approval twice.
  await store.db.batch([...calc, ...inv, ...store.prepareSystemPatch(a, { lastBillingDate: periodEnd, nextBillingDate: addMonths(a.nextBillingDate, 3) })])
  return { id: calcId, approval: a.name, amount, deemed }
}
