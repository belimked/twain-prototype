import * as s from './schema.js'
import { eq, sql } from 'drizzle-orm'
import { OBJECTS, BILLING_PARAMS, DEFAULT_BILLING_CONFIG, TYPICAL_VALUES } from '../shared/objects.js'
import { chunk } from './store.js'
import { addMonths, addDays } from './logic.js'
import wasteid from './seed/wasteid.json' with { type: 'json' }

export const CHUNK_SIZE = 15
export const USERS = [
  { id: 'U001', username: 'coordinator', displayName: 'Alex Morgan', role: 'coordinator', email: 'alex.morgan@example.com' },
  { id: 'U002', username: 'coordinator2', displayName: 'Priya Nair', role: 'coordinator', email: 'priya.nair@example.com' },
  { id: 'U003', username: 'officer', displayName: 'Sam Taylor', role: 'officer', email: 'sam.taylor@example.com' },
  { id: 'U004', username: 'officer2', displayName: 'Jordan Lee', role: 'officer', email: 'jordan.lee@example.com' },
  { id: 'U005', username: 'officer3', displayName: 'Chris Walker', role: 'officer', email: 'chris.walker@example.com' }
]
const OFFICERS = ['U003', 'U004', 'U005', 'U003', 'U004', 'U001']
const TODAY = () => new Date().toISOString().slice(0, 10)

function rngFor(seed) {
  let a = (seed * 2654435761) >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next, chance: (p) => next() < p, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (xs) => xs[Math.floor(next() * xs.length)], num: (lo, hi, dp = 1) => Math.round((lo + next() * (hi - lo)) * 10 ** dp) / 10 ** dp
  }
}

const TEST_PARAMS = [
  ['tp_ss', 'SGV_OTHER1', 'Suspended Solids', 'mg/L', 'Billing', 600, true, 'all'],
  ['tp_bod', 'SGV_INRG1', 'Biochemical Oxygen Demand', 'mg/L', 'Billing', 1000, true, 'all'],
  ['tp_n', 'SGV_NUTRNT2', 'Total Nitrogen', 'mg/L', 'Billing', 150, true, 'all'],
  ['tp_p', 'SGV_NUTRNT3', 'Total Phosphorus', 'mg/L', 'Billing', 50, true, 'all'],
  ['tp_fog', 'SGV_FOG', 'Fats, Oils & Grease', 'mg/L', 'Organic', 200, false, ['Food Services', 'General Trade Waste']],
  ['tp_ph', 'SGV_PH', 'pH', 'pH units', 'Physical', 10, false, 'all'],
  ['tp_temp', 'SGV_TEMP', 'Temperature', '°C', 'Physical', 38, false, ['Light Industrial', 'Industrial Compliance']],
  ['tp_tds', 'SGV_TDS', 'Total Dissolved Solids', 'mg/L', 'Inorganic', 4000, false, ['Industrial Compliance']],
  ['tp_tph', 'SGV_TPH', 'Total Petroleum Hydrocarbons', 'mg/L', 'Organic', 30, false, ['Light Industrial', 'Industrial Compliance']],
  ['tp_cu', 'SGV_MTL_CU', 'Copper', 'mg/L', 'Metal', 5, false, ['Light Industrial', 'Industrial Compliance']],
  ['tp_zn', 'SGV_MTL_ZN', 'Zinc', 'mg/L', 'Metal', 5, false, ['Industrial Compliance']],
  ['tp_pb', 'SGV_MTL_PB', 'Lead', 'mg/L', 'Metal', 2, false, ['Industrial Compliance']],
  ['tp_cr', 'SGV_MTL_CR', 'Chromium', 'mg/L', 'Metal', 3, false, ['Industrial Compliance']],
  ['tp_ni', 'SGV_MTL_NI', 'Nickel', 'mg/L', 'Metal', 3, false, ['Industrial Compliance']]
]
const ACTIVITIES = OBJECTS.testParameter.fieldMap.activityTypes.options
const CATCHMENTS = [['ct_1', 'Luggage Point', 'Luggage Point STP'], ['ct_2', 'Oxley Creek', 'Oxley Creek STP'], ['ct_3', 'Gibson Island', 'Gibson Island STP'], ['ct_4', 'Bundamba', 'Bundamba STP'], ['ct_5', 'Goodna', 'Goodna STP'], ['ct_6', 'Wacol', 'Wacol STP']]
const PUMP_STATIONS = [['ps_1', 'SP012', 'Kangaroo Point SPS', 'ct_1'], ['ps_2', 'SP047', 'West End SPS', 'ct_1'], ['ps_3', 'SP103', 'Rocklea SPS', 'ct_2'], ['ps_4', 'SP118', 'Acacia Ridge SPS', 'ct_2'], ['ps_5', 'SP206', 'Murarrie SPS', 'ct_3'], ['ps_6', 'SP311', 'Bundamba SPS', 'ct_4'], ['ps_7', 'SP402', 'Redbank SPS', 'ct_5'], ['ps_8', 'SP517', 'Wacol SPS', 'ct_6']]
const CONDITIONS = [
  ['cd_1', 'GEN-01', 'General', 'The approval holder must notify Urban Utilities within 24 hours of any spill or uncontrolled discharge.'],
  ['cd_2', 'PT-01', 'Pre-treatment', 'Grease arrestors must be pumped out by a licensed liquid waste transporter at the approved frequency.'],
  ['cd_3', 'PT-02', 'Pre-treatment', 'Pre-treatment devices must not be bypassed or modified without written approval.'],
  ['cd_4', 'MON-01', 'Monitoring', 'Provide safe access to sample points at all reasonable times.'],
  ['cd_5', 'DL-01', 'Discharge limits', 'Discharge must comply with the acceptance criteria in Schedule 1 of this approval.'],
  ['cd_6', 'REC-01', 'Records', 'Pump-out dockets must be kept on site for two years and produced on request.'],
  ['cd_7', 'DL-02', 'Discharge limits', 'Discharge temperature must not exceed 38 °C at the point of connection.'],
  ['cd_8', 'MON-02', 'Monitoring', 'Self-monitoring results must be submitted quarterly.']
]

