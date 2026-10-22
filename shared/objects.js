// Object metadata shared by server and client: fields, layouts, list columns.
const opt = (...xs) => xs

export const PICKLISTS = {
  approvalStatus: opt('New', 'In Progress', 'Awaiting Information', 'Active', 'Suspended', 'Cancelled'),
  approvalType: opt('Trade Waste Approval', 'Special Disposal'),
  sewerType: opt('Gravity', 'Pressure', 'Rising Main'),
  billingCategory: opt('1', '2', '3', '4', '5'),
  twCategory: opt('A', 'B', 'C', 'D', 'E'),
  dischargeHours: opt('24 hours', 'Business hours (7am–7pm)', 'Conditional window', 'Batch release only'),
  metals: opt('Arsenic', 'Cadmium', 'Chromium', 'Copper', 'Lead', 'Mercury', 'Nickel', 'Zinc'),
  otherContaminants: opt('Fats, oils & grease', 'Hydrocarbons', 'Solvents', 'pH', 'Temperature', 'Detergents', 'Suspended solids'),
  siteType: opt('Restaurant', 'Café', 'Bakery', 'Hotel', 'Shopping Centre', 'Small Shopping Complex', 'Food Court', 'Food & Beverage Manufacturing', 'Club / Tavern', 'Industrial Premises', 'Workshop', 'Hospital', 'School'),
  activityType: opt('Food Services', 'General Trade Waste', 'Light Industrial', 'Industrial Compliance'),
  ptsType: opt('Grease Arrestor', 'DAF System', 'Oil/Water Separator', 'Coalescing Plate Separator', 'Silt Arrestor', 'Acid Neutraliser', 'pH Correction', 'Holding Tank', 'Sedimentation Tank', 'Lint Arrestor', 'Plaster Trap', 'Cooling Pit', 'Diversion Valve'),
  ptsStatus: opt('Active', 'In Plan Assessment', 'Decommissioned'),
  fixtureType: opt('Sink', 'Pot sink', 'Hand basin', 'Dishwasher', 'Glass washer', 'Wok burner', 'Combi oven', 'Floor waste', 'Potato peeler', 'Rice washer'),
  contactType: opt('Company', 'Individual', 'Hydraulic Consultant'),
  contactRole: opt('Primary', 'Billing', 'Site', 'After hours', 'Consultant'),
  meterKind: opt('Head Meter', 'TW Effluent'),
  meterUsage: opt('TW_Effluent', 'Head_Meter', 'Alt_Supply'),
  sampleType: opt('Aqueous', 'Sludge', 'Solid'),
  resultSource: opt('SAS (Integration)', 'Manual', 'Lab Upload'),
  instructionType: opt('Sampling', 'Site Access', 'Safety', 'Meter Reading'),
  meterSource: opt('HiAffinity', 'Manual'),
  activeInactive: opt('Active', 'Inactive'),
  supplyType: opt('Rainwater tank', 'Bore', 'Recycled water', 'Water carter'),
  sampleMethod: opt('Composite', 'Grab'),
  eventType: opt('TW - Routine', 'TW - Compliance', 'TW - Investigation', 'Self Monitoring'),
  eventStatus: opt('Scheduled', 'Sample Collected', 'Received', 'Cancelled'),
  sampleStatus: opt('Pending', 'Received'),
  paramGroup: opt('Billing', 'Inorganic', 'Nutrient', 'Metal', 'Organic', 'Physical'),
  caseType: opt('Customer Enquiry', 'Web Enquiry', 'Non-Compliance'),
  caseStatus: opt('New', 'In Progress', 'Awaiting Response', 'Closed'),
  priority: opt('Low', 'Normal', 'High'),
  nonComplianceType: opt('Quality Violation', 'Daily Mass Load', 'Failure to Notify', 'TW Meter Not Showing', 'Pre-treatment Not Maintained', 'Pump-out Overdue', 'Unapproved Discharge', 'Other'),
  reportedBy: opt('UU Internal', 'Customer', 'Laboratory', 'WasteID', 'Council', 'Public'),
  cause: opt('Equipment failure', 'Poor maintenance', 'Process change', 'Operator error', 'Overloading', 'Unknown'),
  taskStatus: opt('Not Started', 'In Progress', 'Waiting on someone else', 'Completed'),
  taskType: opt('To Do', 'Call', 'Email', 'Follow-up', 'Site visit'),
  paStatus: opt('New', 'In Progress', 'Awaiting Information', 'Completed'),
  paType: opt('New Approval', 'Alteration', 'Change of Occupier'),
  paOutcome: opt('Approved', 'Approved with conditions', 'Not approved'),
  cuisine: opt('Asian', 'Fast food', 'Café', 'Bakery', 'Seafood', 'Pizza', 'Steak / grill', 'Mixed'),
  workItemType: opt('Cancel Approval', 'Invoice Endorsement', 'Hydraulic Variation', 'Inspection Frequency Change'),
  workItemStatus: opt('Pending', 'Approved', 'Rejected'),
  runStatus: opt('Draft', 'Running', 'Completed'),
  invoiceStatus: opt('Draft', 'Pending Endorsement', 'Approved', 'Queued for Billing'),
  invoiceType: opt('Trade Waste Quality', 'Special Disposal'),
  inspectionType: opt('Approval Review', 'Food Services', 'General TW', 'Industrial Compliance', 'Light Industrial', 'Performance Review', 'Self-Monitoring Plan Check'),
  inspectionStatus: opt('Scheduled', 'In Progress', 'Completed', 'Cancelled'),
  inspectionResult: opt('Compliant', 'Minor non-compliance', 'Major non-compliance'),
  accountStatus: opt('Active', 'Ended'),
  conditionCategory: opt('General', 'Pre-treatment', 'Monitoring', 'Discharge limits', 'Records')
}

