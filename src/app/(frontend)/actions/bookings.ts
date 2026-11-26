'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

type WebsiteBookingInput = {
  reference: string
  kind: 'room' | 'amenity'
  serviceName: string
  category: string
  firstName: string
  lastName: string
  email: string
  phone: string
  arrivalDate: string
  departureDate?: string
  bookingTime?: string
  guests: number
  roomTypeId?: number
  floor?: number
  total: number
  amountPaid: number
  paymentMethod: string
}

export type BookingActionResult =
  | { ok: true }
  | { ok: false; message: string; fields?: Record<string, string> }

const text = (
  value: unknown,
  field: string,
  fields: Record<string, string>,
  maxLength: number,
) => {
  if (typeof value !== 'string' || !value.trim()) {
    fields[field] = 'This field is required.'
    return ''
  }

  const normalized = value.trim()
  if (normalized.length > maxLength) fields[field] = `Must be ${maxLength} characters or fewer.`
  return normalized.slice(0, maxLength)
}

const finiteNumber = (
  value: unknown,
  field: string,
  fields: Record<string, string>,
  min: number,
  max: number,
) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fields[field] = `Must be between ${min} and ${max}.`
    return min
  }
  return value
}

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

export async function createWebsiteBooking(
  input: WebsiteBookingInput,
): Promise<BookingActionResult> {
  const fields: Record<string, string> = {}
  const reference = text(input?.reference, 'reference', fields, 40)
  const serviceName = text(input?.serviceName, 'serviceName', fields, 160)
  const category = text(input?.category, 'category', fields, 100)
  const firstName = text(input?.firstName, 'firstName', fields, 80)
  const lastName = text(input?.lastName, 'lastName', fields, 80)
  const email = text(input?.email, 'email', fields, 254).toLowerCase()
  const phone = text(input?.phone, 'phone', fields, 40)
  const paymentMethod = text(input?.paymentMethod, 'paymentMethod', fields, 120)
  const guests = finiteNumber(input?.guests, 'guests', fields, 1, 1000)
  const total = finiteNumber(input?.total, 'total', fields, 0, 100_000_000)
  const amountPaid = finiteNumber(input?.amountPaid, 'amountPaid', fields, 0, total)

  if (input?.kind !== 'room' && input?.kind !== 'amenity') {
    fields.kind = 'Choose a valid booking type.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = 'Enter a valid email address.'
  if (!validDate(input?.arrivalDate)) fields.arrivalDate = 'Enter a valid booking date.'
  if (input?.kind === 'room' && (!input.departureDate || !validDate(input.departureDate))) {
    fields.departureDate = 'Enter a valid check-out date.'
  }
  if (
    input?.kind === 'room' &&
    input.departureDate &&
    validDate(input.arrivalDate) &&
    validDate(input.departureDate) &&
    Date.parse(input.departureDate) <= Date.parse(input.arrivalDate)
  ) {
    fields.departureDate = 'Check-out must be after check-in.'
  }
  const roomTypeId =
    input?.kind === 'room'
      ? finiteNumber(input.roomTypeId, 'roomTypeId', fields, 1, 10_000)
      : undefined
  const floor =
    input?.kind === 'room' ? finiteNumber(input.floor, 'floor', fields, 1, 6) : undefined

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: 'Please review the booking details.', fields }
  }

  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'bookings',
      overrideAccess: false,
      data: {
        reference,
        kind: input.kind,
        status: 'upcoming',
        serviceName,
        category,
        guestName: `${firstName} ${lastName}`,
        guest: { firstName, lastName, email, phone },
        arrivalDate: input.arrivalDate,
        departureDate: input.kind === 'room' ? input.departureDate : undefined,
        bookingTime: input.kind === 'amenity' ? input.bookingTime?.slice(0, 40) : undefined,
        guests,
        room:
          input.kind === 'room'
            ? {
                roomTypeId,
                floor,
              }
            : undefined,
        payment: {
          total,
          amountPaid,
          method: paymentMethod,
          option: amountPaid >= total ? 'full' : 'deposit',
          remainingBalance: Math.max(0, total - amountPaid),
          status: amountPaid >= total ? 'paid-in-full' : 'deposit-paid',
        },
      },
    })
    return { ok: true }
  } catch {
    return {
      ok: false,
      message:
        'Your reservation is saved on this device, but it could not be sent to hotel staff. Please contact reservations with your reference number.',
    }
  }
}
