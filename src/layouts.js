// Lightning-style page layouts: tabs, related lists and actions per object.
const rel = (object, field, title, extra = {}) => ({ object, field, title, ...extra })

export const NAV = [
  { key: 'home', label: 'Home', to: '/home' },
  { key: 'approval', label: 'Approvals' },
  { key: 'pts', label: 'Pre-Treatment Systems' },
  { key: 'case', label: 'UF Cases' },
  { key: 'task', label: 'Tasks' },
  { key: 'planAssessment', label: 'UF Plan Assessments' },
  { key: 'inspection', label: 'Inspections' },
  { key: 'billingRun', label: 'UF Billing' },
  { key: 'workItem', label: 'Approval Work Items' }
]
export const MORE_NAV = ['billingAccount', 'site', 'occupier', 'samplingEvent', 'invoice', 'meter']
export const SETUP = ['testParameter', 'catchment', 'pumpStation', 'condition']

export const GLOBAL_ACTIONS = [
  { object: 'approval', label: 'New Approval' },
  { object: 'case', label: 'New Case' },
  { object: 'case', label: 'New Non-Compliance', defaults: { caseType: 'Non-Compliance' } },
  { object: 'task', label: 'New Task' },
  { object: 'planAssessment', label: 'New Plan Assessment' },
  { object: 'billingAccount', label: 'New Billing Account' }
]

