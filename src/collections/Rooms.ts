import type { Access, CollectionConfig, FieldAccess } from 'payload'

const isAdminUser = (user: unknown) =>
  Boolean(
    user &&
      typeof user === 'object' &&
      'collection' in user &&
      (user.collection === 'admins' ||
        (user.collection === 'users' &&
          'active' in user &&
          user.active !== false &&
          'role' in user &&
          user.role === 'admin')),
  )

const isTeamUser = (user: unknown) =>
  Boolean(
    isAdminUser(user) ||
      (user &&
        typeof user === 'object' &&
        'collection' in user &&
        user.collection === 'users' &&
        'active' in user &&
        user.active !== false &&
        'role' in user &&
        user.role === 'staff'),
  )

const adminOnly: Access = ({ req }) => isAdminUser(req.user)
const teamOnly: Access = ({ req }) => isTeamUser(req.user)
const adminField: FieldAccess = ({ req }) => isAdminUser(req.user)
const teamField: FieldAccess = ({ req }) => isTeamUser(req.user)

export const Rooms: CollectionConfig = {
  slug: 'rooms',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: teamOnly,
    update: teamOnly,
  },
  admin: {
    defaultColumns: ['roomNumber', 'floor', 'roomType', 'status'],
    group: 'Hotel Operations',
    useAsTitle: 'roomNumber',
  },
  fields: [
    {
      name: 'roomNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { update: adminField },
    },
    {
      name: 'floor',
      type: 'number',
      required: true,
      min: 1,
      max: 6,
      index: true,
      access: { update: adminField },
    },
    {
      name: 'roomType',
      type: 'relationship',
      relationTo: 'room-rates',
      required: true,
      index: true,
      access: { update: adminField },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'available-clean',
      index: true,
      access: { update: teamField },
      options: [
        { label: 'Available (Clean)', value: 'available-clean' },
        { label: 'Occupied', value: 'occupied' },
        { label: 'Needs Cleaning (Dirty)', value: 'needs-cleaning' },
        { label: 'Maintenance', value: 'maintenance' },
      ],
    },
  ],
  timestamps: true,
}
