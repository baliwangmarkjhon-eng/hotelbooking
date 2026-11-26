import type { Access, CollectionConfig } from 'payload'

const canReadTransactions: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  return (
    req.user?.collection === 'users' &&
    req.user.active !== false &&
    (req.user.role === 'staff' || req.user.role === 'admin')
  )
}

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  access: {
    create: () => false,
    delete: () => false,
    read: canReadTransactions,
    update: () => false,
  },
  admin: {
    defaultColumns: ['reference', 'guestName', 'type', 'amount', 'createdAt'],
    group: 'Hotel Operations',
    useAsTitle: 'reference',
  },
  fields: [
    { name: 'booking', type: 'relationship', relationTo: 'bookings', required: true, index: true },
    { name: 'reference', type: 'text', required: true, index: true },
    { name: 'guestName', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: '10% reservation deposit', value: 'deposit' },
        { label: 'Paid in full', value: 'full' },
        { label: 'Balance collected', value: 'balance' },
        { label: 'Refund', value: 'refund' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'paid',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Pending', value: 'pending' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'amount', type: 'number', required: true, min: 0 },
    { name: 'method', type: 'text', required: true },
    { name: 'processedBy', type: 'relationship', relationTo: 'users' },
  ],
  timestamps: true,
  versions: false,
}
