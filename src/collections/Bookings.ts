import { ValidationError, type Access, type CollectionConfig, type FieldAccess } from 'payload'

const isPayloadAdminUser = (user: unknown) =>
  Boolean(user && typeof user === 'object' && 'collection' in user && user.collection === 'admins')
const isHotelTeamUser = (user: unknown) =>
  Boolean(
    user &&
      typeof user === 'object' &&
      'collection' in user &&
      user.collection === 'users' &&
      'active' in user &&
      user.active !== false &&
      'role' in user &&
      (user.role === 'staff' || user.role === 'admin'),
  )
const isPayloadAdmin: Access = ({ req }) => isPayloadAdminUser(req.user)
const isHotelTeam: Access = ({ req }) => isHotelTeamUser(req.user)
const isHotelAdmin: Access = ({ req }) =>
  req.user?.collection === 'admins' ||
  (req.user?.collection === 'users' && req.user.active !== false && req.user.role === 'admin')
const cannotCreateWorkflowField: FieldAccess = () => false
const teamWorkflowFieldAccess: FieldAccess = ({ req }) =>
  req.user?.collection === 'admins' ||
  (req.user?.collection === 'users' && req.user.active !== false)
const adminWorkflowFieldAccess: FieldAccess = ({ req }) =>
  req.user?.collection === 'admins' ||
  (req.user?.collection === 'users' && req.user.active !== false && req.user.role === 'admin')

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  access: {
    create: () => true,
    delete: isHotelAdmin,
    read: ({ req }) => isPayloadAdminUser(req.user) || isHotelTeamUser(req.user),
    update: ({ req }) => isPayloadAdminUser(req.user) || isHotelTeamUser(req.user),
  },
  admin: {
    defaultColumns: ['reference', 'guestName', 'serviceName', 'arrivalDate', 'status'],
    group: 'Hotel Operations',
    useAsTitle: 'reference',
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (!data) return data

        const errors: Array<{ message: string; path: string }> = []
        const arrival = typeof data.arrivalDate === 'string' ? Date.parse(data.arrivalDate) : NaN
        const departure =
          typeof data.departureDate === 'string' ? Date.parse(data.departureDate) : NaN

        if (data.kind === 'room') {
          if (!data.departureDate || Number.isNaN(departure) || departure <= arrival) {
            errors.push({
              message: 'Check-out must be a valid date after check-in.',
              path: 'departureDate',
            })
          }
          if (!Number.isInteger(data.room?.roomTypeId) || data.room.roomTypeId < 1) {
            errors.push({ message: 'Choose a valid room type.', path: 'room.roomTypeId' })
          }
          if (
            !Number.isInteger(data.room?.floor) ||
            data.room.floor < 1 ||
            data.room.floor > 6
          ) {
            errors.push({ message: 'Floor must be between 1 and 6.', path: 'room.floor' })
          }
        }

        if (
          typeof data.payment?.total === 'number' &&
          typeof data.payment?.amountPaid === 'number' &&
          data.payment.amountPaid > data.payment.total
        ) {
          errors.push({
            message: 'Amount paid cannot exceed the booking total.',
            path: 'payment.amountPaid',
          })
        }

        if (errors.length > 0) {
          throw new ValidationError({ collection: 'bookings', errors, req })
        }

        return data
      },
    ],
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation !== 'update' || data.status === originalDoc?.status) return data

        if (data.status === 'checked-in' && !originalDoc?.checkedInAt) {
          data.checkedInAt = new Date().toISOString()
        }

        if (data.status === 'checked-out' && !originalDoc?.checkedOutAt) {
          data.checkedOutAt = new Date().toISOString()
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        const previousPaid = operation === 'create' ? 0 : (previousDoc?.payment?.amountPaid ?? 0)
        const currentPaid = doc.payment?.amountPaid ?? 0
        const amount = currentPaid - previousPaid
        if (amount > 0) {
          const type =
            previousPaid > 0
              ? 'balance'
              : currentPaid >= (doc.payment?.total ?? 0)
                ? 'full'
                : 'deposit'

          await req.payload.create({
            collection: 'transactions',
            overrideAccess: true,
            req,
            data: {
              booking: doc.id,
              reference: doc.reference,
              guestName: doc.guestName,
              type,
              status: 'paid',
              amount,
              method: doc.payment?.method ?? 'Not specified',
              processedBy: req.user?.collection === 'users' ? req.user.id : undefined,
            },
          })
        }

        if (
          operation === 'update' &&
          doc.status === 'cancelled' &&
          previousDoc?.status !== 'cancelled' &&
          currentPaid > 0
        ) {
          await req.payload.create({
            collection: 'transactions',
            overrideAccess: true,
            req,
            data: {
              booking: doc.id,
              reference: doc.reference,
              guestName: doc.guestName,
              type: 'refund',
              status: 'refunded',
              amount: currentPaid,
              method: doc.payment?.method ?? 'Original payment method',
              processedBy: req.user?.collection === 'users' ? req.user.id : undefined,
            },
          })
        }

        const roomId =
          typeof doc.physicalRoom === 'object' ? doc.physicalRoom?.id : doc.physicalRoom
        if (roomId && operation === 'update' && doc.status !== previousDoc?.status) {
          const status =
            doc.status === 'checked-in'
              ? 'occupied'
              : doc.status === 'checked-out'
                ? 'needs-cleaning'
                : doc.status === 'cancelled'
                  ? 'available-clean'
                  : null
          if (status) {
            await req.payload.update({
              collection: 'rooms',
              id: roomId,
              overrideAccess: true,
              req,
              data: { status },
            })
          }
        }
      },
    ],
  },
  fields: [
    {
      name: 'reference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Room', value: 'room' },
        { label: 'Amenity or experience', value: 'amenity' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'upcoming',
      access: {
        create: cannotCreateWorkflowField,
        update: teamWorkflowFieldAccess,
      },
      options: [
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'Checked in', value: 'checked-in' },
        { label: 'Checked out', value: 'checked-out' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'approvalStatus',
      type: 'select',
      defaultValue: 'pending',
      access: {
        create: adminWorkflowFieldAccess,
        update: adminWorkflowFieldAccess,
      },
      options: [
        { label: 'Pending approval', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Declined', value: 'declined' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'serviceName',
      label: 'Room, amenity, or experience',
      type: 'text',
      required: true,
    },
    {
      name: 'category',
      type: 'text',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'guestName',
      type: 'text',
      required: true,
    },
    {
      name: 'guest',
      type: 'group',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
        { name: 'email', type: 'email', required: true, index: true },
        { name: 'phone', type: 'text', required: true },
      ],
    },
    {
      name: 'arrivalDate',
      label: 'Check-in or booking date',
      type: 'date',
      required: true,
      index: true,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        position: 'sidebar',
      },
    },
    {
      name: 'departureDate',
      label: 'Check-out date',
      type: 'date',
      admin: {
        condition: (data) => data.kind === 'room',
        date: { pickerAppearance: 'dayOnly' },
        position: 'sidebar',
      },
    },
    {
      name: 'bookingTime',
      type: 'text',
      admin: {
        condition: (data) => data.kind === 'amenity',
        position: 'sidebar',
      },
    },
    {
      name: 'guests',
      type: 'number',
      required: true,
      min: 1,
      max: 1000,
      admin: { position: 'sidebar' },
    },
    {
      name: 'room',
      type: 'group',
      admin: { condition: (data) => data.kind === 'room' },
      fields: [
        { name: 'roomTypeId', type: 'number' },
        { name: 'floor', type: 'number', min: 1, max: 6 },
      ],
    },
    {
      name: 'physicalRoom',
      type: 'relationship',
      relationTo: 'rooms',
      index: true,
      admin: { condition: (data) => data.kind === 'room', position: 'sidebar' },
    },
    {
      name: 'payment',
      type: 'group',
      fields: [
        {
          name: 'total',
          type: 'number',
          required: true,
          min: 0,
          access: { update: adminWorkflowFieldAccess },
        },
        { name: 'amountPaid', type: 'number', required: true, min: 0 },
        { name: 'method', type: 'text', required: true },
        {
          name: 'option',
          type: 'select',
          options: [
            { label: '10% down payment', value: 'deposit' },
            { label: 'Paid in full', value: 'full' },
          ],
        },
        { name: 'remainingBalance', type: 'number', min: 0 },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: '10% deposit paid', value: 'deposit-paid' },
            { label: 'Paid in full', value: 'paid-in-full' },
            { label: 'Balance due', value: 'balance-due' },
          ],
        },
      ],
    },
    {
      name: 'checkedInAt',
      type: 'date',
      access: {
        create: cannotCreateWorkflowField,
        update: teamWorkflowFieldAccess,
      },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'checkedOutAt',
      type: 'date',
      access: {
        create: cannotCreateWorkflowField,
        update: teamWorkflowFieldAccess,
      },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: {
        create: () => false,
        read: ({ req }) =>
          req.user?.collection === 'admins' ||
          (req.user?.collection === 'users' && req.user.active !== false),
        update: ({ req }) =>
          req.user?.collection === 'admins' ||
          (req.user?.collection === 'users' && req.user.active !== false),
      },
    },
    {
      name: 'archivedAt',
      type: 'date',
      access: {
        create: cannotCreateWorkflowField,
        update: adminWorkflowFieldAccess,
      },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  timestamps: true,
  versions: false,
}
