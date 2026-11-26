import type { Access, CollectionConfig } from 'payload'
import { revalidateTag } from 'next/cache'

const isCmsAdmin = (user: unknown) =>
  Boolean(user && typeof user === 'object' && 'collection' in user && user.collection === 'admins')

const appRole = (user: unknown) =>
  user && typeof user === 'object' && 'collection' in user && user.collection === 'users'
    ? 'role' in user
      ? user.role
      : null
    : null

const adminOnly: Access = ({ req }) => isCmsAdmin(req.user) || appRole(req.user) === 'admin'

export const RoomRates: CollectionConfig = {
  slug: 'room-rates',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: ({ req }) => {
      if (isCmsAdmin(req.user) || appRole(req.user)) return true
      return { active: { equals: true } }
    },
    update: adminOnly,
  },
  admin: {
    defaultColumns: ['name', 'rate', 'capacity', 'active'],
    group: 'Hotel Operations',
    useAsTitle: 'name',
  },
  hooks: {
    afterChange: [
      () => {
        revalidateTag('room-rates', 'max')
      },
    ],
    afterDelete: [
      () => {
        revalidateTag('room-rates', 'max')
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'roomTypeId', type: 'number', required: true, unique: true, index: true },
    { name: 'rate', type: 'number', required: true, min: 0 },
    { name: 'capacity', type: 'number', required: true, min: 1, max: 20 },
    { name: 'active', type: 'checkbox', required: true, defaultValue: true },
    {
      name: 'seasonalPricing',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'startDate', type: 'date', required: true },
        { name: 'endDate', type: 'date', required: true },
        { name: 'rate', type: 'number', required: true, min: 0 },
      ],
    },
  ],
  timestamps: true,
}
