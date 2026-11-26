import HotelApp from "./HotelApp";
import { getPublicRoomRates } from "@/lib/room-rates";

export default async function HomePage() {
  const roomRates = await getPublicRoomRates();
  return <HotelApp roomRates={roomRates} />;
}
