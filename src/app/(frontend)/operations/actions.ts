'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { appAuth } from '@/lib/app-auth'

export type ActionResult = { ok: boolean; message: string }

const cleanText = (value: unknown, maxLength = 200) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

async function requireTeam() {
  const user = await appAuth.currentUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    throw new Error('Unauthorized')
  }
  return user
}

async function requireAdmin() {
  const user = await requireTeam()
  if (user.role !== 'admin') throw new Error('Administrator access required')
  return user
}

export async function updateBookingAction(input: {
  id: string
  operation: 'check-in' | 'check-out' | 'collect-balance'
  paymentMethod?: string
  settleBalance?: boolean
}): Promise<ActionResult> {
  try {
    const user = await requireTeam()
    const payload = await getPayload({ config })
    const booking = await payload.findByID({
      collection: 'bookings',
      id: input.id,
      overrideAccess: false,
      user,
    })

    if (input.operation === 'collect-balance' || (input.operation === 'check-in' && input.settleBalance)) {
      const method = input.paymentMethod?.trim()
      if (!method) return { ok: false, message: 'Choose a payment method.' }
      await payload.update({
        collection: 'bookings',
        id: booking.id,
        overrideAccess: false,
        user,
        data: {
          status: input.operation === 'check-in' ? 'checked-in' : booking.status,
          payment: {
            ...booking.payment,
            amountPaid: booking.payment.total,
            remainingBalance: 0,
            status: 'paid-in-full',
            method: `${booking.payment.method} · Balance via ${method}`,
          },
        },
      })
      return {
        ok: true,
        message:
          input.operation === 'check-in'
            ? 'Balance collected and guest checked in.'
            : 'Remaining balance marked as paid.',
      }
    }

    if (
      input.operation === 'check-out' &&
      (booking.payment.remainingBalance ?? booking.payment.total - booking.payment.amountPaid) > 0
    ) {
      return { ok: false, message: 'Collect the remaining balance before check-out.' }
    }

    await payload.update({
      collection: 'bookings',
      id: booking.id,
      overrideAccess: false,
      user,
      data: { status: input.operation === 'check-in' ? 'checked-in' : 'checked-out' },
    })
    return {
      ok: true,
      message: input.operation === 'check-in' ? 'Guest checked in.' : 'Guest checked out.',
    }
  } catch {
    return { ok: false, message: 'The booking could not be updated.' }
  }
}

export async function archiveBookingAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'bookings',
      id,
      overrideAccess: false,
      user,
      data: { status: 'cancelled', archivedAt: new Date().toISOString() },
    })
    return {
      ok: true,
      message: 'Booking removed from active operations. Financial history was preserved.',
    }
  } catch {
    return { ok: false, message: 'The booking could not be removed.' }
  }
}

export async function createStaffAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')
    if (!name || !email || password.length < 8) {
      return { ok: false, message: 'Name, email, and an 8+ character password are required.' }
    }

    const payload = await getPayload({ config })
    await payload.create({
      collection: 'users',
      overrideAccess: false,
      user,
      data: { name, email, password, role: 'staff', active: true },
    })
    return { ok: true, message: 'Staff account created.' }
  } catch {
    return { ok: false, message: 'The staff account could not be created.' }
  }
}

export async function toggleStaffAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id,
      overrideAccess: false,
      user,
      data: { active },
    })
    return { ok: true, message: active ? 'Staff account activated.' : 'Staff account deactivated.' }
  } catch {
    return { ok: false, message: 'The staff account could not be updated.' }
  }
}

export async function removeStaffAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    if (String(user.id) === id) {
      return { ok: false, message: 'You cannot remove your own administrator account.' }
    }
    const payload = await getPayload({ config })
    const member = await payload.findByID({
      collection: 'users',
      id,
      overrideAccess: false,
      user,
    })
    if (member.role !== 'staff') {
      return { ok: false, message: 'Only staff accounts can be removed here.' }
    }
    await payload.update({
      collection: 'users',
      id,
      overrideAccess: false,
      user,
      data: { active: false, removedAt: new Date().toISOString() },
    })
    return { ok: true, message: 'Staff access removed. Historical activity was preserved.' }
  } catch {
    return { ok: false, message: 'The staff account could not be removed.' }
  }
}

