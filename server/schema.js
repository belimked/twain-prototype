import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('officer'),
  email: text('email'),
  status: text('status').notNull().default('active')
})

// Every business object lives here; frequently-filtered relations are copied into indexed columns.
export const records = sqliteTable('records', {
  id: text('id').primaryKey(),
  object: text('object').notNull(),
  name: text('name').notNull(),
  status: text('status'),
  ownerId: text('owner_id'),
  parentId: text('parent_id'),
  approvalId: text('approval_id'),
  data: text('data', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by'),
  updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by')
}, (t) => [
  index('records_object_idx').on(t.object, t.name),
  index('records_parent_idx').on(t.parentId),
  index('records_approval_idx').on(t.approvalId, t.object),
  index('records_owner_idx').on(t.ownerId, t.object)
])

export const history = sqliteTable('history', {
  id: text('id').primaryKey(),
  recordId: text('record_id').notNull(),
  object: text('object').notNull(),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  userId: text('user_id'),
  userName: text('user_name'),
  at: text('at').notNull()
}, (t) => [index('history_record_idx').on(t.recordId, t.at)])

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  recordId: text('record_id').notNull(),
  kind: text('kind').notNull().default('note'),
  title: text('title'),
  body: text('body'),
  userId: text('user_id'),
  userName: text('user_name'),
  at: text('at').notNull()
}, (t) => [index('notes_record_idx').on(t.recordId, t.at)])

export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  recordId: text('record_id').notNull(),
  fileName: text('file_name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  data: text('data').notNull(),
  userName: text('user_name'),
  at: text('at').notNull()
}, (t) => [index('files_record_idx').on(t.recordId)])

export const counters = sqliteTable('counters', {
  object: text('object').primaryKey(),
  n: integer('n').notNull()
})

export const prefs = sqliteTable('prefs', {
  userId: text('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' })
}, (t) => [uniqueIndex('prefs_user_key_idx').on(t.userId, t.key)])

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' })
})