const PTS_TYPE = { 'Silt arrestor': 'Silt Arrestor', 'pH correction': 'pH Correction' }
function activityFor(devices) {
  const types = devices.map((d) => d.t)
  if (types.some((t) => ['Acid Neutraliser', 'pH correction'].includes(t))) return 'Industrial Compliance'
  if (types.some((t) => ['Oil/Water Separator', 'Coalescing Plate Separator', 'Silt arrestor'].includes(t))) return 'Light Industrial'
  if (types.every((t) => t === 'Grease Arrestor')) return 'Food Services'
  return 'General Trade Waste'
}
function siteTypeFor(name, activity, multi, locs = []) {
  if (multi) return locs.length >= 4 ? 'Shopping Centre' : 'Small Shopping Complex'
  if (activity === 'Light Industrial') return 'Workshop'
  if (activity === 'Industrial Compliance') return /food|bever|dairy|bakery|brew/i.test(name) ? 'Food & Beverage Manufacturing' : 'Industrial Premises'
  const n = name.toLowerCase()
  if (/patisserie|bakery|bakehouse/.test(n)) return 'Bakery'
  if (/hotel/.test(n)) return 'Hotel'
  if (/caf[eé]|coffee|espresso/.test(n)) return 'Café'
  if (/tavern|club|pub|bar/.test(n)) return 'Club / Tavern'
  if (/food court/.test(n)) return 'Food Court'
  return 'Restaurant'
}
const CUISINE = (name) => { const n = name.toLowerCase(); return /patisserie|bakery/.test(n) ? 'Bakery' : /pizz/.test(n) ? 'Pizza' : /seafood|fish/.test(n) ? 'Seafood' : /steak|grill/.test(n) ? 'Steak / grill' : /caf/.test(n) ? 'Café' : /noodle|wok|asian|thai|sushi|dumpling/.test(n) ? 'Asian' : 'Mixed' }
const titleCase = (x) => (x || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

const CENTRES = ["Riverside Plaza", "Jacaranda Shopping Village", "Southgate Centre", "Northpoint Plaza", "Parkside Marketplace", "Gateway Shopping Centre", "Harbour Town Centre", "Kingsway Arcade", "Brookfield Village", "Lakeside Square"]
// WasteID locations without an agreement number are grouped into demo shopping centres (one approval, many occupiers).
const approvalGroups = (() => {
  const single = wasteid.locations.filter((l) => l.a).sort((a, b) => a.a.localeCompare(b.a)).map((l) => [l.a, [l], null])
  const loose = wasteid.locations.filter((l) => !l.a).sort((a, b) => a.id.localeCompare(b.id))
  const centres = []
  for (let k = 0, at = 0; at < loose.length; k++) {
    const size = [6, 5, 4, 6, 5, 4, 6, 5, 4, 7][k % 10]
    centres.push([null, loose.slice(at, at + size), CENTRES[k % CENTRES.length]])
    at += size
  }
  const out = []
  single.forEach((g, i) => { out.push(g); if (i % 26 === 13 && centres.length) out.push(centres.shift()) })
  return out.concat(centres)
})()
const devicesByLocation = wasteid.devices.reduce((m, d) => ((m[d.l] ||= []).push(d), m), {})
const deviceIndex = Object.fromEntries(wasteid.devices.map((d, i) => [d.ref, i]))
const companyById = Object.fromEntries(wasteid.companies.map((c) => [c.id, c]))
export const chunkCount = () => Math.ceil(approvalGroups.length / CHUNK_SIZE)

// Collects rows, then flushes them as batched multi-row inserts.
function sink(user) {
  const rows = []
  const at = new Date().toISOString()
  const add = (object, id, name, data, extra = {}) => {
    const def = OBJECTS[object]
    const { ownerId = null, createdAt = at, ...rest } = data
    rows.push({
      id, object, name, status: rest.status ?? null, ownerId, parentId: def.parent ? rest[def.parent] ?? null : null,
      approvalId: object === 'approval' ? null : rest.approvalId ?? null, data: rest, createdAt, createdBy: extra.createdBy || user, updatedAt: createdAt, updatedBy: extra.createdBy || user
    })
    return id
  }
  return { rows, add }
}

export async function flush(db, rows) {
  const stmts = chunk(rows, 7).map((c) => db.insert(s.records).values(c).onConflictDoNothing())
  for (const part of chunk(stmts, 50)) await db.batch(part)
  return rows.length
}

const num = (def, n) => `${OBJECTS[def].prefix}${String(n).padStart(OBJECTS[def].digits, '0')}`

export async function seedBase(db) {
  await db.batch([db.delete(s.records), db.delete(s.history), db.delete(s.notes), db.delete(s.files), db.delete(s.counters), db.delete(s.meta)])
  const { rows, add } = sink('System')
  for (const [id, code, paramName, unit, group, defaultLimit, billable, acts] of TEST_PARAMS) {
    add('testParameter', id, paramName, { paramName, code, unit, group, defaultLimit, billable, activityTypes: acts === 'all' ? ACTIVITIES : acts, status: 'Active' })
  }
  for (const [id, catchmentName, treatmentPlant] of CATCHMENTS) add('catchment', id, catchmentName, { catchmentName, treatmentPlant, status: 'Active' })
  for (const [id, code, stationName, catchmentId] of PUMP_STATIONS) add('pumpStation', id, stationName, { code, stationName, catchmentId, status: 'Active' })
  for (const [id, code, category, text] of CONDITIONS) add('condition', id, code, { code, category, text, status: 'Active' })
  await flush(db, rows)
  await db.insert(s.meta).values({ key: 'billingConfig', value: DEFAULT_BILLING_CONFIG })
  return { chunks: chunkCount() }
}

export async function seedChunk(db, i) {
  const { rows, add } = sink('Data Migration')
  const today = TODAY()
  const groups = approvalGroups.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
  groups.forEach(([agreement, locs, centre], k) => seedApproval(add, i * CHUNK_SIZE + k, agreement, locs, centre, today))
  return { inserted: await flush(db, rows) }
}

function seedApproval(add, idx, agreement, locs, centre, today) {
  const r = rngFor(idx + 7)
  const id = (p) => `${p}${idx}_${Math.floor(r.next() * 1e9).toString(36)}`
  const devices = locs.flatMap((l) => devicesByLocation[l.id] || [])
  const multi = locs.length > 1
  const first = locs.find((l) => l.ad) || locs[0]
  const occActivity = (l) => activityFor(devicesByLocation[l.id]?.length ? devicesByLocation[l.id] : [{ t: 'Grease Arrestor' }])
  const tally = locs.map(occActivity).reduce((m, a) => ((m[a] = (m[a] || 0) + 1), m), {})
  const activity = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]
  const kca = multi && locs.length >= 3 || (activity !== 'Food Services' && r.chance(0.3))
  const sampled = activity !== 'Food Services' || kca || r.chance(0.12)
  const ownerId = OFFICERS[idx % OFFICERS.length]
  const occupierCo = companyById[first.o]
  const address = titleCase(first.ad) || 'Unknown address'
  const suburb = titleCase(first.s)
  const tradingName = centre || first.name
  const status = r.next() < 0.86 ? 'Active' : r.pick(['New', 'In Progress', 'Awaiting Information', 'Suspended', 'Cancelled'])
  const received = `${r.int(2014, 2024)}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`
  const issueDate = status === 'In Progress' ? null : addDays(received, r.int(20, 90))
  const employees = r.int(activity === 'Food Services' ? 3 : 8, activity === 'Food Services' ? 35 : 120)
  const complete = status === 'Active' && r.chance(0.93)
  const enrolled = complete
  const monthStart = today.slice(0, 8) + "01"
  const nextBill = enrolled ? addDays(addMonths(monthStart, r.int(-2, 1)), r.chance(0.5) ? 14 : 0) : null

  const accountId = id('ba')
  add('billingAccount', accountId, `4${String(100000 + idx * 37).slice(-6)}${idx % 10}`, {
    accountNo: `4${String(100000 + idx * 37).slice(-6)}${idx % 10}`, holder: occupierCo?.name || `${tradingName} Pty Ltd`,
    propertyAddress: address, suburb, postcode: first.pc || null, sewageDischargeFactor: r.num(0.82, 0.98, 2), status: 'Active'
  })
  const approvalId = id('ap')
  const catchment = CATCHMENTS[idx % CATCHMENTS.length][0]
  add('approval', approvalId, num('approval', 11000 + idx), {
    type: 'Trade Waste Approval', status, tradingName, billingAccountId: accountId, propertyAddress: `${address}, ${suburb} QLD ${first.pc || ''}`.trim(),
    catchmentId: catchment, sewerType: r.chance(0.85) ? 'Gravity' : r.pick(['Pressure', 'Rising Main']),
    billingCategory: kca ? '1' : activity === 'Food Services' ? '2' : activity === 'General Trade Waste' ? '3' : activity === 'Light Industrial' ? '4' : '5',
    twCategory: (devices[0]?.cat || 'E').replace(/[^A-E]/g, '').slice(-1) || 'E', kca,
    pumpStationId: r.chance(0.35) ? PUMP_STATIONS.find((p) => p[3] === catchment)?.[0] ?? null : null,
    applicationReceivedDate: received, issueDate, cancelledDate: status === 'Cancelled' ? addDays(issueDate || received, r.int(400, 2000)) : null,
    maxDailyVolume: r.num(activity === 'Food Services' ? 2 : 8, activity === 'Food Services' ? 18 : 120, 1),
    dischargeHours: activity === 'Food Services' ? 'Business hours (7am–7pm)' : r.pick(['24 hours', 'Business hours (7am–7pm)', 'Conditional window']),
    employees, maxFlowRate: r.num(0.5, activity === 'Food Services' ? 3 : 12, 1),
    metals: activity === 'Industrial Compliance' ? ['Copper', 'Zinc', 'Chromium'] : activity === 'Light Industrial' ? ['Copper'] : [],
    otherContaminants: activity === 'Food Services' ? ['Fats, oils & grease'] : activity === 'Light Industrial' ? ['Hydrocarbons', 'Suspended solids'] : ['pH', 'Temperature'],
    showeringEmployees: complete ? r.int(0, Math.ceil(employees / 6)) : null, workingDays: complete ? r.pick([5, 6, 7, 7]) : null,
    tradeWasteFraction: complete ? r.int(55, 95) : null,
    enrolledForBilling: enrolled, billingFrequency: 'Quarterly',
    billingStartDate: enrolled ? addDays(issueDate || received, 1) : null,
    lastBillingDate: enrolled ? addDays(addMonths(nextBill, -3), -1) : null, nextBillingDate: nextBill,
    isDeemedQuality: !sampled, deemedBod: 300, deemedN: 70, deemedP: 12, deemedSs: 330,
    freqPerformanceReview: activity === 'Food Services' ? 24 : 12, freqApprovalReview: 60, freqSampling: sampled ? (kca ? 3 : 6) : null,
    wasteidAgreementNo: agreement, ownerId, createdAt: `${received}T09:00:00.000Z`
  })

  const contactN = r.int(1, 3)
  for (let c = 0; c < contactN; c++) {
    const nm = c === 0 ? occupierCo?.contact || 'Site Manager' : r.pick(['Taylor Nguyen', 'Morgan Smith', 'Jamie Brown', 'Casey Wilson', 'Riley Chen', 'Avery Jones'])
    add('contact', id('cn'), nm, {
      approvalId, order: c + 1, contactType: c === 2 ? 'Hydraulic Consultant' : c === 0 ? 'Company' : 'Individual', role: ['Primary', 'Billing', 'Consultant'][c],
      fullName: nm, company: c === 2 ? 'Hydraulic Design Partners' : occupierCo?.name || tradingName,
      email: `${nm.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`, phone: occupierCo?.phone || `07 3${r.int(100, 999)} ${r.int(1000, 9999)}`, mobile: `04${r.int(10, 99)} ${r.int(100, 999)} ${r.int(100, 999)}`
    })
  }

  const siteId = id('st')
  add('site', siteId, multi ? tradingName : first.name, {
    approvalId, siteName: multi ? tradingName : first.name, address, suburb, postcode: first.pc || null,
    siteType: siteTypeFor(first.name, activity, multi, locs), activityType: activity, status: status === 'Cancelled' ? 'Inactive' : 'Active',
    lat: first.lat, lng: first.lng, wasteidLocationId: first.id
  })
  const ptsIds = []
  locs.forEach((l, li) => {
    const co = companyById[l.o]
    const occId = id('oc')
    add('occupier', occId, l.name, {
      siteId, approvalId, businessName: l.name, abn: co?.abn || null, shopNo: multi ? `Shop ${li + 1}` : null, activityType: occActivity(l),
      cuisine: occActivity(l) === 'Food Services' ? CUISINE(l.name) : null, contactName: co?.contact || null, phone: co?.phone || null,
      moveInDate: addDays(received, li * 120), status: 'Current'
    })
    const devs = devicesByLocation[l.id] || []
    const ptsOfOcc = []
    for (const d of devs) {
      const pid = id('pt')
      ptsOfOcc.push(pid)
      ptsIds.push({ id: pid, d, occId })
      add('pts', pid, num('pts', 100000 + deviceIndex[d.ref]), {
        siteId, occupierId: occId, approvalId, ptsType: PTS_TYPE[d.t] || d.t, capacity: d.c || null, flowCapacity: d.c ? Math.round(d.c / 600 * 10) / 10 : null,
        status: d.st === 'Inactive' ? 'Decommissioned' : 'Active', psid: d.ref, locationDesc: d.ld || null,
        installDate: addDays(received, -r.int(30, 400)), pumpOutWeeks: d.fw || null, manufacturer: r.pick(['Humes', 'Everhard', 'Rotoplas', 'Atlantis', null])
      })
    }
    if (activity === 'Food Services' || multi) {
      const fx = [['Sink', r.int(1, 3)], ['Hand basin', r.int(1, 3)], ['Dishwasher', r.int(0, 1)], ['Floor waste', r.int(1, 4)], ['Pot sink', r.int(0, 2)], ['Wok burner', /asian/i.test(CUISINE(l.name)) ? r.int(2, 6) : 0], ['Combi oven', r.int(0, 1)]]
      for (const [fixtureType, qty] of fx) if (qty) add('fixture', id('fx'), fixtureType, { occupierId: occId, approvalId, fixtureType, qty, ptsId: ptsOfOcc[0] || null })
    }
  })

  // Meters: quarterly readings dated on the last day of each billing period.
  const meters = [{ kind: 'Head Meter', source: 'HiAffinity', usedForBilling: true, meterNo: `${r.int(10, 99)}W${r.int(100000, 999999)}` }]
  if (sampled && activity !== 'Food Services') meters.push({ kind: 'TW Effluent', source: 'Manual', usedForBilling: true, meterNo: `TW${r.int(10000, 99999)}` })
  let altId = null
  if (activity !== 'Food Services' && r.chance(0.25)) {
    altId = id('al')
    add('alternateSupply', altId, `ALT-${String(idx + 1).padStart(4, '0')}`, { approvalId, supplyType: r.pick(['Rainwater tank', 'Bore']), description: 'Used for wash-down and cooling tower make-up', status: 'Active' })
    meters.push({ kind: 'Head Meter', source: 'Manual', usedForBilling: false, meterNo: `ALT${r.int(1000, 9999)}`, alternateSupplyId: altId })
  }
  const anchor = nextBill || addMonths(monthStart, -1)
  const quarters = sampled ? 8 : 4
  let mr = 0
  const meterIds = []
  meters.forEach((m, mi) => {
    const meterId = id('me')
    const serialNo = `SN${r.int(100000, 999999)}`
    meterIds.push({ id: meterId, kind: m.kind, serialNo })
    add('meter', meterId, m.meterNo, { approvalId, ...m, status: 'Active', installDate: addDays(received, -10), serialNo })
    const perQuarter = (m.kind === 'TW Effluent' ? 0.9 : 1) * (activity === 'Food Services' ? r.num(90, 450) : r.num(400, 3500))
    let reading = r.int(1000, 90000)
    for (let q = quarters; q >= 0; q--) {
      const readingDate = addDays(addMonths(anchor, -3 * q), -1)
      if (readingDate > today) continue
      const use = q === quarters ? null : Math.round(perQuarter * r.num(0.8, 1.2, 2))
      if (use) reading += use
      add('meterReading', id('mr'), num('meterReading', 1 + idx * 40 + mi * 12 + mr++), { meterId, approvalId, readingDate, reading, consumption: use, readingType: r.chance(0.92) ? 'Actual' : 'Estimated' })
    }
  })

  // Monitoring for sampled approvals.
  if (sampled) {
    const params = TEST_PARAMS.filter((p) => p[7] === 'all' || p[7].includes(activity))
    for (const [pid, code, paramName, unit, , defaultLimit] of params) {
      const variation = pid === 'tp_ss' && r.chance(0.1)
      add('sampleParameter', id('sp'), paramName, { approvalId, parameterId: pid, parameterName: paramName, unit, limit: defaultLimit, lowerLimit: code === 'SGV_PH' ? 6 : null, ncTolerance: 10, variation, variationLimit: variation ? defaultLimit * 1.5 : null, variationReason: variation ? 'Approved variation – process upgrade' : null })
    }
    const slN = r.int(1, 3)
    const sls = []
    for (let k = 0; k < slN; k++) {
      const slId = id('sl')
      sls.push(slId)
      add('sampleLocation', slId, `SL${500 + idx * 3 + k}`, { approvalId, siteId, description: ['Final discharge pit', 'Pre-treatment outlet', 'Boundary trap'][k], method: k === 0 ? 'Composite' : 'Grab', usedForBilling: k === 0, isDefault: k === 0, status: 'Active' })
    }
    add('workInstruction', id('swi'), num('workInstruction', 1 + idx * 2), {
      approvalId, siteId, sampleLocationId: sls[0], title: 'Composite sampling at the final discharge pit', instructionType: 'Sampling',
      instructions: 'Install the auto-sampler at the discharge pit before 7am. Collect a 24h flow-weighted composite. Record the TW effluent meter start and end readings on the Sampling Event Meter.', status: 'Active'
    })
    if (multi || activity !== 'Food Services') {
      add('workInstruction', id('swi'), num('workInstruction', 2 + idx * 2), {
        approvalId, siteId, sampleLocationId: null, title: 'Site access and safety', instructionType: 'Site Access',
        instructions: multi ? 'Report to centre management before accessing the loading dock. Sample pits are in the basement car park.' : 'Sign in at the site office; hi-vis and steel caps required. Confined space entry is not permitted.', status: 'Active'
      })
    }
    const evN = kca ? 8 : 4
    for (let e = evN; e >= -1; e--) {
      const scheduledDate = addDays(addMonths(anchor, -3 * e), -r.int(15, 40))
      const future = scheduledDate > today
      const collectedOnly = e === 0 && !future && idx % 9 === 0
      const st = future ? 'Scheduled' : collectedOnly ? 'Sample Collected' : 'Received'
      const evId = id('se')
      const evNo = num('samplingEvent', 6000 + idx * 12 + (evN - e + 1))
      const start = r.int(20000, 90000)
      const vol = r.num(activity === 'Food Services' ? 4 : 15, activity === 'Food Services' ? 20 : 300, 1)
      add('samplingEvent', evId, evNo, {
        approvalId, eventType: e === evN && r.chance(0.3) ? 'TW - Compliance' : 'TW - Routine', status: st, scheduledDate, sampleDate: future ? null : scheduledDate,
        collector: future ? null : r.pick(['Field Services – J. Carter', 'Field Services – M. Ruiz', 'ALS Field Team']), limsId: future ? null : `LIMS-${2000000 + idx * 20 + e + 5}`,
        labName: 'SAS Labs', volumeKl: future ? null : vol,
        massLoadCalculated: st === 'Received', massLoadAt: st === 'Received' ? `${addDays(scheduledDate, 9)}T10:00:00.000Z` : null, ownerId,
        createdAt: `${addDays(scheduledDate, -20)}T08:00:00.000Z`
      })
      if (future) continue
      // 24h discharge: one Sampling Event Meter at the billing sample location.
      const twMeter = meterIds.find((m) => m.kind === 'TW Effluent') || meterIds[0]
      add('eventMeter', id('sem'), num('eventMeter', 1 + idx * 12 + (evN - e + 1)), {
        samplingEventId: evId, sampleLocationId: sls[0], meterId: twMeter?.id ?? null, approvalId, pitReference: `W/${r.int(10000000, 10999999)}`,
        serialNo: twMeter?.serialNo ?? null, meterUsage: 'TW_Effluent', startReading: start, endReading: Math.round((start + vol) * 10) / 10, volumeKl: vol
      })
      let ncRaised = false
      sls.forEach((slId, k) => {
        if (k > 0 && !r.chance(0.4)) return
        const sleId = id('sle')
        add('sampleLocationEvent', sleId, num('sampleLocationEvent', 5000 + idx * 12 * 3 + (evN - e + 1) * 3 + k), {
          samplingEventId: evId, sampleLocationId: slId, approvalId, excludedFromBilling: false, exclusionReason: null
        })
        const saId = id('sa')
        const method = k === 0 ? 'Composite' : 'Grab'
        add('sample', saId, num('sample', 40000 + idx * 40 + (evN - e + 1) * 3 + k), {
          sampleLocationEventId: sleId, samplingEventId: evId, sampleLocationId: slId, approvalId, method, sampleType: 'Aqueous', collectedAt: `${scheduledDate}T07:30:00.000Z`,
          limsSampleId: `LIMS-${2000000 + idx * 20 + e + 5}-${k + 1}`, status: collectedOnly ? 'Pending' : 'Received'
        })
        if (collectedOnly) return
        for (const [pid, code, paramName, unit, , defaultLimit] of params) {
          const typical = TYPICAL_VALUES[code]
          const exceed = r.chance(0.006)
          const value = typical !== undefined ? r.num(typical * 0.9, typical * 1.1, 1) : exceed ? r.num(defaultLimit * 1.05, defaultLimit * 1.6, 1) : r.num(defaultLimit * 0.08, defaultLimit * 0.75, defaultLimit < 10 ? 2 : 1)
          add('sampleResult', id('rs'), paramName, {
            sampleId: saId, samplingEventId: evId, approvalId, parameterId: pid, parameterName: paramName, value, unit, limit: defaultLimit, lowerLimit: null, ncTolerance: 10,
            exceeded: value > defaultLimit * 1.1, resultSource: 'SAS (Integration)', massLoadKg: method === 'Composite' && unit === 'mg/L' ? Math.round(value * vol) / 1000 : null
          })
          if (value > defaultLimit * 1.1 && k === 0 && !ncRaised) {
            ncRaised = true
            const open = e <= 1
            add('case', id('cs'), num('case', 52000 + idx * 12 + (evN - e + 1)), {
              caseType: 'Non-Compliance', subject: `Quality Violation – ${evNo} – ${tradingName}`, status: open ? r.pick(['In Progress', 'Awaiting Response']) : 'Closed', priority: 'High',
              approvalId, samplingEventId: evId, nonComplianceType: 'Quality Violation', reportedBy: 'Laboratory', incidentDate: scheduledDate,
              description: `${paramName}: ${value} ${unit} (limit ${defaultLimit})`, cause: open ? null : r.pick(['Poor maintenance', 'Process change', 'Overloading']),
              outcome: open ? null : 'Follow-up sample within limits', preventativeAction: open ? null : 'Increased pump-out frequency', correctiveAction: open ? null : 'Pre-treatment serviced',
              resolutionDate: open ? null : addDays(scheduledDate, 45), ownerId, createdAt: `${addDays(scheduledDate, 10)}T09:00:00.000Z`
            })
          }
        }
      })
    }
  }

  // Pump-out overdue from WasteID service history.
  ptsIds.forEach(({ id: pid, d, occId }, k) => {
    if (!d.ls || !d.fw || d.st === 'Inactive' || status !== 'Active') return
    const due = addDays(d.ls.slice(0, 10), d.fw * 7)
    if (due >= today || !r.chance(0.5)) return
    add('case', id('cs'), num('case', 52000 + idx * 12 + 10 + k % 2), {
      caseType: 'Non-Compliance', subject: `Pump-out overdue – ${d.ref} – ${tradingName}`, status: r.chance(0.4) ? 'New' : 'In Progress', priority: 'Normal',
      approvalId, occupierId: occId, ptsId: pid, nonComplianceType: 'Pump-out Overdue', reportedBy: 'WasteID', incidentDate: due,
      description: `WasteID shows the last pump-out on ${d.ls.slice(0, 10)}; the ${d.fw}-week frequency was due on ${due}.`,
      ownerId: r.chance(0.3) ? null : ownerId, createdAt: `${addDays(due, 3)}T06:00:00.000Z`
    })
  })

  if (r.chance(0.12)) {
    add('case', id('cs'), num('case', 52000 + idx * 12 + 11), {
      caseType: r.pick(['Customer Enquiry', 'Web Enquiry']), subject: r.pick(['Change of business owner', 'Request copy of approval', 'Query about trade waste charges', 'New kitchen fit-out enquiry', 'Grease arrestor sizing question']),
      status: r.pick(['New', 'In Progress', 'Closed']), priority: 'Normal', approvalId, billingAccountId: accountId, address,
      description: 'Customer called the contact centre; please follow up.', ownerId: r.chance(0.4) ? null : ownerId, createdAt: `${addDays(today, -r.int(1, 30))}T01:00:00.000Z`
    })
  }

  if (status === 'Active' && r.chance(0.3)) {
    const type = activity === 'Food Services' ? 'Food Services' : activity === 'Light Industrial' ? 'Light Industrial' : 'Industrial Compliance'
    const done = r.chance(0.6)
    const sched = addDays(today, done ? -r.int(10, 200) : r.int(1, 60))
    add('inspection', id('in'), num('inspection', 20000 + idx * 2), {
      approvalId, siteId, ptsId: ptsIds[0]?.id ?? null, inspectionType: type, status: done ? 'Completed' : 'Scheduled', scheduledDate: sched, inspectionDate: done ? sched : null,
      result: done ? r.pick(['Compliant', 'Compliant', 'Minor non-compliance']) : null, ptsMaintained: done ? true : null, recordsAvailable: done ? r.chance(0.85) : null, signageOk: done ? true : null,
      lastPumpOut: ptsIds[0]?.d.ls?.slice(0, 10) || null, nonComplianceItems: [], observations: done ? 'Arrestor in good condition; dockets sighted.' : null, ownerId
    })
  }

  if (r.chance(0.07)) {
    const occ = locs[0]
    add('planAssessment', id('pa'), num('planAssessment', 3000 + idx), {
      approvalId, siteId, assessmentType: r.pick(['Alteration', 'Change of Occupier', 'New Approval']), status: r.pick(['New', 'In Progress', 'Awaiting Information']),
      receivedDate: addDays(today, -r.int(2, 40)), consultant: 'Hydraulic Design Partners', planRef: `HP-${r.int(1000, 9999)}`,
      cuisine: CUISINE(occ.name), seats: r.int(20, 120), mealsPerDay: r.int(80, 600), proposedPtsType: 'Grease Arrestor', proposedCapacity: r.pick([1000, 1500, 2000, 3000]),
      ownerId: r.chance(0.5) ? null : ownerId
    })
  }

  if (r.chance(0.2)) {
    add('task', id('tk'), 'Follow-up', {
      subject: r.pick(['Call customer re pump-out dockets', 'Review hydraulic plan', 'Confirm new occupier details', 'Chase overdue lab results', 'Send approval renewal letter', 'Book site inspection']),
      taskType: r.pick(['Call', 'Follow-up', 'To Do', 'Email']), status: r.pick(['Not Started', 'In Progress', 'Waiting on someone else', 'Completed']),
      priority: r.pick(['Normal', 'Normal', 'High']), dueDate: addDays(today, r.int(-5, 20)), relatedTo: { object: 'approval', id: approvalId }, ownerId: r.chance(0.3) ? null : ownerId
    })
  }

  if (enrolled) {
    for (let q = 2; q >= 1; q--) {
      const periodEnd = addDays(addMonths(nextBill, -3 * q), -1)
      const periodStart = addMonths(nextBill, -3 * (q + 1))
      if (periodEnd > today) continue
      const amount = sampled ? r.num(400, 9000, 2) : r.num(120, 1400, 2)
      add('invoice', id('iv'), num('invoice', 70000 + idx * 4 + q), {
        approvalId, invoiceType: 'Trade Waste Quality', status: 'Queued for Billing', periodStart, periodEnd, amount,
        gst: Math.round(amount * 10) / 100, total: Math.round(amount * 110) / 100, accountCode: 'TW-QUALITY'
      })
    }
  }
}