export async function updateRateAction(input: {
  id: string
  rate: number
  active?: boolean
  name?: string
  capacity?: number
  seasonalPricing?: Array<{ label: string; startDate: string; endDate: string; rate: number }>
}): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    if (!Number.isFinite(input.rate) || input.rate < 0) {
      return { ok: false, message: 'Enter a valid room rate.' }
    }
    const payload = await getPayload({ config })
    const data: Record<string, unknown> = { rate: input.rate }
    if (typeof input.active === 'boolean') data.active = input.active
    if (input.name?.trim()) data.name = input.name.trim().slice(0, 120)
    if (Number.isInteger(input.capacity) && input.capacity! > 0 && input.capacity! <= 20) {
      data.capacity = input.capacity
    }
    if (input.seasonalPricing) {
      data.seasonalPricing = input.seasonalPricing.filter(
        (season) =>
          season.label.trim() &&
          validDate(season.startDate) &&
          validDate(season.endDate) &&
          Date.parse(season.endDate) >= Date.parse(season.startDate) &&
          Number.isFinite(season.rate) &&
          season.rate >= 0,
      )
    }
    await payload.update({
      collection: 'room-rates',
      id: input.id,
      overrideAccess: false,
      user,
      data,
    })
    return { ok: true, message: 'Room type and pricing updated.' }
  } catch {
    return { ok: false, message: 'The room rate could not be updated.' }
  }
}

export async function createRoomTypeAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    const name = cleanText(formData.get('name'), 120)
    const roomTypeId = Number(formData.get('roomTypeId'))
    const rate = Number(formData.get('rate'))
    const capacity = Number(formData.get('capacity'))
    if (
      !name ||
      !Number.isInteger(roomTypeId) ||
      roomTypeId < 1 ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 20
    ) {
      return { ok: false, message: 'Enter a valid name, type ID, rate, and capacity.' }
    }
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'room-rates',
      overrideAccess: false,
      user,
      data: { name, roomTypeId, rate, capacity, active: true },
    })
    return { ok: true, message: 'Room type added to inventory.' }
  } catch {
    return { ok: false, message: 'The room type could not be created. Its type ID may already exist.' }
  }
}

export async function updateUserRoleAction(input: {
  id: string
  role: 'guest' | 'staff' | 'admin'
  active?: boolean
}): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    if (!['guest', 'staff', 'admin'].includes(input.role)) {
      return { ok: false, message: 'Choose a valid account role.' }
    }
    if (String(user.id) === input.id && (input.role !== 'admin' || input.active === false)) {
      return { ok: false, message: 'You cannot demote or deactivate your own administrator account.' }
    }
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: input.id,
      overrideAccess: false,
      user,
      data: {
        role: input.role,
        active: input.active ?? true,
        removedAt: input.active === false ? new Date().toISOString() : null,
      },
    })
    return { ok: true, message: 'Account permissions updated.' }
  } catch {
    return { ok: false, message: 'The account permissions could not be updated.' }
  }
}

export async function changeOwnPasswordAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    const currentPassword = String(formData.get('currentPassword') ?? '')
    const newPassword = String(formData.get('newPassword') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return { ok: false, message: 'Use at least 8 characters with a letter and number.' }
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, message: 'The new passwords do not match.' }
    }

    const payload = await getPayload({ config })
    await payload.login({
      collection: 'users',
      data: { email: user.email, password: currentPassword },
    })
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: false,
      user,
      data: { password: newPassword },
    })
    const refreshedUser = await appAuth.login(user.email, newPassword)
    if (!refreshedUser) {
      return { ok: false, message: 'Password changed, but the session could not be refreshed.' }
    }
    return { ok: true, message: 'Your administrator password was changed securely.' }
  } catch {
    return { ok: false, message: 'The current password is incorrect or the password could not be changed.' }
  }
}