export const LAYOUTS = {
  approval: {
    tabs: [
      { key: 'details', label: 'Approval Details' },
      { key: 'contacts', label: 'Contacts', related: [rel('contact', 'approvalId', 'Approval Contacts', { sort: 'order' })] },
      { key: 'sites', label: 'Sites & Pre-Treatment', component: 'ApprovalSites' },
      { key: 'discharge', label: 'Discharge Volume', component: 'DischargeVolume' },
      { key: 'monitoring', label: 'Monitoring', component: 'Monitoring' },
      { key: 'invoices', label: 'Invoices', related: [rel('invoice', 'approvalId', 'UF Invoices', { sort: '-periodEnd' }), rel('billingCalc', 'approvalId', 'Billing Calculations', { sort: '-periodEnd' })] },
      { key: 'noncompliance', label: 'Non-Compliance', component: 'NonCompliance' },
      {
        key: 'related', label: 'Related', related: [
          rel('case', 'approvalId', 'Cases', { sort: '-createdAt' }), rel('planAssessment', 'approvalId', 'Plan Assessments'), rel('inspection', 'approvalId', 'Inspections', { sort: '-scheduledDate' }),
          rel('approvalCondition', 'approvalId', 'Approval Conditions'), rel('workItem', 'approvalId', 'Approval Work Items', { readonly: true }), rel('approval', 'linkedApprovalId', 'Linked Approvals'),
          rel('task', 'relatedTo.id', 'Tasks', { poly: true })
        ]
      },
      { key: 'history', label: 'History' }
    ],
    actions: ['cancelApproval', 'changeFrequencies', 'setDefaultParameters', 'addCondition', 'newNonCompliance', 'newTask'],
    activity: true, files: true
  },
  site: { tabs: [{ key: 'details', label: 'Details' }, { key: 'occupiers', label: 'Occupiers', related: [rel('occupier', 'siteId', 'Occupiers'), rel('pts', 'siteId', 'Pre-Treatment Systems')] }, { key: 'samples', label: 'Sample Locations', related: [rel('sampleLocation', 'siteId', 'Sample Locations')] }, { key: 'instructions', label: 'Work Instructions', related: [rel('workInstruction', 'siteId', 'Sampling Work Instructions')] }, { key: 'history', label: 'History' }] },
  occupier: { tabs: [{ key: 'details', label: 'Details' }, { key: 'pts', label: 'Pre-Treatment', related: [rel('pts', 'occupierId', 'Occupier Pre-Treatment'), rel('fixture', 'occupierId', 'Occupier Fixtures')] }, { key: 'cases', label: 'Cases', related: [rel('case', 'occupierId', 'Cases')] }, { key: 'history', label: 'History' }] },
  pts: { tabs: [{ key: 'details', label: 'Details' }, { key: 'cases', label: 'Cases', related: [rel('case', 'ptsId', 'Pre-Treatment Cases'), rel('inspection', 'ptsId', 'Inspections'), rel('fixture', 'ptsId', 'Connected Fixtures')] }, { key: 'history', label: 'History' }], side: 'WasteIdCard', actions: ['newNonCompliance'] },
  meter: { tabs: [{ key: 'details', label: 'Details' }, { key: 'readings', label: 'Readings', related: [rel('meterReading', 'meterId', 'Meter Readings', { sort: '-readingDate' })] }, { key: 'history', label: 'History' }] },
  alternateSupply: { tabs: [{ key: 'details', label: 'Details' }, { key: 'meters', label: 'Meters', related: [rel('meter', 'alternateSupplyId', 'Alternate Supply Meters')] }, { key: 'history', label: 'History' }] },
  sampleLocation: { tabs: [{ key: 'details', label: 'Details' }, { key: 'samples', label: 'Samples', related: [rel('sample', 'sampleLocationId', 'Samples', { sort: '-collectedAt' })] }, { key: 'history', label: 'History' }], files: true },
  samplingEvent: {
    tabs: [
      { key: 'details', label: 'Details' }, { key: 'samples', label: 'Sample Location Events', component: 'SamplingResults' },
      { key: 'meters', label: 'Sampling Meters', related: [rel('eventMeter', 'samplingEventId', 'Sampling Event Meters')] },
      { key: 'cases', label: 'Cases', related: [rel('case', 'samplingEventId', 'Non-Compliance Cases')] }, { key: 'history', label: 'History' }
    ],
    actions: ['limsResults', 'massLoad'], files: true
  },
  sampleLocationEvent: { tabs: [{ key: 'details', label: 'Details' }, { key: 'samples', label: 'Samples', related: [rel('sample', 'sampleLocationEventId', 'Samples')] }, { key: 'history', label: 'History' }] },
  eventMeter: { tabs: [{ key: 'details', label: 'Details' }, { key: 'history', label: 'History' }] },
  workInstruction: { tabs: [{ key: 'details', label: 'Details' }, { key: 'history', label: 'History' }], files: true
  },
  sample: { tabs: [{ key: 'details', label: 'Details' }, { key: 'results', label: 'Results', related: [rel('sampleResult', 'sampleId', 'Sample Parameters')] }, { key: 'history', label: 'History' }] },
  case: { tabs: [{ key: 'details', label: 'Details' }, { key: 'related', label: 'Related', related: [rel('case', 'parentCaseId', 'Related Cases'), rel('task', 'relatedTo.id', 'Tasks', { poly: true })] }, { key: 'history', label: 'History' }], activity: true, files: true, notes: true },
  task: { tabs: [{ key: 'details', label: 'Details' }, { key: 'history', label: 'History' }], actions: ['completeTask', 'followUp'] },
  planAssessment: { tabs: [{ key: 'details', label: 'Details' }, { key: 'fixtures', label: 'Fixtures & Sizing', component: 'PlanSizing' }, { key: 'history', label: 'History' }], activity: true, files: true, notes: true },
  inspection: { tabs: [{ key: 'details', label: 'Details' }, { key: 'cases', label: 'Cases', related: [rel('case', 'inspectionId', 'Inspection Cases')] }, { key: 'history', label: 'History' }], actions: ['newNonCompliance'], files: true, notes: true },
  workItem: { tabs: [{ key: 'details', label: 'Details' }, { key: 'history', label: 'History' }], side: 'WorkItemDecision', noEdit: true },
  billingRun: { tabs: [{ key: 'run', label: 'Run', component: 'BillingRunPanel' }, { key: 'details', label: 'Details' }, { key: 'calcs', label: 'Billing Calculations', related: [rel('billingCalc', 'billingRunId', 'Billing Calculations')] }, { key: 'invoices', label: 'Invoices', related: [rel('invoice', 'billingRunId', 'Billing Run Invoices')] }, { key: 'history', label: 'History' }] },
  billingCalc: { tabs: [{ key: 'breakdown', label: 'Calculation', component: 'CalcBreakdown' }, { key: 'details', label: 'Details' }, { key: 'history', label: 'History' }], noEdit: true },
  invoice: { tabs: [{ key: 'details', label: 'Details' }, { key: 'history', label: 'History' }], actions: ['endorseInvoice'] },
  billingAccount: { tabs: [{ key: 'details', label: 'Details' }, { key: 'approvals', label: 'Approvals', related: [rel('approval', 'billingAccountId', 'Approvals'), rel('case', 'billingAccountId', 'Cases')] }, { key: 'history', label: 'History' }] },
  testParameter: { tabs: [{ key: 'details', label: 'Details' }, { key: 'history', label: 'History' }] },
  catchment: { tabs: [{ key: 'details', label: 'Details' }, { key: 'related', label: 'Related', related: [rel('pumpStation', 'catchmentId', 'Pump Stations'), rel('approval', 'catchmentId', 'Approvals')] }, { key: 'history', label: 'History' }] },
  pumpStation: { tabs: [{ key: 'details', label: 'Details' }, { key: 'approvals', label: 'Approvals', related: [rel('approval', 'pumpStationId', 'Pump Station Approvals')] }, { key: 'history', label: 'History' }] },
  condition: { tabs: [{ key: 'details', label: 'Details' }, { key: 'approvals', label: 'Approvals', related: [rel('approvalCondition', 'conditionId', 'Condition Approvals')] }, { key: 'history', label: 'History' }] }
}

export const layoutOf = (object) => LAYOUTS[object] || { tabs: [{ key: 'details', label: 'Details' }, { key: 'history', label: 'History' }] }