const f = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra })
const pick = (key, label, list, extra = {}) => f(key, label, 'picklist', { options: list, ...extra })
const look = (key, label, ref, extra = {}) => f(key, label, 'lookup', { ref, ...extra })
const ro = { readonly: true }

export const OBJECTS = {
  billingAccount: {
    label: 'Billing Account', plural: 'Billing Accounts', icon: 'Wallet', color: '#3c97dd', nameFrom: 'accountNo',
    fields: [
      f('accountNo', 'Account Number', 'text', { required: true }), f('holder', 'Account Holder', 'text', { required: true }),
      f('propertyAddress', 'Property Address'), f('suburb', 'Suburb'), f('postcode', 'Postcode'),
      f('sewageDischargeFactor', 'Sewage Discharge Factor', 'number', { help: 'From HiAffinity; share of inflow that reaches sewer' }),
      pick('status', 'Status', PICKLISTS.accountStatus, { default: 'Active' }), f('endDate', 'End Date', 'date')
    ],
    list: ['name', 'holder', 'propertyAddress', 'suburb', 'status'], search: ['holder', 'propertyAddress'], path: null
  },

  approval: {
    label: 'Approval', plural: 'Approvals', icon: 'Stamp', color: '#04844b', prefix: 'TWA-', digits: 5, start: 11000, owner: true,
    fields: [
      pick('type', 'Approval Type', PICKLISTS.approvalType, { default: 'Trade Waste Approval', required: true }),
      pick('status', 'Status', PICKLISTS.approvalStatus, { default: 'In Progress', required: true }),
      f('tradingName', 'Trading Name', 'text', { required: true }),
      look('billingAccountId', 'Billing Account', 'billingAccount'), f('propertyAddress', 'Property Address'),
      look('catchmentId', 'Catchment', 'catchment'), pick('sewerType', 'Sewer Type', PICKLISTS.sewerType),
      pick('billingCategory', 'Billing Category', PICKLISTS.billingCategory, { help: 'HiAffinity billing category code (1–5)' }), pick('twCategory', 'Trade Waste Category', PICKLISTS.twCategory),
      look('linkedApprovalId', 'Linked Approval', 'approval'), look('pumpStationId', 'Sewage Pump Station', 'pumpStation'),
      f('kca', 'Key Corporate Account', 'checkbox'),
      f('applicationReceivedDate', 'Application Received', 'date', { defaultToday: true }), f('issueDate', 'Issue Date', 'date'),
      f('cancelledDate', 'Cancelled Date', 'date'), f('reissueDate', 'Re-Issue Date', 'date'),
      f('maxDailyVolume', 'Max TW Discharge Volume (kL/day)', 'number'), pick('dischargeHours', 'Discharge Hours', PICKLISTS.dischargeHours),
      f('employees', 'Number of Employees', 'number'), f('maxFlowRate', 'Max Discharge Flow Rate (L/s)', 'number'),
      f('metals', 'Contaminants of Concern – Metals', 'multipicklist', { options: PICKLISTS.metals }),
      f('otherContaminants', 'Contaminants of Concern – Other', 'multipicklist', { options: PICKLISTS.otherContaminants }),
      f('showeringEmployees', 'Number of Showering Employees', 'number'), f('workingDays', 'Working Days / Week', 'number'),
      f('tradeWasteFraction', 'Trade Waste Fraction', 'percent'),
      f('enrolledForBilling', 'Enrolled for Billing', 'checkbox', { ...ro, help: 'Ticked automatically when Active and employees, showering employees, working days and trade waste fraction are filled' }),
      f('billingFrequency', 'Billing Frequency', 'text', { ...ro, default: 'Quarterly' }),
      f('billingStartDate', 'Billing Start Date', 'date', ro), f('lastBillingDate', 'Last Billing Date', 'date', ro), f('nextBillingDate', 'Next Billing Date', 'date', ro),
      f('isDeemedQuality', 'Is Deemed Quality', 'checkbox'),
      f('deemedBod', 'Deemed BOD (mg/L)', 'number', { default: 300 }), f('deemedN', 'Deemed Nitrogen (mg/L)', 'number', { default: 70 }),
      f('deemedP', 'Deemed Phosphorus (mg/L)', 'number', { default: 12 }), f('deemedSs', 'Deemed Suspended Solids (mg/L)', 'number', { default: 330 }),
      f('freqPerformanceReview', 'Performance Review (months)', 'number'), f('freqApprovalReview', 'Approval Review (months)', 'number'),
      f('freqSampling', 'Compliance Sampling (months)', 'number'),
      f('wasteidAgreementNo', 'WasteID Agreement No', 'text', { help: 'Matches the WasteID location agreement number' })
    ],
    sections: [
      { label: 'Information', fields: ['name', 'type', 'status', 'tradingName', 'billingAccountId', 'propertyAddress', 'catchmentId', 'sewerType', 'billingCategory', 'twCategory', 'linkedApprovalId', 'pumpStationId', 'kca', 'ownerId', 'wasteidAgreementNo'] },
      { label: 'Approval Dates', fields: ['applicationReceivedDate', 'issueDate', 'cancelledDate', 'reissueDate'] },
      { label: 'Trade Waste Details', fields: ['maxDailyVolume', 'dischargeHours', 'employees', 'maxFlowRate', 'metals', 'otherContaminants', 'showeringEmployees', 'workingDays', 'tradeWasteFraction'] },
      { label: 'Billing Details', fields: ['enrolledForBilling', 'billingFrequency', 'billingStartDate', 'lastBillingDate', 'nextBillingDate'] },
      { label: 'Deemed Sampling Quality', fields: ['isDeemedQuality', 'deemedBod', 'deemedN', 'deemedP', 'deemedSs'] },
      { label: 'Inspection Frequencies', fields: ['freqPerformanceReview', 'freqApprovalReview', 'freqSampling'] }
    ],
    highlights: ['tradingName', 'status', 'billingAccountId', 'propertyAddress', 'billingCategory', 'ownerId'],
    list: ['name', 'tradingName', 'billingAccountId', 'propertyAddress', 'billingCategory', 'status', 'ownerId'],
    search: ['tradingName', 'propertyAddress', 'wasteidAgreementNo'], path: 'status'
  },

  contact: {
    label: 'Approval Contact', plural: 'Contacts', icon: 'User', color: '#a094ed', nameFrom: 'fullName', parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), f('order', 'No.', 'number'),
      pick('contactType', 'Contact Type', PICKLISTS.contactType, { default: 'Individual', required: true }), pick('role', 'Role', PICKLISTS.contactRole),
      f('fullName', 'Name', 'text', { required: true }), f('company', 'Company'), f('email', 'Email', 'email'), f('phone', 'Phone', 'phone'), f('mobile', 'Mobile', 'phone')
    ],
    list: ['order', 'name', 'contactType', 'role', 'company', 'email', 'phone']
  },

  site: {
    label: 'Site', plural: 'Sites', icon: 'OfficeBuilding', color: '#f88962', nameFrom: 'siteName', parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), f('siteName', 'Site Name', 'text', { required: true }),
      f('address', 'Address', 'address'), f('suburb', 'Suburb'), f('postcode', 'Postcode'),
      pick('siteType', 'Site Type', PICKLISTS.siteType), pick('activityType', 'Activity Type', PICKLISTS.activityType),
      pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' }),
      f('lat', 'Latitude', 'number'), f('lng', 'Longitude', 'number'), f('wasteidLocationId', 'WasteID Location', 'text')
    ],
    list: ['name', 'address', 'suburb', 'siteType', 'activityType', 'status']
  },

  occupier: {
    label: 'Occupier', plural: 'Occupiers', icon: 'Shop', color: '#e56798', nameFrom: 'businessName', parent: 'siteId',
    fields: [
      look('siteId', 'Site', 'site', { required: true }), look('approvalId', 'Approval', 'approval', ro),
      f('businessName', 'Business Name', 'text', { required: true }), f('abn', 'ABN'), f('shopNo', 'Shop / Unit'),
      pick('activityType', 'Activity Type', PICKLISTS.activityType), pick('cuisine', 'Cuisine', PICKLISTS.cuisine),
      f('contactName', 'Contact'), f('phone', 'Phone', 'phone'),
      f('moveInDate', 'Move-in Date', 'date'), f('moveOutDate', 'Move-out Date', 'date'),
      pick('status', 'Status', opt('Current', 'Moved Out'), { default: 'Current' })
    ],
    list: ['name', 'shopNo', 'activityType', 'moveInDate', 'status']
  },

  pts: {
    label: 'Pre-Treatment System', plural: 'Pre-Treatment Systems', icon: 'Filter', color: '#0eb58a', prefix: 'PTS-', digits: 6, start: 100000, parent: 'siteId',
    fields: [
      look('siteId', 'Site', 'site', { required: true }), look('occupierId', 'Occupier', 'occupier', { help: 'Leave blank for a shared, site-level system' }),
      look('approvalId', 'Approval', 'approval', ro),
      pick('ptsType', 'System Type', PICKLISTS.ptsType, { required: true }), f('flowCapacity', 'Flow Capacity (L/s)', 'number'), f('capacity', 'Volume Capacity (L)', 'number'),
      pick('status', 'Status', PICKLISTS.ptsStatus, { default: 'Active' }),
      f('psid', 'PSID (WasteID Device)', 'text', { help: 'WasteID device reference, e.g. DV0653331' }),
      f('locationDesc', 'Location on Site'), f('installDate', 'Install Date', 'date'),
      f('pumpOutWeeks', 'Pump-out Frequency (weeks)', 'number'), f('manufacturer', 'Make / Model')
    ],
    highlights: ['ptsType', 'capacity', 'flowCapacity', 'status', 'psid', 'siteId', 'occupierId'],
    list: ['name', 'ptsType', 'flowCapacity', 'capacity', 'psid', 'siteId', 'occupierId', 'status'], search: ['psid', 'locationDesc'], path: 'status'
  },

  fixture: {
    label: 'Fixture', plural: 'Fixtures', icon: 'Grid', color: '#7f8de1', nameFrom: 'fixtureType', parent: 'occupierId',
    fields: [
      look('occupierId', 'Occupier', 'occupier', { required: true }), look('approvalId', 'Approval', 'approval', ro),
      pick('fixtureType', 'Fixture Type', PICKLISTS.fixtureType, { required: true }), f('qty', 'Quantity', 'number', { default: 1 }),
      look('ptsId', 'Connected System', 'pts')
    ],
    list: ['fixtureType', 'qty', 'ptsId']
  },

  meter: {
    label: 'Meter', plural: 'Meters', icon: 'Odometer', color: '#3ba755', nameFrom: 'meterNo', parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), f('meterNo', 'Meter Number', 'text', { required: true }),
      pick('kind', 'Meter Type', PICKLISTS.meterKind, { required: true }), pick('source', 'Source', PICKLISTS.meterSource, { default: 'Manual' }),
      f('usedForBilling', 'Used for Billing', 'checkbox'), pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' }),
      look('alternateSupplyId', 'Alternate Supply', 'alternateSupply'), f('installDate', 'Install Date', 'date'), f('serialNo', 'Serial Number')
    ],
    list: ['name', 'kind', 'source', 'usedForBilling', 'status']
  },

  meterReading: {
    label: 'Meter Reading', plural: 'Meter Readings', icon: 'Histogram', color: '#3ba755', prefix: 'MR-', digits: 6, start: 1, parent: 'meterId',
    fields: [
      look('meterId', 'Meter', 'meter', { required: true }), look('approvalId', 'Approval', 'approval', ro),
      f('readingDate', 'Reading Date', 'date', { required: true, defaultToday: true }), f('reading', 'Reading (kL)', 'number', { required: true }),
      f('consumption', 'Consumption (kL)', 'number', ro), pick('readingType', 'Reading Type', opt('Actual', 'Estimated'), { default: 'Actual' })
    ],
    list: ['name', 'meterId', 'readingDate', 'reading', 'consumption', 'readingType']
  },

  alternateSupply: {
    label: 'Alternate Supply', plural: 'Alternate Supplies', icon: 'Pouring', color: '#54698d', prefix: 'ALT-', digits: 4, start: 1, parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), pick('supplyType', 'Supply Type', PICKLISTS.supplyType, { required: true }),
      f('description', 'Description', 'textarea'), pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' })
    ],
    list: ['name', 'supplyType', 'description', 'status']
  },

  sampleLocation: {
    label: 'Sample Location', plural: 'Sample Locations', icon: 'Location', color: '#ff9a3c', prefix: 'SL', digits: 3, start: 500, parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), look('siteId', 'Site', 'site'),
      f('description', 'Description', 'text', { required: true }), pick('method', 'Default Method', PICKLISTS.sampleMethod, { default: 'Composite' }),
      f('usedForBilling', 'Used for Billing', 'checkbox'), f('isDefault', 'Default Sample Location', 'checkbox', { help: 'Sampled at every event' }),
      pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' })
    ],
    list: ['name', 'description', 'method', 'usedForBilling', 'isDefault', 'status']
  },

  sampleParameter: {
    label: 'Sample Parameter', plural: 'Default Sample Parameters', icon: 'List', color: '#ff9a3c', nameFrom: 'parameterName', parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), look('parameterId', 'Test Parameter', 'testParameter', { required: true }),
      f('parameterName', 'Parameter', 'text', ro), f('limit', 'Upper Concentration', 'number'), f('lowerLimit', 'Lower Concentration', 'number'), f('ncTolerance', 'NC Tolerance (%)', 'number', { default: 10, help: 'Results within this percentage above the upper limit are not flagged' }), f('unit', 'Unit', 'text', ro),
      f('variation', 'Variation Applied', 'checkbox'), f('variationLimit', 'Variation Limit', 'number'), f('variationReason', 'Variation Reason')
    ],
    list: ['parameterId', 'limit', 'lowerLimit', 'ncTolerance', 'unit', 'variation', 'variationLimit']
  },

  workInstruction: {
    label: 'Sampling Work Instruction', plural: 'Sampling Work Instructions', icon: 'Notebook', color: '#ff9a3c', prefix: 'SWI-', digits: 5, start: 1, parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), look('siteId', 'Site', 'site'), look('sampleLocationId', 'Sample Location', 'sampleLocation'),
      f('title', 'Title', 'text', { required: true }), pick('instructionType', 'Type', PICKLISTS.instructionType, { default: 'Sampling' }),
      f('instructions', 'Instructions', 'textarea', { required: true }), pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' })
    ],
    list: ['name', 'title', 'instructionType', 'sampleLocationId', 'status']
  },

  samplingEvent: {
    label: 'Sampling Event', plural: 'Sampling Events', icon: 'Calendar', color: '#d4504c', prefix: 'SE-', digits: 5, start: 6000, parent: 'approvalId', owner: true,
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), pick('eventType', 'Event Type', PICKLISTS.eventType, { default: 'TW - Routine', required: true }),
      pick('status', 'Status', PICKLISTS.eventStatus, { default: 'Scheduled' }),
      f('scheduledDate', 'Scheduled Date', 'date', { required: true, defaultToday: true }), f('sampleDate', 'Sample Date', 'date'),
      f('collector', 'Sample Collector'), f('limsId', 'LIMS ID', 'text', ro), f('labName', 'Laboratory', 'text', { default: 'SAS Labs' }),
      f('volumeKl', '24h Discharge (kL)', 'number', { ...ro, help: 'Sum of the Sampling Event Meters' }),
      f('massLoadCalculated', 'Mass Load Calculated', 'checkbox', ro), f('massLoadAt', 'Mass Load Calculated At', 'datetime', ro),
      f('comments', 'Comments', 'textarea')
    ],
    sections: [
      { label: 'Event', fields: ['name', 'approvalId', 'eventType', 'status', 'scheduledDate', 'sampleDate', 'collector', 'ownerId'] },
      { label: 'Laboratory', fields: ['labName', 'limsId'] },
      { label: '24 Hour Discharge', fields: ['volumeKl', 'massLoadCalculated', 'massLoadAt'] },
      { label: 'Other', fields: ['comments'] }
    ],
    highlights: ['approvalId', 'eventType', 'status', 'sampleDate', 'limsId', 'volumeKl'],
    list: ['name', 'scheduledDate', 'eventType', 'sampleDate', 'collector', 'limsId', 'status'], path: 'status'
  },

  sampleLocationEvent: {
    label: 'Sample Location Event', plural: 'Sample Location Events', icon: 'Location', color: '#d4504c', prefix: 'SLE-', digits: 5, start: 5000, parent: 'samplingEventId',
    fields: [
      look('samplingEventId', 'Sampling Event', 'samplingEvent', { required: true }), look('sampleLocationId', 'Sample Location', 'sampleLocation', { required: true }),
      look('approvalId', 'Approval', 'approval', ro),
      f('excludedFromBilling', 'Excluded from Billing', 'checkbox', { help: 'Samples taken at this location in this event are ignored by the billing run' }),
      f('exclusionReason', 'Exclusion Reason'), f('comments', 'Comments', 'textarea')
    ],
    list: ['name', 'sampleLocationId', 'excludedFromBilling', 'exclusionReason']
  },

  eventMeter: {
    label: 'Sampling Event Meter', plural: 'Sampling Event Meters', icon: 'Odometer', color: '#d4504c', prefix: 'SEM-', digits: 5, start: 1, parent: 'samplingEventId',
    fields: [
      look('samplingEventId', 'Sampling Event', 'samplingEvent', { required: true }), look('sampleLocationId', 'Sample Location', 'sampleLocation'),
      look('meterId', 'Meter', 'meter'), look('approvalId', 'Approval', 'approval', ro),
      f('pitReference', 'Pit Reference'), f('serialNo', 'Serial Number'), pick('meterUsage', 'Meter Usage', PICKLISTS.meterUsage, { default: 'TW_Effluent' }),
      f('startReading', 'Start Meter Reading (kL)', 'number', { required: true }), f('endReading', 'End Meter Reading (kL)', 'number', { required: true }),
      f('volumeKl', 'Volume (kL)', 'number', ro)
    ],
    list: ['name', 'sampleLocationId', 'pitReference', 'serialNo', 'meterUsage', 'startReading', 'endReading', 'volumeKl']
  },

  sample: {
    label: 'Sample', plural: 'Samples', icon: 'Goblet', color: '#d4504c', prefix: 'SA-', digits: 6, start: 40000, parent: 'sampleLocationEventId',
    fields: [
      look('sampleLocationEventId', 'Sample Location Event', 'sampleLocationEvent', { required: true }),
      look('samplingEventId', 'Sampling Event', 'samplingEvent', ro), look('sampleLocationId', 'Sample Location', 'sampleLocation', ro),
      look('approvalId', 'Approval', 'approval', ro), pick('method', 'Sampling Method', PICKLISTS.sampleMethod, { default: 'Composite' }),
      pick('sampleType', 'Sample Type', PICKLISTS.sampleType, { default: 'Aqueous' }),
      f('collectedAt', 'Collected At', 'datetime'), f('limsSampleId', 'LIMS Sample ID', 'text', ro),
      pick('status', 'Status', PICKLISTS.sampleStatus, { default: 'Pending' })
    ],
    list: ['name', 'sampleLocationId', 'method', 'sampleType', 'limsSampleId', 'status']
  },

  sampleResult: {
    label: 'Sample Result', plural: 'Results', icon: 'DataLine', color: '#d4504c', nameFrom: 'parameterName', parent: 'sampleId',
    fields: [
      look('sampleId', 'Sample', 'sample', { required: true }), look('samplingEventId', 'Sampling Event', 'samplingEvent', ro), look('approvalId', 'Approval', 'approval', ro),
      look('parameterId', 'Test Parameter', 'testParameter', { required: true }), f('parameterName', 'Parameter', 'text', ro),
      f('value', 'Result', 'number', { required: true }), f('unit', 'Unit', 'text', ro),
      f('limit', 'Upper Concentration', 'number', ro), f('lowerLimit', 'Lower Concentration', 'number', ro), f('ncTolerance', 'NC Tolerance (%)', 'number', ro),
      f('exceeded', 'Exceeded', 'checkbox', ro), f('massLoadKg', 'Mass Load (kg)', 'number', ro),
      pick('resultSource', 'Result Source', PICKLISTS.resultSource, { default: 'Manual' })
    ],
    list: ['parameterId', 'value', 'unit', 'limit', 'exceeded', 'massLoadKg']
  },

  testParameter: {
    label: 'Test Parameter', plural: 'Test Parameters', icon: 'Collection', color: '#54698d', nameFrom: 'paramName', master: true,
    fields: [
      f('paramName', 'Parameter Name', 'text', { required: true }), f('code', 'Test Code', 'text', { required: true }),
      f('unit', 'Unit', 'text', { default: 'mg/L' }), pick('group', 'Group', PICKLISTS.paramGroup),
      f('defaultLimit', 'Default Acceptance Limit', 'number'), f('billable', 'Used in Billing', 'checkbox'),
      f('activityTypes', 'Default for Activity Types', 'multipicklist', { options: PICKLISTS.activityType }),
      pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' })
    ],
    list: ['name', 'code', 'unit', 'group', 'defaultLimit', 'billable', 'status']
  },

  catchment: {
    label: 'Catchment', plural: 'Catchments', icon: 'MapLocation', color: '#54698d', nameFrom: 'catchmentName', master: true,
    fields: [f('catchmentName', 'Catchment Name', 'text', { required: true }), f('treatmentPlant', 'Treatment Plant'), pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' })],
    list: ['name', 'treatmentPlant', 'status']
  },

  pumpStation: {
    label: 'Sewage Pump Station', plural: 'Pump Stations', icon: 'Connection', color: '#54698d', nameFrom: 'stationName', master: true,
    fields: [f('code', 'Code', 'text', { required: true }), f('stationName', 'Name', 'text', { required: true }), look('catchmentId', 'Catchment', 'catchment'), pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' })],
    list: ['code', 'name', 'catchmentId', 'status']
  },

  condition: {
    label: 'UF Condition', plural: 'Conditions', icon: 'Document', color: '#54698d', nameFrom: 'code', master: true,
    fields: [f('code', 'Code', 'text', { required: true }), pick('category', 'Category', PICKLISTS.conditionCategory), f('text', 'Condition Text', 'textarea', { required: true }), pick('status', 'Status', PICKLISTS.activeInactive, { default: 'Active' })],
    list: ['name', 'category', 'text', 'status']
  },

  approvalCondition: {
    label: 'Approval Condition', plural: 'Approval Conditions', icon: 'Document', color: '#54698d', nameFrom: 'code', parent: 'approvalId',
    fields: [look('approvalId', 'Approval', 'approval', { required: true }), look('conditionId', 'Condition', 'condition', { required: true }), f('code', 'Code', 'text', ro), f('text', 'Condition Text', 'textarea', ro), f('notes', 'Notes')],
    list: ['conditionId', 'text', 'notes']
  },

  case: {
    label: 'Case', plural: 'UF Cases', icon: 'Briefcase', color: '#f2cf5b', prefix: '000', digits: 5, start: 52000, owner: true, queue: true,
    fields: [
      pick('caseType', 'Case Type', PICKLISTS.caseType, { required: true, default: 'Customer Enquiry' }),
      f('subject', 'Subject', 'text', { required: true }), pick('status', 'Status', PICKLISTS.caseStatus, { default: 'New' }),
      pick('priority', 'Priority', PICKLISTS.priority, { default: 'Normal' }),
      f('address', 'Address', 'address'), look('approvalId', 'Related Approval', 'approval'), look('billingAccountId', 'Related Billing Account', 'billingAccount'),
      look('occupierId', 'Occupier', 'occupier'), look('ptsId', 'Pre-Treatment System', 'pts'), look('samplingEventId', 'Sampling Event', 'samplingEvent'),
      look('inspectionId', 'Inspection', 'inspection'), look('parentCaseId', 'Parent Case', 'case'),
      pick('nonComplianceType', 'Non-Compliance Type', PICKLISTS.nonComplianceType, { showIf: { caseType: 'Non-Compliance' } }),
      f('urgentFormal', 'Urgent Formal', 'checkbox', { showIf: { caseType: 'Non-Compliance' }, help: 'Part of formal compliance action' }),
      pick('reportedBy', 'Reported By', PICKLISTS.reportedBy, { default: 'UU Internal', showIf: { caseType: 'Non-Compliance' } }),
      pick('cause', 'Cause', PICKLISTS.cause, { showIf: { caseType: 'Non-Compliance' } }), f('urbanGrcRef', 'UrbanGRC Reference', 'text', { showIf: { caseType: 'Non-Compliance' } }),
      f('incidentDate', 'Date of Incident', 'date', { showIf: { caseType: 'Non-Compliance' } }),
      f('description', 'Details / Comments', 'textarea'),
      f('outcome', 'Outcome', 'textarea', { showIf: { caseType: 'Non-Compliance' } }), f('preventativeAction', 'Preventative Action', 'textarea', { showIf: { caseType: 'Non-Compliance' } }),
      f('correctiveAction', 'Corrective Action', 'textarea', { showIf: { caseType: 'Non-Compliance' } }),
      f('internalComments', 'Internal Comments', 'textarea'), f('resolutionDate', 'Resolution Date', 'date', ro)
    ],
    sections: [
      { label: 'Case Information', fields: ['name', 'caseType', 'subject', 'status', 'priority', 'ownerId', 'address', 'approvalId', 'billingAccountId', 'parentCaseId'] },
      { label: 'Non-Compliance', showIf: { caseType: 'Non-Compliance' }, fields: ['nonComplianceType', 'urgentFormal', 'occupierId', 'ptsId', 'samplingEventId', 'inspectionId', 'reportedBy', 'cause', 'urbanGrcRef', 'incidentDate'] },
      { label: 'Details', fields: ['description', 'internalComments'] },
      { label: 'Resolution', fields: ['outcome', 'preventativeAction', 'correctiveAction', 'resolutionDate'] }
    ],
    highlights: ['subject', 'caseType', 'status', 'priority', 'approvalId', 'ownerId'],
    list: ['name', 'subject', 'caseType', 'nonComplianceType', 'approvalId', 'status', 'priority', 'ownerId', 'createdAt'], search: ['subject', 'address'], path: 'status'
  },

  task: {
    label: 'Task', plural: 'Tasks', icon: 'Finished', color: '#4bc076', nameFrom: 'subject', owner: true, queue: true,
    fields: [
      f('subject', 'Subject', 'text', { required: true }), pick('taskType', 'Type', PICKLISTS.taskType, { default: 'To Do' }),
      pick('status', 'Status', PICKLISTS.taskStatus, { default: 'Not Started' }), pick('priority', 'Priority', PICKLISTS.priority, { default: 'Normal' }),
      f('dueDate', 'Due Date', 'date'), f('reminderAt', 'Reminder', 'datetime'),
      f('relatedTo', 'Related To', 'polylookup'), f('description', 'Comments', 'textarea')
    ],
    list: ['subject', 'taskType', 'relatedTo', 'dueDate', 'status', 'priority', 'ownerId'], search: ['subject'], path: 'status'
  },

  planAssessment: {
    label: 'Plan Assessment', plural: 'UF Plan Assessments', icon: 'Memo', color: '#8b46ff', prefix: 'PA-', digits: 5, start: 3000, owner: true, queue: true,
    fields: [
      look('approvalId', 'Approval', 'approval'), look('siteId', 'Site', 'site'), look('occupierId', 'Occupier', 'occupier'),
      pick('assessmentType', 'Assessment Type', PICKLISTS.paType, { default: 'New Approval', required: true }),
      pick('status', 'Status', PICKLISTS.paStatus, { default: 'New' }), f('receivedDate', 'Plan Received', 'date', { defaultToday: true }),
      f('consultant', 'Hydraulic Consultant'), f('planRef', 'Hydraulic Plan Reference'),
      pick('cuisine', 'Cuisine', PICKLISTS.cuisine), f('seats', 'Seats', 'number'), f('mealsPerDay', 'Meals per Day', 'number'),
      f('proposedPtsType', 'Proposed System', 'text', { default: 'Grease Arrestor' }), f('proposedCapacity', 'Proposed Capacity (L)', 'number'),
      f('recommendedCapacity', 'Recommended Capacity (L)', 'number', { ...ro, help: 'Placeholder rule until the official sizing method is supplied' }),
      pick('outcome', 'Outcome', PICKLISTS.paOutcome), f('assessmentNotes', 'Assessment Notes', 'textarea'), f('completedDate', 'Completed Date', 'date', ro)
    ],
    sections: [
      { label: 'Information', fields: ['name', 'assessmentType', 'status', 'ownerId', 'approvalId', 'siteId', 'occupierId', 'receivedDate', 'consultant', 'planRef'] },
      { label: 'Food Service Assessment', fields: ['cuisine', 'seats', 'mealsPerDay'] },
      { label: 'Pre-Treatment Assessment', fields: ['proposedPtsType', 'proposedCapacity', 'recommendedCapacity'] },
      { label: 'Outcome', fields: ['outcome', 'assessmentNotes', 'completedDate'] }
    ],
    highlights: ['assessmentType', 'status', 'approvalId', 'occupierId', 'receivedDate', 'ownerId'],
    list: ['name', 'assessmentType', 'approvalId', 'occupierId', 'receivedDate', 'status', 'ownerId'], path: 'status'
  },

  inspection: {
    label: 'Inspection', plural: 'Inspections', icon: 'View', color: '#00a1e0', prefix: 'INS-', digits: 6, start: 20000, owner: true, parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), look('siteId', 'Site', 'site'), look('ptsId', 'Pre-Treatment System', 'pts'),
      pick('inspectionType', 'Inspection Type', PICKLISTS.inspectionType, { required: true }), pick('status', 'Status', PICKLISTS.inspectionStatus, { default: 'Scheduled' }),
      f('scheduledDate', 'Scheduled Date', 'date', { defaultToday: true }), f('inspectionDate', 'Inspection Date', 'date'),
      pick('result', 'Result', PICKLISTS.inspectionResult),
      f('ptsMaintained', 'Pre-treatment maintained', 'checkbox'), f('recordsAvailable', 'Pump-out records available', 'checkbox'),
      f('signageOk', 'Signage / access OK', 'checkbox'), f('lastPumpOut', 'Last Pump-out (from WasteID)', 'date'),
      f('nonComplianceItems', 'Non-Compliance Items', 'multipicklist', { options: PICKLISTS.nonComplianceType }),
      f('observations', 'Observations', 'textarea')
    ],
    list: ['name', 'inspectionType', 'approvalId', 'scheduledDate', 'inspectionDate', 'result', 'status', 'ownerId'], path: 'status'
  },

  workItem: {
    label: 'Approval Work Item', plural: 'Approval Work Items', icon: 'Checked', color: '#ea7600', prefix: 'AWI-', digits: 5, start: 1,
    fields: [
      pick('itemType', 'Work Item Type', PICKLISTS.workItemType, { required: true }), pick('status', 'Status', PICKLISTS.workItemStatus, { default: 'Pending', readonly: true }),
      look('approvalId', 'Approval', 'approval'), look('invoiceId', 'Invoice', 'invoice'), look('caseId', 'Case', 'case'),
      f('summary', 'Summary', 'textarea'), f('submittedBy', 'Submitted By', 'user', ro), f('submittedAt', 'Submitted At', 'datetime', ro),
      f('decidedBy', 'Decided By', 'user', ro), f('decidedAt', 'Decided At', 'datetime', ro), f('decisionComments', 'Decision Comments', 'textarea', ro),
      f('payload', 'Payload', 'json', { ...ro, hidden: true })
    ],
    list: ['name', 'itemType', 'approvalId', 'summary', 'submittedBy', 'submittedAt', 'status'], path: 'status'
  },

  billingRun: {
    label: 'Billing Run', plural: 'UF Billing', icon: 'Money', color: '#3c97dd', prefix: 'BR-', digits: 4, start: 1,
    fields: [
      f('startDate', 'Start Date', 'date', { required: true }), f('endDate', 'End Date', 'date', { required: true }),
      pick('status', 'Status', PICKLISTS.runStatus, { default: 'Draft', readonly: true }), f('approvalCount', 'Approvals', 'number', ro),
      f('totalAmount', 'Total (ex GST)', 'currency', ro), f('runAt', 'Run At', 'datetime', ro), f('runBy', 'Run By', 'user', ro)
    ],
    list: ['name', 'startDate', 'endDate', 'approvalCount', 'totalAmount', 'status', 'runAt'], path: 'status'
  },

  billingCalc: {
    label: 'Billing Calculation', plural: 'Billing Calculations', icon: 'Tickets', color: '#3c97dd', prefix: 'BC-', digits: 6, start: 1, parent: 'billingRunId',
    fields: [
      look('billingRunId', 'Billing Run', 'billingRun', ro), look('approvalId', 'Approval', 'approval', ro), look('invoiceId', 'UF Invoice', 'invoice', ro),
      f('periodStart', 'Period Start', 'date', ro), f('periodEnd', 'Period End', 'date', ro),
      f('inflowKl', 'Metered Volume (kL)', 'number', ro), f('dischargeFactor', 'Sewage Discharge Factor', 'number', ro),
      f('domesticOffsetKl', 'Domestic Offset (kL)', 'number', ro), f('tradeWasteKl', 'Trade Waste Volume (kL)', 'number', ro),
      f('deemed', 'Deemed Quality', 'checkbox', ro), f('ss', 'SS (mg/L)', 'number', ro), f('bod', 'BOD (mg/L)', 'number', ro), f('n', 'Nitrogen (mg/L)', 'number', ro), f('p', 'Phosphorus (mg/L)', 'number', ro),
      f('sampleCount', 'Samples Used', 'number', ro), f('amount', 'Total Amount (ex GST)', 'currency', ro), f('gst', 'Total GST', 'currency', ro), f('total', 'Total Amount (inc GST)', 'currency', ro), f('breakdown', 'Breakdown', 'json', ro)
    ],
    list: ['name', 'approvalId', 'tradeWasteKl', 'ss', 'bod', 'n', 'p', 'deemed', 'amount', 'gst', 'total', 'invoiceId']
  },

  invoice: {
    label: 'UF Invoice', plural: 'UF Invoices', icon: 'Document', color: '#2e844a', prefix: 'INV-', digits: 6, start: 70000, parent: 'approvalId',
    fields: [
      look('approvalId', 'Approval', 'approval', { required: true }), look('billingRunId', 'Billing Run', 'billingRun', ro), look('billingCalcId', 'Calculation', 'billingCalc', ro),
      pick('invoiceType', 'Invoice Type', PICKLISTS.invoiceType, { default: 'Trade Waste Quality' }), pick('status', 'Status', PICKLISTS.invoiceStatus, { default: 'Draft', readonly: true }),
      f('periodStart', 'Period Start', 'date'), f('periodEnd', 'Period End', 'date'),
      f('amount', 'Amount (ex GST)', 'currency'), f('gst', 'GST', 'currency', ro), f('total', 'Total', 'currency', ro),
      f('accountCode', 'Account Code'), f('notes', 'Internal Notes', 'textarea')
    ],
    list: ['name', 'approvalId', 'periodStart', 'periodEnd', 'amount', 'total', 'status'], path: 'status'
  }
}