export async function adminBookingAction(input: {
  id: string
  operation: 'approve' | 'cancel' | 'modify'
  arrivalDate?: string
  departureDate?: string
  physicalRoom?: string
}): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    const payload = await getPayload({ config })
    const booking = await payload.findByID({
      collection: 'bookings',
      id: input.id,
      overrideAccess: false,
      user,
    })
    if (input.operation === 'cancel') {
      await payload.update({
        collection: 'bookings',
        id: input.id,
        overrideAccess: false,
        user,
        data: { approvalStatus: 'declined', status: 'cancelled' },
      })
      return { ok: true, message: 'Booking cancelled. Any collected payment was recorded as a refund.' }
    }
    if (input.operation === 'approve') {
      await payload.update({
        collection: 'bookings',
        id: input.id,
        overrideAccess: false,
        user,
        data: { approvalStatus: 'approved' },
      })
      return { ok: true, message: 'Booking approved.' }
    }
    const arrivalDate = cleanText(input.arrivalDate)
    const departureDate = cleanText(input.departureDate)
    if (
      !validDate(arrivalDate) ||
      (booking.kind === 'room' &&
        (!validDate(departureDate) || Date.parse(departureDate) <= Date.parse(arrivalDate)))
    ) {
      return { ok: false, message: 'Enter a valid stay date range.' }
    }
    await payload.update({
      collection: 'bookings',
      id: input.id,
      overrideAccess: false,
      user,
      data: {
        arrivalDate,
        departureDate: booking.kind === 'room' ? departureDate : undefined,
        physicalRoom: input.physicalRoom || undefined,
      },
    })
    return { ok: true, message: 'Booking details updated.' }
  } catch {
    return { ok: false, message: 'The booking could not be updated.' }
  }
}

export async function createManualBookingAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    const guestName = cleanText(formData.get('guestName'), 160)
    const email = cleanText(formData.get('email'), 254).toLowerCase()
    const phone = cleanText(formData.get('phone'), 40)
    const arrivalDate = cleanText(formData.get('arrivalDate'))
    const departureDate = cleanText(formData.get('departureDate'))
    const physicalRoom = cleanText(formData.get('physicalRoom'))
    const amountPaid = Number(formData.get('amountPaid') ?? 0)
    const guests = Number(formData.get('guests') ?? 1)
    if (
      !guestName ||
      !validEmail(email) ||
      !phone ||
      !validDate(arrivalDate) ||
      !validDate(departureDate) ||
      Date.parse(departureDate) <= Date.parse(arrivalDate) ||
      !physicalRoom ||
      !Number.isFinite(amountPaid) ||
      amountPaid < 0 ||
      !Number.isInteger(guests) ||
      guests < 1 ||
      guests > 20
    ) {
      return { ok: false, message: 'Complete the guest, room, dates, and payment fields.' }
    }
    const payload = await getPayload({ config })
    const room = await payload.findByID({
      collection: 'rooms',
      id: physicalRoom,
      depth: 1,
      overrideAccess: false,
      user,
    })
    const rate = typeof room.roomType === 'object' ? room.roomType.rate : 0
    const nights = Math.max(1, Math.ceil((Date.parse(departureDate) - Date.parse(arrivalDate)) / 86_400_000))
    const total = rate * nights
    if (amountPaid > total) return { ok: false, message: 'Amount paid cannot exceed the stay total.' }
    const [firstName, ...lastParts] = guestName.split(/\s+/)
    const reference = `MAN-${Date.now().toString(36).toUpperCase()}`
    await payload.create({
      collection: 'bookings',
      overrideAccess: false,
      user,
      data: {
        reference,
        kind: 'room',
        status: 'upcoming',
        approvalStatus: 'approved',
        serviceName:
          typeof room.roomType === 'object'
            ? `${room.roomType.name} — Room ${room.roomNumber}`
            : `Room ${room.roomNumber}`,
        category: `Floor ${room.floor}`,
        guestName,
        guest: {
          firstName,
          lastName: lastParts.join(' ') || firstName,
          email,
          phone,
        },
        arrivalDate,
        departureDate,
        guests,
        room: {
          roomTypeId: typeof room.roomType === 'object' ? room.roomType.roomTypeId : undefined,
          floor: room.floor,
        },
        physicalRoom,
        payment: {
          total,
          amountPaid,
          method: cleanText(formData.get('paymentMethod'), 120) || 'Front desk',
          option: amountPaid >= total ? 'full' : 'deposit',
          remainingBalance: Math.max(0, total - amountPaid),
          status: amountPaid >= total ? 'paid-in-full' : amountPaid > 0 ? 'deposit-paid' : 'balance-due',
        },
      },
    })
    return { ok: true, message: `Booking ${reference} created.` }
  } catch {
    return { ok: false, message: 'The manual booking could not be created.' }
  }
}

