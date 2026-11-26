import type { Access, CollectionConfig } from 'payload'

const isTeam = (user: unknown) =>
  Boolean(
    user &&
      typeof user === 'object' &&
      'collection' in user &&
      (user.collection === 'admins' ||
        (user.collection === 'users' &&
          'active' in user &&
          user.active !== false &&
          'role' in user &&
          (user.role === 'staff' || user.role === 'admin'))),
  )

const teamOnly: Access = ({ req }) => isTeam(req.user)
const ownOrAdmin: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  if (req.user?.collection !== 'users' || !isTeam(req.user)) return false
  if (req.user.role === 'admin') return true
  return { createdBy: { equals: req.user.id } }
}

export const ShiftNotes: CollectionConfig = {
  slug: 'shift-notes',
  access: {
    create: teamOnly,
    delete: ownOrAdmin,
    read: teamOnly,
    update: ownOrAdmin,
  },
  admin: {
    defaultColumns: ['note', 'pinned', 'createdBy', 'createdAt'],
    group: 'Hotel Operations',
    useAsTitle: 'note',
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user?.collection === 'users') {
          data.createdBy = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'note', type: 'textarea', required: true },
    { name: 'pinned', type: 'checkbox', defaultValue: false },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: {
        create: () => false,
        update: () => false,
      },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  timestamps: true,
}
