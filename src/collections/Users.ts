import type { Access, CollectionConfig, FieldAccess } from 'payload'

const isCmsAdmin = (user: unknown) =>
  Boolean(user && typeof user === 'object' && 'collection' in user && user.collection === 'admins')

const isAppAdmin = (user: unknown) =>
  Boolean(
    user &&
      typeof user === 'object' &&
      'collection' in user &&
      user.collection === 'users' &&
      'role' in user &&
      user.role === 'admin',
  )

const isActiveAppUser = (user: unknown) =>
  Boolean(
    user &&
      typeof user === 'object' &&
      'collection' in user &&
      user.collection === 'users' &&
      'active' in user &&
      user.active !== false,
  )

const isHotelAdmin = (user: unknown) =>
  isCmsAdmin(user) || isAppAdmin(user)

const adminOnlyField: FieldAccess = ({ req }) => isCmsAdmin(req.user) || isAppAdmin(req.user)

const manageUsers: Access = ({ req }) => isHotelAdmin(req.user)

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 8,
  },
  access: {
    admin: ({ req }) => isCmsAdmin(req.user),
    create: () => true,
    delete: manageUsers,
    read: ({ req }) => {
      if (isHotelAdmin(req.user)) return true
      if (isActiveAppUser(req.user)) return { id: { equals: req.user?.id } }
      return false
    },
    update: ({ req }) => {
      if (isHotelAdmin(req.user)) return true
      if (isActiveAppUser(req.user)) return { id: { equals: req.user?.id } }
      return false
    },
  },
  admin: {
    defaultColumns: ['name', 'email', 'role', 'active'],
    group: 'Hotel Operations',
    useAsTitle: 'name',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'guest',
      saveToJWT: true,
      access: {
        create: adminOnlyField,
        update: adminOnlyField,
      },
      options: [
        { label: 'Guest', value: 'guest' },
        { label: 'Staff', value: 'staff' },
        { label: 'Administrator', value: 'admin' },
      ],
    },
    {
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      saveToJWT: true,
      access: {
        create: adminOnlyField,
        update: adminOnlyField,
      },
    },
    {
      name: 'googleProviderId',
      type: 'text',
      unique: true,
      index: true,
      access: {
        create: adminOnlyField,
        update: adminOnlyField,
      },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'avatarUrl',
      type: 'text',
      access: {
        create: adminOnlyField,
        update: adminOnlyField,
      },
    },
    {
      name: 'removedAt',
      type: 'date',
      access: {
        create: adminOnlyField,
        update: adminOnlyField,
      },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  timestamps: true,
}
