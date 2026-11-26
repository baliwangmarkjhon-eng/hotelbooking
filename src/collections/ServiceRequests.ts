import type { Access, CollectionConfig } from 'payload'

const teamOnly: Access = ({ req }) =>
  req.user?.collection === 'admins' ||
  (req.user?.collection === 'users' &&
    req.user.active !== false &&
    (req.user.role === 'staff' || req.user.role === 'admin'))

export const ServiceRequests: CollectionConfig = {
  slug: 'service-requests',
  access: {
    create: teamOnly,
    delete: teamOnly,
    read: teamOnly,
    update: teamOnly,
  },
  admin: {
    defaultColumns: ['guestName', 'room', 'category', 'priority', 'status', 'createdAt'],
    group: 'Hotel Operations',
    useAsTitle: 'guestName',
  },
  fields: [
    { name: 'room', type: 'relationship', relationTo: 'rooms', index: true },
    { name: 'guestName', type: 'text', required: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: ['Housekeeping', 'Maintenance', 'Dining', 'Concierge', 'Other'],
    },
    { name: 'details', type: 'textarea', required: true },
    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'normal',
      options: ['low', 'normal', 'high', 'urgent'],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
      ],
    },
  ],
  timestamps: true,
}