export const SYSTEM_FIELDS = {
  name: { key: 'name', label: 'Number', type: 'name', readonly: true },
  ownerId: { key: 'ownerId', label: 'Owner', type: 'user' },
  createdAt: { key: 'createdAt', label: 'Created', type: 'datetime', readonly: true },
  createdBy: { key: 'createdBy', label: 'Created By', type: 'user', readonly: true },
  updatedAt: { key: 'updatedAt', label: 'Last Modified', type: 'datetime', readonly: true },
  updatedBy: { key: 'updatedBy', label: 'Last Modified By', type: 'user', readonly: true }
}

for (const [key, o] of Object.entries(OBJECTS)) {
  o.key = key
  o.fieldMap = Object.fromEntries(o.fields.map((x) => [x.key, x]))
  o.nameLabel = o.prefix ? `${o.label} Number` : o.fieldMap[o.nameFrom]?.label || 'Name'
}

export function fieldOf(objectKey, key) {
  const o = OBJECTS[objectKey]
  if (key === 'name') return { ...SYSTEM_FIELDS.name, label: o.nameLabel }
  return o.fieldMap[key] || SYSTEM_FIELDS[key]
}

export const visible = (field, rec) => !field.showIf || Object.entries(field.showIf).every(([k, v]) => rec?.[k] === v)