export async function updateRoomStatusAction(input: {
  id: string
  status: 'available-clean' | 'occupied' | 'needs-cleaning' | 'maintenance'
}): Promise<ActionResult> {
  try {
    const user = await requireTeam()
    if (!['available-clean', 'occupied', 'needs-cleaning', 'maintenance'].includes(input.status)) {
      return { ok: false, message: 'Choose a valid room status.' }
    }
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'rooms',
      id: input.id,
      overrideAccess: false,
      user,
      data: { status: input.status },
    })
    return { ok: true, message: 'Room status updated.' }
  } catch {
    return { ok: false, message: 'The room status could not be updated.' }
  }
}

export async function createServiceRequestAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireTeam()
    const guestName = cleanText(formData.get('guestName'), 160)
    const details = cleanText(formData.get('details'), 1000)
    const category = cleanText(formData.get('category'), 40)
    const priority = cleanText(formData.get('priority'), 20)
    const room = cleanText(formData.get('room'))
    if (!guestName || !details || !['Housekeeping', 'Maintenance', 'Dining', 'Concierge', 'Other'].includes(category)) {
      return { ok: false, message: 'Complete the guest, category, and request details.' }
    }
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'service-requests',
      overrideAccess: false,
      user,
      data: {
        guestName,
        details,
        category: category as 'Housekeeping',
        priority: ['low', 'normal', 'high', 'urgent'].includes(priority)
          ? (priority as 'normal')
          : 'normal',
        room: room || undefined,
        status: 'pending',
      },
    })
    return { ok: true, message: 'Guest service request added.' }
  } catch {
    return { ok: false, message: 'The service request could not be created.' }
  }
}

export async function updateServiceRequestAction(input: {
  id: string
  status: 'pending' | 'in-progress' | 'completed'
}): Promise<ActionResult> {
  try {
    const user = await requireTeam()
    if (!['pending', 'in-progress', 'completed'].includes(input.status)) {
      return { ok: false, message: 'Choose a valid request status.' }
    }
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'service-requests',
      id: input.id,
      overrideAccess: false,
      user,
      data: { status: input.status },
    })
    return { ok: true, message: 'Service request updated.' }
  } catch {
    return { ok: false, message: 'The service request could not be updated.' }
  }
}

export async function createShiftNoteAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireTeam()
    const note = cleanText(formData.get('note'), 1200)
    if (!note) return { ok: false, message: 'Write a handover note first.' }
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'shift-notes',
      overrideAccess: false,
      user,
      data: { note, pinned: formData.get('pinned') === 'on', createdBy: user.id },
    })
    return { ok: true, message: 'Shift handover note posted.' }
  } catch {
    return { ok: false, message: 'The handover note could not be posted.' }
  }
}
