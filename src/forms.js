import { reactive } from 'vue'

// One RecordForm dialog is mounted in the layout; anything can open it.
export const formState = reactive({ open: false, object: null, record: null, defaults: {}, names: {}, onSaved: null, title: '' })
export function openForm({ object, record = null, defaults = {}, names = {}, onSaved = null, title = '' }) {
  Object.assign(formState, { open: true, object, record, defaults, names, onSaved, title })
}