export const ROLES = { officer: 'Trade Waste Officer', coordinator: 'Trade Waste Coordinator' }

export const BILLING_PARAMS = [
  { key: 'ss', code: 'SGV_OTHER1', label: 'Suspended Solids', deemed: 'deemedSs' },
  { key: 'bod', code: 'SGV_INRG1', label: 'BOD', deemed: 'deemedBod' },
  { key: 'n', code: 'SGV_NUTRNT2', label: 'Nitrogen', deemed: 'deemedN' },
  { key: 'p', code: 'SGV_NUTRNT3', label: 'Phosphorus', deemed: 'deemedP' }
]

// Placeholder billing rates ($/kg) and domestic allowances until the official algorithm is supplied.
export const DEFAULT_BILLING_CONFIG = {
  rates: { ss: 0.72, bod: 1.05, n: 2.35, p: 4.80 },
  domesticStrength: { ss: 300, bod: 250, n: 60, p: 10 },
  domesticLitresPerEmployeeDay: 50, domesticLitresPerShowerDay: 40, gstRate: 0.1
}

// Placeholder sizing rule: litres of arrestor capacity per fixture, rounded up to a standard size.
export const FIXTURE_LITRES = { Sink: 150, 'Pot sink': 250, 'Hand basin': 20, Dishwasher: 300, 'Glass washer': 100, 'Wok burner': 200, 'Combi oven': 150, 'Floor waste': 50, 'Potato peeler': 300, 'Rice washer': 200 }
export const STANDARD_CAPACITIES = [1000, 1500, 2000, 3000, 4000, 5000, 7000, 10000, 15000, 20000]
export function recommendCapacity(fixtures, mealsPerDay = 0) {
  const base = fixtures.reduce((s, x) => s + (FIXTURE_LITRES[x.fixtureType] || 50) * (+x.qty || 0), 0) + (+mealsPerDay || 0) * 2
  return STANDARD_CAPACITIES.find((c) => c >= base) || Math.ceil(base / 1000) * 1000
}

// Parameters whose results sit around a typical value rather than below a limit.
export const TYPICAL_VALUES = { SGV_PH: 7.4, SGV_TEMP: 29 }
