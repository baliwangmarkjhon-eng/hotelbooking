import 'server-only'

import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

const getCachedRoomRates = unstable_cache(async () => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'room-rates',
    limit: 100,
    overrideAccess: false,
    sort: 'roomTypeId',
    where: { active: { equals: true } },
  })

  return Object.fromEntries(docs.map((room) => [room.roomTypeId, room.rate]))
}, ['public-room-rates'], { tags: ['room-rates'] })

export async function getPublicRoomRates() {
  return getCachedRoomRates()
}