export async function seedFinish(db) {
  const rec = (row) => ({ ...row, data: row.data })
  const maxRows = await db.select({ object: s.records.object, name: sql`max(${s.records.name})` }).from(s.records).groupBy(s.records.object)
  const max = {}
  for (const { object, name } of maxRows) {
    const def = OBJECTS[object]
    if (def?.prefix && name?.startsWith(def.prefix)) max[object] = +name.slice(def.prefix.length)
  }
  const active = (await db.select().from(s.records).where(sql`${s.records.object} = 'approval' and ${s.records.status} = 'Active'`).orderBy(s.records.name).limit(60)).map(rec)
  const invoices = (await db.select().from(s.records).where(sql`${s.records.object} = 'invoice'`).orderBy(sql`json_extract(${s.records.data}, '$.periodEnd') desc`).limit(2)).map(rec)
  const { rows, add } = sink('System')
  const today = TODAY()
  const pick = (k) => active[(k * 7) % active.length]
  let wi = 0
  const work = (itemType, a, summary, submittedBy, extra = {}) => add('workItem', `wi_${wi + 1}`, num('workItem', ++wi), {
    itemType, status: 'Pending', approvalId: a?.id ?? null, summary, submittedBy, submittedAt: `${addDays(today, -wi)}T02:00:00.000Z`, payload: extra.payload || {}, ...extra.fields
  })
  const [c1, c2, c3] = [pick(1), pick(4), pick(6)]
  work('Cancel Approval', c1, `Cancel ${c1.name} (${c1.data.tradingName}): business closed, premises vacant`, 'U003', { payload: { reason: 'Business closed' } })
  work('Inspection Frequency Change', c2, `Performance Review (months): ${c2.data.freqPerformanceReview ?? '—'} → 6`, 'U004', { payload: { patch: { freqPerformanceReview: 6 } } })
  work('Cancel Approval', c3, `Cancel ${c3.name} (${c3.data.tradingName}): duplicate approval`, 'U001', { payload: { reason: 'Duplicate approval' } })
  for (const inv of invoices) {
    work('Invoice Endorsement', { id: inv.data.approvalId }, `Endorse ${inv.name} – $${inv.data.total} (${inv.data.periodStart} to ${inv.data.periodEnd})`, 'U003', { fields: { invoiceId: inv.id } })
  }
  const tasks = [
    ['Review Approval Work Items before Friday', 'U001'], ['Prepare quarterly billing run', 'U001'], ['Call Banksia Diner about new fit-out', 'U003'],
    ['Upload lab file for SAS batch 4471', 'U003'], ['Check WasteID pump-out alerts', 'U004'], ['Update catchment for Bundamba approvals', null], ['Respond to web enquiry backlog', null]
  ]
  tasks.forEach(([subject, ownerId], k) => add('task', `tk_fin_${k}`, subject, {
    subject, taskType: 'To Do', status: k % 3 === 0 ? 'In Progress' : 'Not Started', priority: k < 2 ? 'High' : 'Normal', dueDate: addDays(today, k - 1),
    reminderAt: k < 3 ? `${addDays(today, k)}T23:00:00.000Z` : null, relatedTo: null, ownerId
  }))
  await flush(db, rows)
  const stmts = invoices.map((inv) => db.update(s.records).set({ status: 'Pending Endorsement', data: { ...inv.data, status: 'Pending Endorsement' } }).where(eq(s.records.id, inv.id)))
  max.workItem = wi
  for (const [object, n] of Object.entries(max)) stmts.push(db.insert(s.counters).values({ object, n }))
  await db.batch(stmts)
  const [{ n }] = await db.select({ n: sql`count(*)` }).from(s.records)
  return { records: n }
}
