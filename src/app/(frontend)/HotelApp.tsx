"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { appSession, signOutEverywhere } from "@/lib/app-session-browser";
import { createWebsiteBooking } from "./actions/bookings";
import Flowchart from "./Flowchart";

// 50 room templates — each type exists on every floor (1–6), so the hotel has 300 rooms total.
// Floor + room number are assigned at booking time.
const ROOMS = [
  // ── STANDARD (10) ────────────────────────────────────────────────
  { id:1, name:"Standard Single", type:"Standard", size:"22 m²", guests:1, beds:"Single", price:1499, rating:4.5, reviews:812,
    amenities:["City View","Work Desk","Safe","Wi-Fi","Mini Bar"],
    img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=540&fit=crop&auto=format",
    description:"Clean and purposeful for the solo traveller. Proper king-single, fast Wi-Fi, well-lit desk, and a mini bar stocked with local snacks and San Miguel Light." },
  { id:2, name:"Standard Twin", type:"Standard", size:"26 m²", guests:2, beds:"Twin", price:1799, rating:4.5, reviews:634,
    amenities:["City View","Twin Beds","Work Desk","Safe","Wi-Fi"],
    img:"https://images.unsplash.com/photo-1611971263023-105938ce12ed?w=800&h=540&fit=crop&auto=format",
    description:"Two well-spaced single beds, individual reading lights, and enough floor space to actually unpack — the practical choice for two guests travelling together." },
  { id:3, name:"Standard Double", type:"Standard", size:"24 m²", guests:2, beds:"Queen", price:1899, rating:4.6, reviews:591,
    amenities:["City View","Queen Bed","Work Desk","Wi-Fi","Safe"],
    img:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=540&fit=crop&auto=format",
    description:"A queen bed, warm ambient lighting, and a compact writing desk — everything two guests need without anything superfluous." },
  { id:4, name:"Standard City View", type:"Standard", size:"24 m²", guests:2, beds:"Queen", price:1999, rating:4.6, reviews:503,
    amenities:["City View","Queen Bed","Floor-to-Ceiling Windows","Wi-Fi","Safe"],
    img:"https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=540&fit=crop&auto=format",
    description:"Floor-to-ceiling glass frames the city skyline. Same footprint as a standard double, elevated entirely by the view outside." },
  { id:5, name:"Standard Garden View", type:"Standard", size:"24 m²", guests:2, beds:"Queen", price:1899, rating:4.6, reviews:478,
    amenities:["Garden View","Queen Bed","Wi-Fi","Work Desk","Safe"],
    img:"https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&h=540&fit=crop&auto=format",
    description:"Waking to birdsong and green — this ground-adjacent room overlooks the hotel's tropical garden courtyard and is among the quietest in the building." },
  { id:6, name:"Standard Pool View", type:"Standard", size:"24 m²", guests:2, beds:"Queen", price:2099, rating:4.7, reviews:441,
    amenities:["Pool View","Queen Bed","Wi-Fi","Work Desk","Balconette"],
    img:"https://images.unsplash.com/photo-1587985064135-0366536eab42?w=800&h=540&fit=crop&auto=format",
    description:"A Juliet balcony opens directly onto the pool terrace. Morning coffee with the sound of water — simple and very good." },
  { id:7, name:"Standard Connecting Room", type:"Standard", size:"48 m²", guests:4, beds:"2× Queen", price:3499, rating:4.7, reviews:312,
    amenities:["Connecting Door","2× Queen Beds","Wi-Fi","Work Desks","Safe"],
    img:"https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=540&fit=crop&auto=format",
    description:"Two standard rooms joined by a lockable internal door — ideal for families or colleagues who want proximity without sharing a bed. Each side has its own bathroom." },
  { id:8, name:"Standard Accessible Room", type:"Standard", size:"28 m²", guests:2, beds:"Queen", price:1799, rating:4.7, reviews:287,
    amenities:["Roll-in Shower","Wide Doorways","Grab Rails","Wi-Fi","Safe","Visual Alerts"],
    img:"https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=800&h=540&fit=crop&auto=format",
    description:"Fully compliant accessible room with a roll-in shower, wide doorframes, visual fire alerts, and an adjustable bed. Designed with dignity, not compromise." },
  { id:9, name:"Superior Standard", type:"Standard", size:"30 m²", guests:2, beds:"King", price:2299, rating:4.7, reviews:523,
    amenities:["Ocean Glimpse","King Bed","Premium Linens","Wi-Fi","Mini Bar","Espresso"],
    img:"https://images.unsplash.com/photo-1578898886225-c7c894047899?w=800&h=540&fit=crop&auto=format",
    description:"A step up in every dimension — king bed, premium 600-thread linen, partial sea glimpse, and a dedicated espresso machine. The upgrade that makes sense." },
  { id:10, name:"Standard Long Stay", type:"Standard", size:"32 m²", guests:2, beds:"King", price:1699, rating:4.6, reviews:398,
    amenities:["Kitchenette","In-room Laundry","King Bed","Wi-Fi","Weekly Housekeeping"],
    img:"https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=540&fit=crop&auto=format",
    description:"Built for extended stays — a compact kitchenette, in-room washer-dryer, deep wardrobe, and discounted weekly rate. Arrives with a welcome grocery kit." },

  // ── DELUXE (8) ────────────────────────────────────────────────────
  { id:11, name:"Deluxe Room", type:"Room", size:"35 m²", guests:2, beds:"King", price:2499, rating:4.7, reviews:562,
    amenities:["Garden View","Walk-in Shower","Work Desk","Safe","Mini Bar"],
    img:"https://images.unsplash.com/photo-1731336478850-6bce7235e320?w=800&h=540&fit=crop&auto=format",
    description:"Understated elegance for the focused traveller. Linen-wrapped pillows, warm oak finishes, quiet natural light, and a walk-in rain shower." },
  { id:12, name:"Deluxe Ocean View", type:"Room", size:"38 m²", guests:2, beds:"King", price:3499, rating:4.8, reviews:389,
    amenities:["Ocean View","Rainfall Shower","Work Desk","Espresso","Mini Bar"],
    img:"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=540&fit=crop&auto=format",
    description:"Floor-to-ceiling windows frame an unbroken ocean panorama. Handwoven textiles, custom lighting, and a curated minibar awaiting your arrival." },
  { id:13, name:"Deluxe Garden View", type:"Room", size:"36 m²", guests:2, beds:"King", price:2799, rating:4.7, reviews:421,
    amenities:["Garden View","Soaking Tub","Work Desk","Mini Bar","Balcony"],
    img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=540&fit=crop&auto=format",
    description:"Overlooks the hotel's curated tropical garden. A soaking tub, rattan furniture, and a shaded balcony make this the most restful room in the deluxe tier." },
  { id:14, name:"Deluxe Corner Room", type:"Room", size:"42 m²", guests:3, beds:"King + Daybed", price:3299, rating:4.8, reviews:367,
    amenities:["Wrap Corner Windows","King + Daybed","Espresso","Mini Bar","Work Desk"],
    img:"https://images.unsplash.com/photo-1605346434674-a440ca4dc4c0?w=800&h=540&fit=crop&auto=format",
    description:"Corner placement means two walls of glass and a panoramic sweep of sea and city. The additional daybed accommodates a third guest or makes a spectacular reading perch." },
  { id:15, name:"Deluxe Balcony Room", type:"Room", size:"38 m²", guests:2, beds:"King", price:3199, rating:4.8, reviews:345,
    amenities:["Private Balcony","Ocean Glimpse","Rainfall Shower","Espresso","Mini Bar"],
    img:"https://images.unsplash.com/photo-1705765276125-f2539bc95b0f?w=800&h=540&fit=crop&auto=format",
    description:"A full private balcony with two reclining chairs and a low table — enough room for breakfast, evening drinks, or simply watching the tide change." },
  { id:16, name:"Deluxe Panoramic", type:"Room", size:"40 m²", guests:2, beds:"King", price:3799, rating:4.9, reviews:298,
    amenities:["360° Panorama","King Bed","Soaking Tub","Espresso","Butler on Request"],
    img:"https://images.unsplash.com/photo-1685592437742-3b56edb46b15?w=800&h=540&fit=crop&auto=format",
    description:"Positioned at a tower bend for a near-360° sweep — the sea to one side, the island interior to the other. Glass extends from floor to ceiling on three walls." },
  { id:17, name:"Deluxe Premier", type:"Room", size:"38 m²", guests:2, beds:"King", price:3499, rating:4.8, reviews:376,
    amenities:["Ocean View","Rainfall Shower","Work Desk","Espresso","Welcome Champagne"],
    img:"https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=540&fit=crop&auto=format",
    description:"The highest-category non-suite room. Arrives with chilled champagne, upgraded toiletries, premium pillow menu, and priority spa bookings." },
  { id:18, name:"Deluxe Terrace Room", type:"Room", size:"44 m²", guests:3, beds:"King + Sofa Bed", price:3699, rating:4.8, reviews:289,
    amenities:["Private Terrace","Outdoor Daybed","King Bed","Sofa Bed","Espresso"],
    img:"https://images.unsplash.com/photo-1612347572521-d3e1956fc263?w=800&h=540&fit=crop&auto=format",
    description:"A large terrace with a teak daybed and dining set extends the room outdoors. Three guests fit comfortably; the sofa bed folds away when not needed." },

  // ── FAMILY (6) ────────────────────────────────────────────────────
  { id:19, name:"Family Room", type:"Family", size:"48 m²", guests:4, beds:"King + Bunk", price:3999, rating:4.8, reviews:417,
    amenities:["Garden View","Bunk Beds","Kitchenette","Baby Cot Available","Kids TV","Mini Bar"],
    img:"https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=540&fit=crop&auto=format",
    description:"Designed around the chaos and joy of family travel. King bed for parents, bunk beds for kids, kitchenette for midnight snacks, and blackout curtains that actually work." },
  { id:20, name:"Family Deluxe", type:"Family", size:"58 m²", guests:5, beds:"King + Twin + Sofa Bed", price:4999, rating:4.9, reviews:289,
    amenities:["Ocean View","Connecting Door","Kitchenette","Baby Cot","Play Corner","Butler"],
    img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=540&fit=crop&auto=format",
    description:"Two interconnecting rooms on the sea-view floor — a king suite for adults and a twin-plus-sofa for up to three children, with a shared kitchenette and butler service." },
  { id:21, name:"Family Sunrise Room", type:"Family", size:"50 m²", guests:4, beds:"King + Twin", price:4299, rating:4.8, reviews:301,
    amenities:["East-Facing Sea View","King + Twin","Sunrise Balcony","Kitchenette","Kids Amenities","Blackout Curtains"],
    img:"https://images.unsplash.com/photo-1776831234992-57ee0eaa9bbf?w=800&h=540&fit=crop&auto=format",
    description:"Faces due east so every morning starts with the sunrise over the Sibuyan Sea. A generous east balcony for parents, twin beds with individual reading lights for two children, and a compact kitchenette." },
  { id:22, name:"Family Bunk Loft", type:"Family", size:"60 m²", guests:6, beds:"King + 2× Bunk", price:4799, rating:4.8, reviews:241,
    amenities:["Mezzanine Loft","2× Bunk Sets","King Bed","Kitchenette","Games Corner","Baby Cot"],
    img:"https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=540&fit=crop&auto=format",
    description:"A two-level layout with a full-height mezzanine sleeping loft for up to four children, king suite below, and a games corner that keeps everyone occupied." },
  { id:23, name:"Family Suite", type:"Family", size:"72 m²", guests:6, beds:"King + 2× Queen", price:5999, rating:4.9, reviews:198,
    amenities:["Garden View","Living Room","2× Bathrooms","Kitchenette","Baby Cot","Butler"],
    img:"https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=540&fit=crop&auto=format",
    description:"A proper suite layout for large families — separate living room, two full bathrooms, three sleeping areas, and a dedicated family butler managing schedules and meals." },
  { id:24, name:"Family Garden Retreat", type:"Family", size:"65 m²", guests:5, beds:"King + Twin + Sofa Bed", price:5199, rating:4.9, reviews:176,
    amenities:["Private Garden","Outdoor Dining","King + Twin","Kitchenette","Baby Pool","Butler"],
    img:"https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=540&fit=crop&auto=format",
    description:"Ground-floor access to a private walled garden with a paddling pool and outdoor dining table. The room that makes everyone stop requesting screen time." },

  // ── SUITES (14) ──────────────────────────────────────────────────
  { id:25, name:"Junior Suite", type:"Suite", size:"48 m²", guests:2, beds:"King", price:4999, rating:4.8, reviews:312,
    amenities:["Ocean View","Sitting Area","Soaking Tub","Espresso","Mini Bar"],
    img:"https://images.unsplash.com/photo-1590675560125-0d832b9d719e?w=800&h=540&fit=crop&auto=format",
    description:"The entry point to suite living — a clear division between sleeping and sitting areas, a deep freestanding tub, and an ocean window that defines the room." },
  { id:26, name:"Classic Suite", type:"Suite", size:"52 m²", guests:2, beds:"King", price:5499, rating:4.9, reviews:267,
    amenities:["Ocean View","Separate Living Room","Walk-in Wardrobe","Espresso","Butler on Call"],
    img:"https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=540&fit=crop&auto=format",
    description:"A fully separated bedroom and living room in warm narra wood. The walk-in wardrobe, butler on call, and morning newspaper delivered at your stated time." },
  { id:27, name:"Garden Suite", type:"Suite", size:"52 m²", guests:2, beds:"King", price:5499, rating:4.9, reviews:214,
    amenities:["Garden View","Rainfall Shower","Soaking Tub","Balcony","Mini Bar","Espresso"],
    img:"https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=540&fit=crop&auto=format",
    description:"An expansive garden-view suite with hand-stitched linens, a private balcony, and a deep soaking tub overlooking curated tropical grounds." },
  { id:28, name:"Boracay Suite", type:"Suite", size:"52 m²", guests:2, beds:"King", price:5999, rating:4.9, reviews:476,
    amenities:["Beach View","Rainfall Shower","Minibar","Balcony","Sitting Room"],
    img:"https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=540&fit=crop&auto=format",
    description:"Steps from powder-white shores, this breezy suite pairs rattan furnishings with sweeping beachfront views and a generous private balcony." },
  { id:29, name:"Cebu City Suite", type:"Suite", size:"55 m²", guests:3, beds:"King + Daybed", price:5799, rating:4.8, reviews:341,
    amenities:["City View","Walk-in Shower","Work Desk","Espresso","Daybed","Butler"],
    img:"https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&h=540&fit=crop&auto=format",
    description:"Modern Filipino craftsmanship meets the Cebu skyline. Floor-to-ceiling windows, a daybed ideal for a third guest, and a fully stocked espresso station." },
  { id:30, name:"Siargao Suite", type:"Suite", size:"55 m²", guests:3, beds:"King + Hammock Loft", price:5799, rating:4.8, reviews:198,
    amenities:["Garden Access","Outdoor Shower","Surfboard Storage","Hammock Loft","Mini Bar"],
    img:"https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=540&fit=crop&auto=format",
    description:"Woven bamboo walls, an outdoor rain shower, surfboard rack, hammock loft — for the guest who came to the island and never really wants to leave." },
  { id:31, name:"Bohol Suite", type:"Suite", size:"58 m²", guests:3, beds:"King + Daybed", price:6499, rating:4.9, reviews:167,
    amenities:["Chocolate Hills View","Plunge Pool","Narra Wood Bath","Sitting Room","Butler"],
    img:"https://images.unsplash.com/photo-1633694705199-bc1e0a87c97a?w=800&h=540&fit=crop&auto=format",
    description:"Inspired by Bohol's storied landscapes, this suite features narra-wood accents, a private plunge pool, and sweeping views of rolling green hills at dusk." },
  { id:32, name:"El Nido Suite", type:"Suite", size:"68 m²", guests:2, beds:"King", price:7499, rating:5.0, reviews:112,
    amenities:["Lagoon View","Private Terrace","Jacuzzi","Butler Service","Champagne Welcome"],
    img:"https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=540&fit=crop&auto=format",
    description:"Perched above Palawan's emerald lagoons, this cliff-top suite offers a private terrace jacuzzi, bespoke butler service, and limestone karst panoramas." },
  { id:33, name:"Heritage Suite", type:"Suite", size:"64 m²", guests:2, beds:"King", price:8999, rating:4.9, reviews:143,
    amenities:["Heritage Wing","Claw-foot Bath","Fireplace","Sitting Room","Butler"],
    img:"https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&h=540&fit=crop&auto=format",
    description:"Original plasterwork, a cast-iron fireplace, and a freestanding claw-foot bath in the hotel's oldest wing — history that sleeps exceptionally well." },
  { id:34, name:"Honeymoon Suite", type:"Suite", size:"70 m²", guests:2, beds:"California King", price:8499, rating:5.0, reviews:189,
    amenities:["Overwater Balcony","Rose Petal Turndown","Jacuzzi for Two","Champagne Bar","Butler"],
    img:"https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=800&h=540&fit=crop&auto=format",
    description:"Everything deliberately romantic — a California king with silk draping, a jacuzzi for two on the overwater balcony, and a personal butler who disappears when not needed." },
  { id:35, name:"Wellness Suite", type:"Suite", size:"68 m²", guests:2, beds:"King", price:7999, rating:4.9, reviews:156,
    amenities:["In-room Sauna","Cold Plunge","Meditation Corner","Yoga Mat","Botanical Minibar","Sleep Butler"],
    img:"https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&h=540&fit=crop&auto=format",
    description:"A private wellness studio inside your room — personal sauna, cold plunge vessel, meditation alcove, and a sleep butler who curates your environment for deep rest." },
  { id:36, name:"Dive Suite", type:"Suite", size:"62 m²", guests:2, beds:"King", price:6799, rating:4.9, reviews:134,
    amenities:["Direct Sea Access","Gear Drying Room","Wetsuit Locker","Underwater Map Library","Espresso","Butler"],
    img:"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=540&fit=crop&auto=format",
    description:"For the serious diver — a dedicated gear room with lockable equipment storage, tank rinse station, direct sea-access stairs, and a library of local dive site charts." },
  { id:37, name:"Artist's Suite", type:"Suite", size:"66 m²", guests:2, beds:"King", price:7499, rating:4.9, reviews:121,
    amenities:["North Skylights","Studio Easel","Photography Darkroom","Botanical Desk","Espresso","Curated Art"],
    img:"https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=540&fit=crop&auto=format",
    description:"Designed for the creative guest — north-facing skylights, a freestanding studio easel, a small wet darkroom, and walls hung with rotating work by Filipino artists." },
  { id:38, name:"Corner Panorama Suite", type:"Suite", size:"75 m²", guests:3, beds:"King + Daybed", price:9499, rating:5.0, reviews:98,
    amenities:["Full Wrap Windows","180° Sea View","Separate Living Room","Jacuzzi","Butler","Champagne"],
    img:"https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800&h=540&fit=crop&auto=format",
    description:"The building's corner gives a full 180° sweep from sea to skyline. Wrap-around glass on two walls, a deep jacuzzi facing the view, and butler service around the clock." },

  // ── VILLAS & CASITAS (6) ─────────────────────────────────────────
  { id:39, name:"Beach Casita", type:"Villa", size:"72 m²", guests:3, beds:"King", price:10999, rating:5.0, reviews:76,
    amenities:["Beachfront","Private Deck","Outdoor Rain Shower","Mini Bar","Butler"],
    img:"https://images.unsplash.com/photo-1439130490301-25e322d88054?w=800&h=540&fit=crop&auto=format",
    description:"A freestanding bahay-kubo-inspired casita steps from the waterline. Coconut-shell furnishings, a wraparound hardwood deck, and direct beach access under a canopy of palms." },
  { id:40, name:"Treetop Pool Casita", type:"Villa", size:"88 m²", guests:3, beds:"King", price:13999, rating:5.0, reviews:54,
    amenities:["Treetop Views","Private Plunge Pool","Outdoor Shower","Butler","Espresso"],
    img:"https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800&h=540&fit=crop&auto=format",
    description:"Elevated into the jungle canopy on a stilted platform, this casita offers a private plunge pool floating above the treeline and unbroken horizon views at sunrise." },
  { id:41, name:"Hillside Garden Casita", type:"Villa", size:"80 m²", guests:3, beds:"King", price:11999, rating:4.9, reviews:61,
    amenities:["Garden Terrace","Outdoor Jacuzzi","Hammock","Butler","Pantry"],
    img:"https://images.unsplash.com/photo-1570213489059-0aac6626cade?w=800&h=540&fit=crop&auto=format",
    description:"Tucked into fragrant hillside gardens, this casita's oversized terrace and private jacuzzi overlook an unbroken sea panorama." },
  { id:42, name:"Cliff Edge Villa", type:"Villa", size:"95 m²", guests:4, beds:"King + Queen", price:15999, rating:5.0, reviews:47,
    amenities:["Clifftop Terrace","Infinity Edge Plunge Pool","Butler","Personal Chef","Helipad View"],
    img:"https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=800&h=540&fit=crop&auto=format",
    description:"Perched on the island's highest point, this villa offers a vertiginous clifftop terrace, infinity plunge pool, and sunsets that guests photograph on every visit." },
  { id:43, name:"Jungle Treehouse Villa", type:"Villa", size:"105 m²", guests:4, beds:"King + Loft Twin", price:18999, rating:5.0, reviews:39,
    amenities:["Multi-level Treehouse","Canopy Pool","Rope Bridge Access","Butler","Open-air Kitchen"],
    img:"https://images.unsplash.com/photo-1580977276076-ae4b8c219b8e?w=800&h=540&fit=crop&auto=format",
    description:"Three interconnected platforms in a century-old tree. A canopy pool on the upper deck, open-air kitchen on the middle level, and a twin sleeping loft for children reached by rope bridge." },
  { id:44, name:"Lagoon Pool Villa", type:"Villa", size:"115 m²", guests:4, beds:"King + Twin", price:22999, rating:5.0, reviews:33,
    amenities:["Private Lagoon Pool","Direct Beach","Butler","Personal Chef","Kayak Access","Overwater Deck"],
    img:"https://images.unsplash.com/photo-1507272931001-fc06c17e4f43?w=800&h=540&fit=crop&auto=format",
    description:"A villa that blurs the line between inside and sea. The private lagoon pool connects to the ocean at high tide; a kayak waits on the overwater deck for early morning exploration." },

  // ── PRESIDENTIAL & VIP (6) ───────────────────────────────────────
  { id:45, name:"1-Bedroom Beach Villa", type:"Presidential", size:"140 m²", guests:4, beds:"King", price:24999, rating:5.0, reviews:38,
    amenities:["Private Pool","Butler","Personal Chef","Outdoor Dining","Direct Beach","Speedboat"],
    img:"https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=540&fit=crop&auto=format",
    description:"A full standalone villa with a private infinity pool toward the sea, dedicated butler, and a personal chef who shops the wet market each morning for you." },
  { id:46, name:"VIP Ambassador Suite", type:"Presidential", size:"155 m²", guests:4, beds:"King + Queen", price:18999, rating:5.0, reviews:52,
    amenities:["Diplomat Welcome","2× Bathrooms","Private Terrace Pool","Butler Team","Security Screening","Airport Limo"],
    img:"https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=540&fit=crop&auto=format",
    description:"Designed for heads of state and C-suite guests. A dedicated two-person butler team, private terrace pool, secure meeting salon, and an armoured vehicle transfer from the airport." },
  { id:47, name:"Chairman's Suite", type:"Presidential", size:"175 m²", guests:4, beds:"King", price:29999, rating:5.0, reviews:29,
    amenities:["Private Conference Room","Terrace Pool","Butler + PA","Helipad Access","Wine Cellar Access","Chef's Table"],
    img:"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=540&fit=crop&auto=format",
    description:"A suite designed to run a business from — a soundproofed 8-seat conference room, private assistant, dedicated sommelier, and a 20-metre terrace facing the open Sulu Sea." },
  { id:48, name:"Governor's Suite", type:"Presidential", size:"190 m²", guests:6, beds:"King + 2× Queen", price:22999, rating:5.0, reviews:41,
    amenities:["3× Bedrooms","2× Private Terraces","Pool","Butler Team","In-suite Spa","Breakfast Kitchen"],
    img:"https://images.unsplash.com/photo-1738762932370-468a90e0ff68?w=800&h=540&fit=crop&auto=format",
    description:"Three bedrooms, two terraces, a private pool, and an in-suite spa treatment room. For six guests who want total seclusion without the footprint of a separate villa." },
  { id:49, name:"Royal Penthouse Suite", type:"Presidential", size:"280 m²", guests:8, beds:"King + 3× Queen", price:45000, rating:5.0, reviews:17,
    amenities:["Full Penthouse Floor","Rooftop Infinity Pool","Grand Piano","Private Cinema","Chef","Butler Team (4)"],
    img:"https://images.unsplash.com/photo-1747380755783-61befe9b3da7?w=800&h=540&fit=crop&auto=format",
    description:"The entire top floor — a grand piano in the salon, a rooftop infinity pool, private 8-seat cinema, two kitchens, and a four-person butler team on rotation." },
  { id:50, name:"The Grand Palawan Suite", type:"Presidential", size:"380 m²", guests:12, beds:"2× King + 4× Queen", price:55000, rating:5.0, reviews:11,
    amenities:["Entire Villa Wing","3× Private Pools","Helipad","6-Person Chef's Team","Speedboat Fleet","Curated Art Collection"],
    img:"https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=800&h=540&fit=crop&auto=format",
    description:"The hotel's ultimate accommodation — an entire self-contained wing. Three pools, a private helipad, six-person culinary team, a speedboat fleet, and a rotating Philippine art collection valued at ₱80M." },
];

const AMENITY_TABS = ["All", "Pools & Beach", "Spa & Wellness", "Dining & Bars", "Sports & Recreation", "Experiences", "Kids & Family", "Events & Meetings", "Guest Services", "Business & Facilities"] as const;
type AmenityTab = (typeof AMENITY_TABS)[number];

const AMENITIES = [
  // ── Pools & Beach ──
  {
    id: 1,
    category: "Pools & Beach",
    name: "Sunset Infinity Pool",
    description:
      "Our adults-only signature pool dissolves into the horizon at dusk. Heated, saline-filtered, and flanked by submerged daybeds and a swim-up cocktail ledge — arrive at golden hour and stay for the stars.",
    img: "https://images.unsplash.com/photo-1582610116397-edb318620f90?w=800&h=540&fit=crop&auto=format",
    hours: "6:00 AM – 10:00 PM",
    price: 800,
    unit: "per person / day",
    capacity: 30,
    times: ["6:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM"],
  },
  {
    id: 2,
    category: "Pools & Beach",
    name: "Coral Lagoon Family Pool",
    description:
      "A sprawling lagoon-style pool with tiered depths, a shallow wading cove for younger guests, and an underwater mosaic of Philippine marine life rendered in hand-cut ceramic.",
    img: "https://images.unsplash.com/photo-1540541338537-1220059163c5?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 9:00 PM",
    price: 600,
    unit: "per person / day",
    capacity: 60,
    times: ["7:00 AM", "10:00 AM", "1:00 PM", "4:00 PM"],
  },
  {
    id: 3,
    category: "Pools & Beach",
    name: "Private White Sand Beach",
    description:
      "Six hundred metres of powdered white shoreline, exclusive to hotel guests. Beach butlers rotate throughout the day with chilled towels, fresh buko juice, and SPF misting service.",
    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=540&fit=crop&auto=format",
    hours: "6:00 AM – 8:00 PM",
    price: 0,
    unit: "complimentary for guests",
    capacity: 100,
    times: ["Anytime during beach hours"],
  },
  {
    id: 4,
    category: "Pools & Beach",
    name: "Kawayan Floating Bar",
    description:
      "A thatched bamboo raft moored fifty metres offshore — calamansi mojitos, cold lambanog sours, and the open Sulu Sea on every side. Reached by a short wading walk or resort kayak.",
    img: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&h=540&fit=crop&auto=format",
    hours: "11:00 AM – 7:00 PM",
    price: 500,
    unit: "per person (minimum spend)",
    capacity: 20,
    times: ["11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"],
  },

  // ── Spa & Wellness ──
  {
    id: 5,
    category: "Spa & Wellness",
    name: "The Red Spa",
    description:
      "Nine treatment pavilions set into the hillside canopy. Signature hilot healing sessions use warm coconut oil, Visayan botanical compresses, and slow rhythmic strokes drawn from pre-colonial Philippine tradition — voted Best Resort Spa in the Philippines four years running.",
    img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=540&fit=crop&auto=format",
    hours: "9:00 AM – 9:00 PM",
    price: 3500,
    unit: "per person / session",
    capacity: 9,
    times: ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM"],
  },
  {
    id: 6,
    category: "Spa & Wellness",
    name: "Hammam & Cold Plunge Suite",
    description:
      "A marble-inlaid hammam chamber, dry cedar sauna, aromatherapy steam room, and an 8°C cold plunge pool in sequence — the full thermal circuit takes ninety minutes and recalibrates everything.",
    img: "https://images.unsplash.com/photo-1510021006081-0c4ff3bd3b6b?w=800&h=540&fit=crop&auto=format",
    hours: "8:00 AM – 10:00 PM",
    price: 2800,
    unit: "per person / session",
    capacity: 4,
    times: ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"],
  },
  {
    id: 7,
    category: "Spa & Wellness",
    name: "Sunrise Yoga Pavilion",
    description:
      "An elevated hardwood platform facing due east over the sea. Morning vinyasa, midday yin, and evening restorative classes with certified instructors. Private bookings and couples sessions available.",
    img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=540&fit=crop&auto=format",
    hours: "6:00 AM – 7:00 PM",
    price: 600,
    unit: "per session",
    capacity: 15,
    times: ["6:00 AM", "8:00 AM", "5:00 PM", "6:30 PM"],
  },
  {
    id: 8,
    category: "Spa & Wellness",
    name: "Couples Retreat Pavilion",
    description:
      "A private garden pavilion with a double treatment table, outdoor soaking tub, and dedicated therapist pair. The three-hour Palawan Ritual — scrub, wrap, and synchronised massage — is the hotel's most requested experience.",
    img: "https://images.unsplash.com/photo-1600334129128-685f4ec98570?w=800&h=540&fit=crop&auto=format",
    hours: "10:00 AM – 8:00 PM",
    price: 9800,
    unit: "per couple / session",
    capacity: 2,
    times: ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"],
  },

  // ── Dining & Bars ──
  {
    id: 9,
    category: "Dining & Bars",
    name: "Kalye Kitchen",
    description:
      "Our flagship restaurant reimagines Filipino street food through a fine-dining lens — fresh tuna kinilaw, duck adobo confit, heirloom red rice, and ube panna cotta served beneath open bamboo vaulting and capiz-shell lanterns.",
    img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 11:00 PM",
    price: 1800,
    unit: "per person (deposit)",
    capacity: 80,
    times: ["7:00 AM", "12:00 PM", "6:30 PM", "7:30 PM", "8:30 PM"],
  },
  {
    id: 10,
    category: "Dining & Bars",
    name: "Beach Club — Seafood & Grill",
    description:
      "Toes-in-the-sand dining where the day's catch goes straight from boat to grill. Lobster, lapu-lapu, tiger prawns, and Spanish-style paellas served on reclaimed driftwood tables as the tide laps a metre from your chair.",
    img: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=540&fit=crop&auto=format",
    hours: "11:00 AM – 10:00 PM",
    price: 1500,
    unit: "per person (deposit)",
    capacity: 60,
    times: ["11:00 AM", "1:00 PM", "6:00 PM", "7:30 PM"],
  },
  {
    id: 11,
    category: "Dining & Bars",
    name: "Lagoon Club — Sunset Grill",
    description:
      "Situated on the island's quieter western shore, this open-air dinner venue specialises in modern kamayan feasts — entire spreads of grilled meats and seafood laid on banana leaves, shared family-style under the stars.",
    img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&h=540&fit=crop&auto=format",
    hours: "6:00 PM – 11:00 PM",
    price: 2200,
    unit: "per person (deposit)",
    capacity: 40,
    times: ["6:00 PM", "7:00 PM", "8:00 PM"],
  },
  {
    id: 12,
    category: "Dining & Bars",
    name: "Nama — Japanese Kitchen",
    description:
      "A ten-seat omakase counter and izakaya lounge serving daily-flown sashimi, wood-grilled robata skewers, and a curated sake cellar. Reserve at least two days ahead — the counter fills fast.",
    img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 PM – 10:30 PM",
    price: 3500,
    unit: "per person (deposit)",
    capacity: 10,
    times: ["7:00 PM", "8:00 PM"],
  },
  {
    id: 13,
    category: "Dining & Bars",
    name: "Picnic Grove — Wood-fired Pizzas",
    description:
      "A shaded beachside kiosk serving stone-baked pizzas, fresh salads, and cold craft beers — the island's most casual midday spot, where resort guests and staff alike converge for lunch.",
    img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=540&fit=crop&auto=format",
    hours: "11:30 AM – 4:00 PM",
    price: 600,
    unit: "per person",
    capacity: 30,
    times: ["11:30 AM", "12:30 PM", "1:30 PM", "2:30 PM"],
  },
  {
    id: 14,
    category: "Dining & Bars",
    name: "The Lobby Lounge — Afternoon Tea",
    description:
      "Daily Filipino afternoon tea at 3:30 PM: miniature bibingka, ensaymada, yema tarts, and chilled salabat ginger-lemon served on antique silver. Dress is resort-casual; the ritual is non-negotiable.",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=540&fit=crop&auto=format",
    hours: "3:00 PM – 5:00 PM",
    price: 800,
    unit: "per person",
    capacity: 40,
    times: ["3:00 PM", "3:30 PM", "4:00 PM"],
  },
  {
    id: 15,
    category: "Dining & Bars",
    name: "In-Villa Private Dining",
    description:
      "Full 24-hour menu delivered to your room or villa. Breakfast trays, late-night kare-kare, chef's tasting menus for two — every order arrives within thirty minutes on a silver-set trolley with a single orchid.",
    img: "https://images.unsplash.com/photo-1584738766473-61c083514bf4?w=800&h=540&fit=crop&auto=format",
    hours: "24 hours",
    price: 800,
    unit: "per person (service charge)",
    capacity: 6,
    times: ["Any time — 24 hrs"],
  },

  // ── Sports & Recreation ──
  {
    id: 16,
    category: "Sports & Recreation",
    name: "Altitude Gym & Personal Training",
    description:
      "A full-deck fitness studio with panoramic sea views, Technogym Artis series equipment, free weights, TRX, and a resident certified personal trainer. Morning boot camps run at 6 AM daily on the beach.",
    img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&h=540&fit=crop&auto=format",
    hours: "5:00 AM – 11:00 PM",
    price: 500,
    unit: "per session",
    capacity: 20,
    times: ["5:00 AM", "6:00 AM", "7:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM"],
  },
  {
    id: 17,
    category: "Sports & Recreation",
    name: "Floodlit Tennis Courts",
    description:
      "Four full-sized hard courts with LED floodlights for night play. Rackets, balls, and ball boys provided complimentary. Resident tennis coach available for lessons and match play six days a week.",
    img: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 10:00 PM",
    price: 800,
    unit: "per court / hour",
    capacity: 4,
    times: ["7:00 AM", "9:00 AM", "11:00 AM", "3:00 PM", "5:00 PM", "7:00 PM"],
  },
  {
    id: 18,
    category: "Sports & Recreation",
    name: "PADI Dive Centre",
    description:
      "A fully equipped five-star PADI dive centre with resident dive masters, a full fleet of BCDs and regulators, and house reef access from the beach. Daily boat dives to pristine outer reefs, PADI Open Water courses, and night dives on request.",
    img: "https://images.unsplash.com/photo-1583212292454-1d1e870ba5a9?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 5:00 PM",
    price: 3500,
    unit: "per person / dive",
    capacity: 10,
    times: ["7:00 AM", "9:30 AM", "1:00 PM"],
  },
  {
    id: 19,
    category: "Sports & Recreation",
    name: "Watersports Centre",
    description:
      "Windsurfing, sea kayaking, stand-up paddleboarding, snorkelling, and hobie cat sailing — all equipment provided, instructor-led for beginners. The reef snorkel trail departs daily at 7:30 AM.",
    img: "https://images.unsplash.com/photo-1565018054866-968e244971bc?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 5:30 PM",
    price: 1200,
    unit: "per person / activity",
    capacity: 15,
    times: ["7:00 AM", "7:30 AM", "9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM"],
  },
  {
    id: 20,
    category: "Sports & Recreation",
    name: "Deep Sea Fishing",
    description:
      "Half-day and full-day game fishing aboard a purpose-built 32-ft fibreglass bancas, targeting blue marlin, yellowfin tuna, and mahi-mahi. Expert local fishermen guide every trip; catches can be prepared for dinner.",
    img: "https://images.unsplash.com/photo-1622713486130-aa0177e64542?w=800&h=540&fit=crop&auto=format",
    hours: "5:30 AM – 12:00 PM",
    price: 8500,
    unit: "per boat (up to 4 guests)",
    capacity: 4,
    times: ["5:30 AM", "6:00 AM"],
  },
  {
    id: 21,
    category: "Sports & Recreation",
    name: "Nature Trails & Bird Watching",
    description:
      "Three kilometres of guided jungle trail through the island's interior, home to the Philippine cockatoo (katala), brahminy kite, and over forty endemic bird species. Dawn walks led by a certified naturalist.",
    img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=540&fit=crop&auto=format",
    hours: "5:30 AM – 6:00 PM",
    price: 700,
    unit: "per person",
    capacity: 8,
    times: ["5:30 AM", "7:00 AM", "4:00 PM"],
  },
  {
    id: 22,
    category: "Sports & Recreation",
    name: "Island Cycling",
    description:
      "Complimentary mountain bikes for guests to explore the island's 8-km perimeter trail. Electric bikes available for hire. A self-guided map with stops at the viewpoint, coconut grove, and tidal pools is provided at check-in.",
    img: "https://images.unsplash.com/photo-1571333250630-f0230c320b6d?w=800&h=540&fit=crop&auto=format",
    hours: "6:00 AM – 6:00 PM",
    price: 300,
    unit: "per person / half-day (e-bike)",
    capacity: 20,
    times: ["6:00 AM", "9:00 AM", "1:00 PM"],
  },

  // ── Experiences ──
  {
    id: 23,
    category: "Experiences",
    name: "Private Sandbar Picnic",
    description:
      "A deserted sandbar thirty minutes from the resort by bangka. Your butler prepares a full picnic setup — chilled champagne, fresh fruits, grilled seafood, and a floating hammock. The island disappears with the tide; arrive early and leave last.",
    img: "https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=800&h=540&fit=crop&auto=format",
    hours: "By arrangement",
    price: 15000,
    unit: "per couple (all-inclusive)",
    capacity: 4,
    times: ["8:00 AM", "10:00 AM"],
  },
  {
    id: 24,
    category: "Experiences",
    name: "Sunset Bangka Cruise",
    description:
      "A two-hour outrigger sail timed to golden hour — cold coconut water, whole grilled fish straight from the grill, and the Philippine sky doing everything else. Maximum eight guests per departure.",
    img: "https://images.unsplash.com/photo-1502791451862-7bd8c1df43a7?w=800&h=540&fit=crop&auto=format",
    hours: "4:00 PM – 7:00 PM",
    price: 3200,
    unit: "per person",
    capacity: 8,
    times: ["4:00 PM", "4:30 PM", "5:00 PM"],
  },
  {
    id: 25,
    category: "Experiences",
    name: "Private Beach BBQ",
    description:
      "A torchlit barbeque set up on your own stretch of beach by the resort team — whole suckling pig, blue crab, prawns, and live acoustic music. Available for two to twenty guests, fully staffed.",
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=540&fit=crop&auto=format",
    hours: "6:00 PM – 10:00 PM",
    price: 6500,
    unit: "per person (min. 2)",
    capacity: 20,
    times: ["6:00 PM", "6:30 PM", "7:00 PM"],
  },
  {
    id: 26,
    category: "Experiences",
    name: "Island Hopping — Hidden Lagoons",
    description:
      "A full-day guided bangka expedition through the Cuyo archipelago: secret lagoons, deserted limestone beaches, snorkelling over coral gardens, and lunch on a private cove prepared by your boat cook.",
    img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 4:00 PM",
    price: 5500,
    unit: "per person",
    capacity: 8,
    times: ["7:00 AM", "7:30 AM"],
  },
  {
    id: 27,
    category: "Experiences",
    name: "Cultural Immersion & Heritage Tour",
    description:
      "Private guided visits to Cuyo Island's 17th-century Spanish fort, heritage churches, local weaving cooperatives, and the daily wet market — curated itineraries that go deeper than any guidebook.",
    img: "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?w=800&h=540&fit=crop&auto=format",
    hours: "By arrangement",
    price: 4500,
    unit: "per person",
    capacity: 8,
    times: ["7:00 AM", "9:00 AM"],
  },
  {
    id: 28,
    category: "Experiences",
    name: "Private Chef's Table Dinner",
    description:
      "Reserve the kitchen counter for an exclusive seven-course tasting menu prepared personally by our executive chef using the morning's market haul. Wine pairing by our sommelier available. Limited to four guests.",
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 PM – 10:30 PM",
    price: 9500,
    unit: "per person",
    capacity: 4,
    times: ["7:00 PM", "7:30 PM"],
  },

  // ── Kids & Family ──
  {
    id: 29,
    category: "Kids & Family",
    name: "Pamalican Kids Club",
    description:
      "A dedicated jungle-edge clubhouse for ages 4–12 with arts & crafts, nature discovery, shell-painting, mini-cooking classes, and supervised pool sessions. Daily programmes run 9 AM to 5 PM; evening care available on request.",
    img: "https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?w=800&h=540&fit=crop&auto=format",
    hours: "9:00 AM – 5:00 PM",
    price: 800,
    unit: "per child / day",
    capacity: 15,
    times: ["9:00 AM", "1:00 PM"],
  },
  {
    id: 30,
    category: "Kids & Family",
    name: "In-Villa Babysitting",
    description:
      "Certified nannies, all first-aid trained and child-safety screened, available around the clock. Bilingual (English/Filipino). Advance booking preferred; same-day requests honoured when possible.",
    img: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=540&fit=crop&auto=format",
    hours: "24 hours",
    price: 600,
    unit: "per hour",
    capacity: 2,
    times: ["Any time — 24 hrs"],
  },
  {
    id: 31,
    category: "Kids & Family",
    name: "Junior Marine Biologist",
    description:
      "A two-hour guided reef walk and snorkel led by a marine scientist, specifically designed for children ages 6–14. Each child receives a waterproof species identification card and a marine journal to take home.",
    img: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&h=540&fit=crop&auto=format",
    hours: "8:00 AM – 12:00 PM",
    price: 1200,
    unit: "per child",
    capacity: 8,
    times: ["8:00 AM", "10:00 AM"],
  },

  // ── Events & Meetings ──
  {
    id: 32,
    category: "Events & Meetings",
    name: "Grand Ballroom",
    description:
      "A 600-capacity event hall with ten-metre ceilings, hand-painted capiz shell chandeliers, and a wraparound sea-view terrace. Full AV suite, dedicated event team, and in-house florists and caterers.",
    img: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&h=540&fit=crop&auto=format",
    hours: "By arrangement",
    price: 150000,
    unit: "per event",
    capacity: 600,
    times: ["Morning (8 AM)", "Afternoon (1 PM)", "Evening (6 PM)"],
  },
  {
    id: 33,
    category: "Events & Meetings",
    name: "Garden Terrace — Outdoor Ceremonies",
    description:
      "A torch-lined garden venue beneath the stars for intimate weddings, debut ceremonies, and private dinners. Capacity up to 80 guests, with on-site florist, sound, and catering coordination.",
    img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=540&fit=crop&auto=format",
    hours: "By arrangement",
    price: 85000,
    unit: "per event",
    capacity: 80,
    times: ["Morning (8 AM)", "Afternoon (1 PM)", "Evening (6 PM)"],
  },
  {
    id: 34,
    category: "Events & Meetings",
    name: "The Boardroom",
    description:
      "A 20-seat private meeting room with high-speed fibre, 4K display wall, video conferencing suite, and a dedicated events coordinator. Catered breakfast and lunch menus available. Ideal for executive retreats.",
    img: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 9:00 PM",
    price: 35000,
    unit: "per day",
    capacity: 20,
    times: ["7:00 AM", "9:00 AM", "1:00 PM"],
  },
  {
    id: 35,
    category: "Events & Meetings",
    name: "Beach Wedding Setup",
    description:
      "Full turnkey beach wedding coordination — bamboo archway with fresh tropical florals, Tiffany chairs, sound system, officiant coordination, photographer's platform, and a dedicated wedding planner from first inquiry to send-off.",
    img: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&h=540&fit=crop&auto=format",
    hours: "By arrangement",
    price: 250000,
    unit: "per event (package)",
    capacity: 150,
    times: ["Morning (8 AM)", "Afternoon (4 PM)", "Sunset (5:30 PM)"],
  },

  // ── Concierge Services ──
  {
    id: 36,
    category: "Guest Services",
    name: "Helicopter Island Transfer",
    description:
      "A private 40-minute helicopter flight from Manila or Puerto Princesa, landing directly on the resort's hilltop helipad. Seating for up to five guests with luggage. Champagne and canapés on arrival guaranteed.",
    img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=540&fit=crop&auto=format",
    hours: "By arrangement",
    price: 85000,
    unit: "per flight (up to 5 guests)",
    capacity: 5,
    times: ["6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"],
  },
  {
    id: 37,
    category: "Guest Services",
    name: "Personal Butler Assignment",
    description:
      "A dedicated butler available from 7 AM to midnight — managing villa setup, dining reservations, activity bookings, laundry, and any bespoke request. 24-hour butler service available for villa guests at upgrade.",
    img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 12:00 AM",
    price: 3500,
    unit: "per day",
    capacity: 1,
    times: ["Check-in assignment"],
  },
  {
    id: 38,
    category: "Guest Services",
    name: "Laundry & Valet Pressing",
    description:
      "Same-day laundry with 8 AM cutoff, returned pressed and folded by 6 PM. Express 4-hour service available. Dry cleaning, shoe shining, and garment steaming handled by the valet team.",
    img: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&h=540&fit=crop&auto=format",
    hours: "8:00 AM – 8:00 PM",
    price: 450,
    unit: "per item",
    capacity: 999,
    times: ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM"],
  },
  {
    id: 39,
    category: "Guest Services",
    name: "In-Villa Personal Chef",
    description:
      "A private chef assigned exclusively to your villa for breakfast, lunch, and dinner. Markets personally each morning and presents a bespoke menu based on your dietary preferences, allergies, and cravings.",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=540&fit=crop&auto=format",
    hours: "By arrangement",
    price: 12000,
    unit: "per day (all meals)",
    capacity: 6,
    times: ["Check-in arrangement"],
  },
  {
    id: 40,
    category: "Guest Services",
    name: "Island Boutique & Gift Shop",
    description:
      "A curated shop of Philippine artisan goods — hand-woven capiz jewellery, Palawan pearls, piña cloth shirts, single-origin cacao, and locally produced calamansi gin. Open daily; personal shopping assistance available.",
    img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=540&fit=crop&auto=format",
    hours: "9:00 AM – 8:00 PM",
    price: 0,
    unit: "complimentary access",
    capacity: 999,
    times: ["Anytime during boutique hours"],
  },

  // ── Guest Services ──
  {
    id: 41,
    category: "Guest Services",
    name: "24/7 Front Desk Assistance",
    description:
      "Our front desk team is available around the clock for check-in, check-out, room changes, local recommendations, and any request that cannot wait until morning. Same-day check-in available subject to availability.",
    img: "https://images.unsplash.com/photo-1563298564-e5ea0f91f4dd?w=800&h=540&fit=crop&auto=format",
    hours: "24 hours",
    price: 0,
    unit: "complimentary",
    capacity: 999,
    times: ["Any time — 24 hrs"],
  },
  {
    id: 42,
    category: "Guest Services",
    name: "Extra Bed & Baby Cot Request",
    description:
      "Rollaway beds (full-size, with premium linen) and baby cots (with mattress guard and night light) set up in your room before arrival or on request. Limited availability — book in advance to guarantee.",
    img: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&h=540&fit=crop&auto=format",
    hours: "By arrangement",
    price: 800,
    unit: "per night",
    capacity: 2,
    times: ["Check-in setup", "On request anytime"],
  },
  {
    id: 43,
    category: "Guest Services",
    name: "Luggage Storage & Delivery",
    description:
      "Secure climate-controlled luggage storage for early arrivals and late departures. Bell staff deliver to and from your room. Oversized item storage available. Tamper-proof tags issued at drop-off.",
    img: "https://images.unsplash.com/photo-1534534573898-db5148bc8b0c?w=800&h=540&fit=crop&auto=format",
    hours: "24 hours",
    price: 200,
    unit: "per item / day",
    capacity: 999,
    times: ["Any time — 24 hrs"],
  },
  {
    id: 44,
    category: "Guest Services",
    name: "Wake-up Call Service",
    description:
      "Scheduled wake-up calls delivered by a team member — not a recorded message. Early morning options include an optional freshly brewed barako coffee delivered to your door ten minutes after the call.",
    img: "https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=800&h=540&fit=crop&auto=format",
    hours: "Any time",
    price: 0,
    unit: "complimentary",
    capacity: 999,
    times: ["4:00 AM", "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "9:00 AM"],
  },
  {
    id: 45,
    category: "Guest Services",
    name: "Airport & Transportation Service",
    description:
      "Private car transfer between the airport and hotel in an air-conditioned Mercedes E-Class. Meet & greet by a uniformed chauffeur at arrivals. City tours, day trips, and inter-island bangka transfers also arranged.",
    img: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=540&fit=crop&auto=format",
    hours: "24 hours",
    price: 1500,
    unit: "per trip (up to 4 guests)",
    capacity: 4,
    times: ["On arrival / departure schedule"],
  },
  {
    id: 46,
    category: "Guest Services",
    name: "Housekeeping & Turn-down Service",
    description:
      "Daily housekeeping at a time of your choosing. Evening turn-down service includes fresh towel art, bedside chocolates, a sleep amenity kit, and soft ambient lighting preset before you return for the night.",
    img: "https://images.unsplash.com/photo-1527853787696-f7be74f2e39a?w=800&h=540&fit=crop&auto=format",
    hours: "7:00 AM – 10:00 PM",
    price: 0,
    unit: "complimentary (daily)",
    capacity: 999,
    times: ["Morning (8:00 AM)", "Afternoon (2:00 PM)", "Evening turn-down (7:00 PM)"],
  },
  // ── Business & Facilities ──
  {
    id: 48,
    category: "Business & Facilities",
    name: "Business Centre & Printing Hub",
    description:
      "A fully equipped workroom with high-speed fibre, private workstations, laser printing, scanning, shredding, courier dispatch, and a dedicated business concierge. Day-pass or hourly access.",
    img: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=540&fit=crop&auto=format",
    hours: "6:00 AM – 11:00 PM",
    price: 500,
    unit: "per person / day",
    capacity: 12,
    times: ["6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"],
    bookable: false,
  },
  {
    id: 49,
    category: "Business & Facilities",
    name: "Parking Area & Valet",
    description:
      "Covered basement parking for guests and visitors. Complimentary self-park for in-house guests. Valet service available at the main porte-cochère. EV charging stations on Level B2.",
    img: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&h=540&fit=crop&auto=format",
    hours: "24 hours",
    price: 300,
    unit: "per day (valet)",
    capacity: 120,
    times: ["Any time — 24 hrs"],
    bookable: false,
  },
  {
    id: 50,
    category: "Business & Facilities",
    name: "High-Speed Wi-Fi Access",
    description:
      "1 Gbps fibre throughout all rooms, villas, lobbies, pool decks, and outdoor areas. Single network, seamless roaming. Complimentary for all guests — no login codes, no time limits.",
    img: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=540&fit=crop&auto=format",
    hours: "24 hours",
    price: 0,
    unit: "complimentary",
    capacity: 999,
    times: ["Always on"],
    bookable: false,
  },
  {
    id: 51,
    category: "Business & Facilities",
    name: "The Calamansi Café",
    description:
      "An all-day café serving single-origin Benguet drip coffee, Spanish latte, pitaya smoothie bowls, avocado toast with kesong puti, and freshly baked pan de sal from the in-house bakery from 6 AM.",
    img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=540&fit=crop&auto=format",
    hours: "6:00 AM – 10:00 PM",
    price: 400,
    unit: "per person (minimum spend)",
    capacity: 30,
    times: ["6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"],
  },
  {
    id: 52,
    category: "Business & Facilities",
    name: "Mini Bar Restocking",
    description:
      "Request a custom mini bar setup for your room: craft beers, Philippine spirits (lambanog, calamansi gin), local snacks (chicharon, dried mangoes), or a non-alcoholic wellness kit. Stocked within the hour.",
    img: "https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=800&h=540&fit=crop&auto=format",
    hours: "10:00 AM – 10:00 PM",
    price: 1200,
    unit: "per kit",
    capacity: 999,
    times: ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"],
  },
  // ── Dining & Bars — additional ──
  {
    id: 53,
    category: "Dining & Bars",
    name: "Sunrise Breakfast Buffet",
    description:
      "A lavish spread served in the open-air Garden Pavilion every morning: live egg station, Filipino breakfast classics (garlic rice, longganisa, tapa), fresh tropical fruit carving, artisan bread, and barista coffee. The day's most important meal, done properly.",
    img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=540&fit=crop&auto=format",
    hours: "6:30 AM – 10:30 AM",
    price: 950,
    unit: "per person",
    capacity: 80,
    times: ["6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM"],
  },
  {
    id: 54,
    category: "Dining & Bars",
    name: "Lobby Lounge & Bar",
    description:
      "A refined gathering space at the heart of the hotel — grand rattan furniture, live acoustic music from 7 pm, a curated wine list, and signature cocktails inspired by Boracay's natural palette. Available all day for coffee, light bites, or evening drinks.",
    img: "https://images.unsplash.com/photo-1560624052-449f5ddf0c31?w=800&h=540&fit=crop&auto=format",
    hours: "10:00 AM – 1:00 AM",
    price: 600,
    unit: "per person (minimum spend)",
    capacity: 50,
    times: ["10:00 AM", "12:00 PM", "3:00 PM", "5:00 PM", "7:00 PM", "9:00 PM", "11:00 PM"],
  },
  // ── Spa & Wellness — standalone sauna ──
  {
    id: 55,
    category: "Spa & Wellness",
    name: "Cedar Sauna Session",
    description:
      "Private 45-minute sauna session in our hand-crafted Finnish cedar cabin. Includes cooling eucalyptus towels, a chilled infused water bar, and a post-sauna mineral body mist. Bookable as a standalone wind-down or as a prelude to any spa treatment.",
    img: "https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800&h=540&fit=crop&auto=format",
    hours: "9:00 AM – 9:00 PM",
    price: 1500,
    unit: "per session (up to 2 persons)",
    capacity: 2,
    times: ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"],
  },
  // ── Sports & Recreation — games ──
  {
    id: 56,
    category: "Sports & Recreation",
    name: "The Games Lounge",
    description:
      "An adults-and-kids recreation room stocked with billiards, table tennis, foosball, board games, and a retro arcade corner. Two large screens for gaming consoles. Perfect for rainy afternoons, family bonding, or a competitive detour between beach sessions.",
    img: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&h=540&fit=crop&auto=format",
    hours: "10:00 AM – 11:00 PM",
    price: 350,
    unit: "per person / half-day",
    capacity: 20,
    times: ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"],
  },
  // ── Events & Meetings — birthday/special ──
  {
    id: 57,
    category: "Events & Meetings",
    name: "Birthday & Anniversary Package",
    description:
      "A fully curated celebration setup: floral arch or balloon styling, custom celebration cake from our pastry kitchen, romantic poolside or beachside table for two, a bottle of Moët & Chandon, and a dedicated events host throughout the evening. Available for groups up to 30.",
    img: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=800&h=540&fit=crop&auto=format",
    hours: "10:00 AM – 10:00 PM",
    price: 8500,
    unit: "per event",
    capacity: 30,
    times: ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "7:00 PM"],
  },
  // ── Guest Services — baby cot ──
  {
    id: 58,
    category: "Guest Services",
    name: "Baby Cot / Extra Bed Setup",
    description:
      "Request a standard travel cot with fitted cot sheet and a small baby safety kit, or a full rollaway extra bed with premium linens and pillow selection. Set up in your room within 30 minutes. Baby cot available for children up to 24 months.",
    img: "https://images.unsplash.com/photo-1566069733514-dd19e22424a0?w=800&h=540&fit=crop&auto=format",
    hours: "8:00 AM – 8:00 PM",
    price: 800,
    unit: "per night",
    capacity: 999,
    times: ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"],
  },
];

type Room = (typeof ROOMS)[0];
type Amenity = (typeof AMENITIES)[0];

type PaymentMethod = "card" | "gcash" | "maya" | "bank";

type PaymentData = {
  method: PaymentMethod;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  ewalletNumber: string;
  bankName: string;
  accountName: string;
  bankReference: string;
};

const EMPTY_PAYMENT: PaymentData = {
  method: "card",
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
  ewalletNumber: "",
  bankName: "",
  accountName: "",
  bankReference: "",
};

type AmenityBookingData = {
  refNum: string;
  date: string;
  time: string;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  requests: string;
  payment: PaymentData;
};

type BookingData = {
  refNum: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  floor: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  requests: string;
  paymentPercentage: number;
  payment: PaymentData;
};

type View = "search" | "listings" | "confirm" | "amenities" | "portal" | "offers" | "casino";

type AuthUser = {
  name: string;
  email: string;
  avatar: string;
  role: "guest" | "staff" | "admin";
};

type BookingStatus = "upcoming" | "checked-in" | "completed" | "cancelled";
type ChargeType = "Minibar" | "Dining / room service" | "Incidentals / damages";
type ChargeItem = {
  id: string;
  type: ChargeType;
  description: string;
  amount: number;
};
type PaymentPurpose = "Deposit" | "Balance at check-in" | "Check-out payment" | "Refund";
type PaymentHistoryItem = {
  id: string;
  date: string;
  method: string;
  amount: number;
  purpose: PaymentPurpose;
};

type BookingRecord = {
  id: string;
  kind: "room" | "amenity";
  roomId?: number;
  floor?: number;
  name: string;
  category: string;
  img: string;
  date: string;        // check-in for rooms, booking date for amenities
  endDate?: string;    // check-out for rooms
  time?: string;       // for amenities
  guests: number;
  total: number;
  amountPaid?: number;
  paymentMethod: string;
  status: BookingStatus;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  refNum: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  roomAccessCode?: string;
  charges?: ChargeItem[];
  extraCharges?: number; // Legacy total retained for previously saved browser records.
  finalTotal?: number;
  receiptNo?: string;
  checkoutPaymentMethod?: string;
  depositPaid?: number;
  checkInPayment?: number;
  checkoutPayment?: number;
  vatAmount?: number;
  serviceCharge?: number;
  paymentHistory?: PaymentHistoryItem[];
  refundAmount?: number;
  refundMethod?: string;
  refundedAt?: string;
  offerName?: string;
  nonRefundable?: boolean;
};

function BookingAdminSyncNotice({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed right-4 top-4 z-[120] max-w-md border border-[#c86464] bg-[#1a1814] px-5 py-4 text-sm leading-6 text-[#f0ece4] shadow-2xl"
    >
      <strong className="block text-[#d47b5f]">Staff notification failed</strong>
      {message}
    </div>
  );
}

const today = new Date().toISOString().split("T")[0];
const BOOKINGS_STORAGE_KEY = "red5star-bookings";

function loadStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function datesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return new Date(startA).getTime() < new Date(endB).getTime()
    && new Date(startB).getTime() < new Date(endA).getTime();
}

function useDialogAccessibility(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";
    const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    (focusable[0] ?? dialog)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      const openDialogs = Array.from(document.querySelectorAll<HTMLElement>("[role='dialog']"));
      if (openDialogs[openDialogs.length - 1] !== dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const activeItems = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (activeItems.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = activeItems[0];
      const last = activeItems[activeItems.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return dialogRef;
}

const COUNTRIES = [
  "Philippines","Australia","Bahrain","Canada","China","Denmark","Finland","France","Germany",
  "Hong Kong","India","Indonesia","Ireland","Italy","Japan","Kuwait","Malaysia","Mexico",
  "Netherlands","New Zealand","Norway","Oman","Qatar","Saudi Arabia","Singapore","South Korea",
  "Spain","Sweden","Switzerland","Taiwan","Thailand","United Arab Emirates","United Kingdom",
  "United States","Vietnam","Brazil","Argentina","South Africa","Russia","Egypt",
];

type HotelOffer = {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  img: string;
  tag: string;
  color: string;
  nonRefundable: boolean;
};

const OFFERS: HotelOffer[] = [
  {
    id: 1,
    badge: "SIGNATURE PACKAGE",
    title: "The Red Bundle",
    subtitle: "Room · Breakfast · Spa",
    description: "Our most complete escape — one seamless rate covering your suite, a curated full breakfast for two, and a 90-minute couples' spa ritual at the Red Spa.",
    cta: "View Package",
    img: "https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=900&h=600&fit=crop&auto=format",
    tag: "MOST POPULAR",
    color: "#c9a96e",
    nonRefundable: false,
  },
  {
    id: 2,
    badge: "SAVE UP TO 30%",
    title: "Early Bird Saver",
    subtitle: "Book 30 days ahead",
    description: "Reserve your room at least 30 days before arrival and receive up to 30% off our best available rate. Non-refundable; full payment at booking.",
    cta: "Book Early",
    img: "https://images.unsplash.com/photo-1596178067639-5c6e68aea6dc?w=900&h=600&fit=crop&auto=format",
    tag: "LIMITED OFFER",
    color: "#7bbf8e",
    nonRefundable: true,
  },
  {
    id: 3,
    badge: "FRIDAY NIGHTS",
    title: "Boracay Beach Kamayan",
    subtitle: "Dining · Every Friday",
    description: "A long-table feast on the beach — fresh seafood, whole suckling pig, tropical sides, and live kulintang music. Hosted every Friday night at 7 PM.",
    cta: "Reserve a Table",
    img: "https://images.unsplash.com/photo-1562158079-e4b9ed06b62d?w=900&h=600&fit=crop&auto=format",
    tag: "FRIDAY EVENT",
    color: "#d47b5f",
    nonRefundable: false,
  },
  {
    id: 4,
    badge: "FOR COUPLES",
    title: "Honeymoon Escape",
    subtitle: "Romance · Seclusion · Bliss",
    description: "Flower-strewn turndown, chilled champagne on arrival, a private beachside dinner for two, and a sunrise island boat charter. Crafted for newlyweds.",
    cta: "Plan Your Escape",
    img: "https://images.unsplash.com/photo-1550155891-1ab2d265d9c3?w=900&h=600&fit=crop&auto=format",
    tag: "ROMANTIC",
    color: "#c9a96e",
    nonRefundable: false,
  },
  {
    id: 5,
    badge: "MULTI-ACTIVITY",
    title: "Island Explorer Package",
    subtitle: "Snorkelling · Kayaking · Island Hop",
    description: "Three full days of guided activities — coral reef snorkelling, mangrove kayak tour, and a private inter-island cruise. Equipment, guides, and transfers included.",
    cta: "Explore Now",
    img: "https://images.unsplash.com/photo-1714572877794-b8a10e6fc2e1?w=900&h=600&fit=crop&auto=format",
    tag: "ADVENTURE",
    color: "#5b9bbf",
    nonRefundable: false,
  },
  {
    id: 6,
    badge: "KIDS STAY FREE",
    title: "Family Splash Package",
    subtitle: "Families · 2 Adults · 2 Children",
    description: "Two children under 12 stay and eat free. Includes access to the Red Aqua Kids' Club, guided snorkel lesson, daily breakfast buffet, and early check-in.",
    cta: "Book for the Family",
    img: "https://images.unsplash.com/photo-1648090272983-440e86555e8e?w=900&h=600&fit=crop&auto=format",
    tag: "FAMILY",
    color: "#8fc9a5",
    nonRefundable: false,
  },
];

const CASINO_GAMES = [
  { id:1, name:"Punto Banco Baccarat", category:"Card Games", minBet:500, maxBet:500000, tables:8, img:"https://images.unsplash.com/photo-1517232115160-ff93364542dd?w=800&h=540&fit=crop&auto=format", description:"The Philippines' most-played casino game. Eight tables ranging from mass to premium VIP, operated with a six-deck shoe. Banker, Player, and Tie bets accepted." },
  { id:2, name:"European Blackjack", category:"Card Games", minBet:300, maxBet:200000, tables:6, img:"https://images.unsplash.com/photo-1626775238053-4315516eedc9?w=800&h=540&fit=crop&auto=format", description:"Six-deck shoe, dealer stands on soft 17. Doubling, splitting, and late surrender available. Side bets: Perfect Pairs and 21+3 on all tables." },
  { id:3, name:"American Roulette", category:"Table Games", minBet:100, maxBet:100000, tables:4, img:"https://images.unsplash.com/photo-1714865212807-3ae87635a38d?w=800&h=540&fit=crop&auto=format", description:"Double-zero wheel with full inside and outside betting. Electronic display showing last 20 results. Minimum ₱100 on outside bets; ₱500 on straight-up." },
  { id:4, name:"European Roulette", category:"Table Games", minBet:200, maxBet:150000, tables:3, img:"https://images.unsplash.com/photo-1592398191627-25b41eeaa398?w=800&h=540&fit=crop&auto=format", description:"Single-zero wheel — better odds for the player. En prison rule applies on even-money bets. Premium tables with leather chairs and champagne service." },
  { id:5, name:"Texas Hold'em Poker", category:"Poker", minBet:500, maxBet:0, tables:10, img:"https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=800&h=540&fit=crop&auto=format", description:"Ten tournament-grade felt tables. Cash games run 24/7; tournaments every Saturday at 8 PM. Stakes from ₱500/₱1,000 blinds to high-roller ₱10k/₱20k tables." },
  { id:6, name:"Three Card Poker", category:"Poker", minBet:200, maxBet:50000, tables:4, img:"https://images.unsplash.com/photo-1596451190630-186aff535bf2?w=800&h=540&fit=crop&auto=format", description:"Fast-paced three-card hand against the dealer. Ante, Play, and Pair Plus bets. Mini Royal pays 1000:1. Ideal for players wanting quick rounds." },
  { id:7, name:"Dragon Tiger", category:"Card Games", minBet:100, maxBet:200000, tables:5, img:"https://images.unsplash.com/photo-1446669052213-5dcff53f1f3f?w=800&h=540&fit=crop&auto=format", description:"Asia's fastest card game — Dragon card vs Tiger card, highest wins. Dozens of side bets including Suited, Big, Small. New shoe every 20 hands." },
  { id:8, name:"Sic Bo", category:"Dice Games", minBet:100, maxBet:100000, tables:3, img:"https://images.unsplash.com/photo-1726004592905-dc5cd794bda6?w=800&h=540&fit=crop&auto=format", description:"Traditional Chinese dice game with three shakers. Over 50 bet types covering totals, combinations, doubles, and triples. Popular with Asian high-rollers." },
  { id:9, name:"Casino War", category:"Card Games", minBet:100, maxBet:50000, tables:3, img:"https://images.unsplash.com/photo-1646808911492-3417a0c45a57?w=800&h=540&fit=crop&auto=format", description:"Simplest table game in the house — one card vs dealer, highest wins. Tie side bet pays 10:1. Great entry point for first-time casino guests." },
  { id:10, name:"Craps", category:"Dice Games", minBet:200, maxBet:100000, tables:2, img:"https://images.unsplash.com/photo-1714865212071-af955dd429b8?w=800&h=540&fit=crop&auto=format", description:"The loudest table on the floor. Pass/Don't Pass, Come/Don't Come, and all major proposition bets. Stick and boxman on every game. High energy, high drama." },
  { id:11, name:"Slot Machines", category:"Electronic Gaming", minBet:1, maxBet:5000, tables:200, img:"https://images.unsplash.com/photo-1706129867447-b4f156c46641?w=800&h=540&fit=crop&auto=format", description:"200 machines across three sections: Classic Slots (3-reel), Video Slots (5-reel), and Progressive Jackpots. Denominations from ₱1 to ₱5,000 per spin." },
  { id:12, name:"VIP Private Room", category:"VIP", minBet:10000, maxBet:10000000, tables:4, img:"https://images.unsplash.com/photo-1674168461942-debd1706396c?w=800&h=540&fit=crop&auto=format", description:"By invitation or advance booking. Four private rooms with dedicated dealer, butler, and personal sommelier. Baccarat, Blackjack, and Roulette available. Maximum privacy." },
];

const CHIP_DENOMINATIONS = [
  { value: 500,    color: "#c0c0c0", label: "White",   hex: "#e8e8e8" },
  { value: 1000,   color: "#c9a96e", label: "Gold",    hex: "#c9a96e" },
  { value: 5000,   color: "#d47b5f", label: "Red",     hex: "#d47b5f" },
  { value: 10000,  color: "#5b9bbf", label: "Blue",    hex: "#5b9bbf" },
  { value: 25000,  color: "#7bbf8e", label: "Green",   hex: "#7bbf8e" },
  { value: 50000,  color: "#9c5fbf", label: "Purple",  hex: "#9c5fbf" },
  { value: 100000, color: "#bf5f5f", label: "Crimson", hex: "#bf5f5f" },
];

const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill={s <= Math.round(rating) ? "#c9a96e" : "none"}
          stroke="#c9a96e"
          strokeWidth="1"
        >
          <polygon points="5,1 6.2,3.8 9.3,3.8 6.9,5.7 7.8,8.7 5,7 2.2,8.7 3.1,5.7 0.7,3.8 3.8,3.8" />
        </svg>
      ))}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs px-2 py-0.5 border rounded-full"
      style={{
        borderColor: "#2a2620",
        color: "#a89880",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </span>
  );
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; sub: string; icon: string }[] = [
  { id: "card", label: "Credit / Debit Card", sub: "Visa, Mastercard, JCB", icon: "💳" },
  { id: "gcash", label: "GCash", sub: "Instant e-wallet transfer", icon: "📱" },
  { id: "maya", label: "Maya", sub: "PayMaya / Maya wallet", icon: "🔵" },
  { id: "bank", label: "Online Banking", sub: "BancNet / InstaPay", icon: "🏦" },
];

function validatePHMobile(n: string): string | null {
  const clean = n.replace(/[\s\-()]/g, "");
  if (/^(09\d{9}|\+639\d{9})$/.test(clean)) return null;
  if (clean.length === 0) return "Required";
  return "Enter a valid PH number: 09XXXXXXXXX or +639XXXXXXXXX";
}

function validateCard(n: string): string | null {
  const clean = n.replace(/\D/g, "");
  if (!/^\d{16}$/.test(clean)) return "Enter exactly 16 digits";
  return null;
}

function validateExpiry(e: string): string | null {
  const m = e.match(/^(\d{1,2})\s*\/\s*(\d{2})$/);
  if (!m) return "Format: MM / YY";
  const mo = parseInt(m[1]); const yr = parseInt("20" + m[2]);
  if (mo < 1 || mo > 12) return "Invalid month";
  const now = new Date(); const expDate = new Date(yr, mo - 1, 1);
  if (expDate < new Date(now.getFullYear(), now.getMonth(), 1)) return "Card has expired";
  return null;
}

function validateCVV(c: string): string | null {
  if (!/^\d{3,4}$/.test(c)) return "3 or 4 digits required";
  return null;
}

function validateBankRef(r: string): string | null {
  if (r.trim().length < 6) return "Enter a valid reference number";
  return null;
}

function validatePayment(payment: PaymentData): string | null {
  if (payment.method === "card") {
    if (!payment.cardName.trim()) return "Enter the name on the card.";
    return validateCard(payment.cardNumber)
      ?? validateExpiry(payment.expiry)
      ?? validateCVV(payment.cvv);
  }
  if (payment.method === "gcash" || payment.method === "maya") {
    return validatePHMobile(payment.ewalletNumber);
  }
  if (!payment.bankName) return "Select your bank.";
  if (!payment.accountName.trim()) return "Enter the bank account name.";
  return validateBankRef(payment.bankReference);
}

function getPaymentErrors(payment: PaymentData) {
  return {
    cardName: payment.method === "card" && !payment.cardName.trim() ? "Enter the name on the card." : null,
    cardNumber: payment.method === "card" ? validateCard(payment.cardNumber) : null,
    expiry: payment.method === "card" ? validateExpiry(payment.expiry) : null,
    cvv: payment.method === "card" ? validateCVV(payment.cvv) : null,
    ewalletNumber: payment.method === "gcash" || payment.method === "maya" ? validatePHMobile(payment.ewalletNumber) : null,
    bankName: payment.method === "bank" && !payment.bankName ? "Select your bank." : null,
    accountName: payment.method === "bank" && !payment.accountName.trim() ? "Enter the bank account name." : null,
    bankReference: payment.method === "bank" ? validateBankRef(payment.bankReference) : null,
  };
}

function paymentMethodLabel(payment: PaymentData) {
  return PAYMENT_METHODS.find((item) => item.id === payment.method)?.label ?? "Card";
}

function maskedPaymentDetail(payment: PaymentData) {
  if (payment.method === "card") return `Card •••• ${payment.cardNumber.replace(/\D/g, "").slice(-4)}`;
  if (payment.method === "gcash" || payment.method === "maya") return `${payment.method === "gcash" ? "GCash" : "Maya"} •••• ${payment.ewalletNumber.replace(/\D/g, "").slice(-4)}`;
  return `${payment.bankName || "Bank"} reference •••• ${payment.bankReference.replace(/\s/g, "").slice(-4)}`;
}

function PaymentConfirmationDialog({
  payment,
  amount,
  reference,
  onBack,
  onConfirm,
}: {
  payment: PaymentData;
  amount: number;
  reference: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const confirmationLockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const closeBeforeConfirmation = () => {
    if (!confirmationLockedRef.current) onBack();
  };
  const dialogRef = useDialogAccessibility(closeBeforeConfirmation);
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);
  const confirm = () => {
    if (confirmationLockedRef.current) return;
    confirmationLockedRef.current = true;
    setConfirmed(true);
    timerRef.current = window.setTimeout(onConfirm, 650);
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(14,13,11,0.96)" }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="payment-confirmation-title" tabIndex={-1} className="w-full max-w-md border p-6 md:p-8" style={{ background: "#0e0d0b", borderColor: "#c9a96e55" }}>
        {confirmed ? (
          <div className="py-8 text-center" role="status">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border" style={{ borderColor: "#6cc87a", color: "#6cc87a", fontSize: "26px" }}>✓</div>
            <h2 id="payment-confirmation-title" style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: "#f0ece4" }}>Payment confirmed</h2>
            <p className="mt-3" style={{ color: "#a89880", fontSize: "14px" }}>₱{amount.toLocaleString()} has been recorded successfully.</p>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.18em", textTransform: "uppercase" }}>Review payment</p>
            <h2 id="payment-confirmation-title" className="mt-2" style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: "#f0ece4" }}>Confirm Payment</h2>
            <div className="mt-6 border p-4 flex flex-col gap-3" style={{ borderColor: "#2a2620", background: "#161410" }}>
              {[
                ["Method", paymentMethodLabel(payment)],
                ["Amount", `₱${amount.toLocaleString()}`],
                ["Reservation reference", reference],
                ["Payment account", maskedPaymentDetail(payment)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                  <span style={{ color: "#a89880", fontSize: "12px" }}>{label}</span>
                  <strong style={{ color: "#f0ece4", fontSize: "14px", textAlign: "right" }}>{value}</strong>
                </div>
              ))}
            </div>
            <p className="mt-4" style={{ color: "#a89880", fontSize: "13px", lineHeight: 1.6 }}>No payment is recorded until you select Confirm Payment.</p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={closeBeforeConfirmation} disabled={confirmed} className="min-h-11 flex-1 border px-5 disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: "#2a2620", color: "#a89880" }}>Back</button>
              <button type="button" onClick={confirm} className="min-h-11 flex-[2] px-5" style={{ background: "#c9a96e", color: "#0e0d0b", fontWeight: 700 }}>Confirm Payment</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentStep({
  payment,
  setPayment,
  inputStyle,
  labelStyle,
  amountDue,
  showErrors = false,
}: {
  payment: PaymentData;
  setPayment: (p: PaymentData) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  amountDue?: number;
  showErrors?: boolean;
}) {
  const errors = getPaymentErrors(payment);
  const errStyle: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "12px", color: "#ef9b82", letterSpacing: "0.02em", marginTop: "5px", lineHeight: 1.5 };
  return (
    <div className="flex flex-col gap-5">
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Payment Method
      </p>

      {/* Method selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PAYMENT_METHODS.map((m) => {
          const active = payment.method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setPayment({ ...payment, method: m.id })}
              className="flex items-start gap-3 p-3 border text-left transition-all"
              style={{
                borderColor: active ? "#c9a96e" : "#2a2620",
                background: active ? "rgba(201,169,110,0.06)" : "#1a1814",
              }}
            >
              <span style={{ fontSize: "18px", lineHeight: 1, marginTop: "1px" }}>{m.icon}</span>
              <div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: active ? "#f0ece4" : "#a89880", fontWeight: active ? 600 : 400 }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.05em", marginTop: "2px" }}>
                  {m.sub}
                </div>
              </div>
              <div
                className="ml-auto mt-0.5 w-3.5 h-3.5 rounded-full border flex-shrink-0"
                style={{ borderColor: active ? "#c9a96e" : "#2a2620", background: active ? "#c9a96e" : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      {/* Card fields */}
      {payment.method === "card" && (
        <div className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Name on Card</label>
            <input
              type="text"
              required
              placeholder="JUAN DELA CRUZ"
              value={payment.cardName}
              onChange={(e) => setPayment({ ...payment, cardName: e.target.value })}
              style={inputStyle}
            />
            {(showErrors || payment.cardName) && errors.cardName && <p role="alert" style={errStyle}>{errors.cardName}</p>}
          </div>
          <div>
            <label style={labelStyle}>Card Number</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              required
              placeholder="0000 0000 0000 0000"
              pattern="[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}"
              title="Enter a 16-digit card number"
              minLength={19}
              maxLength={19}
              value={payment.cardNumber}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                setPayment({ ...payment, cardNumber: formatted });
              }}
              style={{ ...inputStyle, letterSpacing: "0.1em", borderColor: payment.cardNumber && validateCard(payment.cardNumber) ? "#d47b5f" : (inputStyle.border as string | undefined)?.split(" ").pop() ?? "#2a2620" }}
            />
            {(showErrors || payment.cardNumber) && errors.cardNumber && <p role="alert" style={errStyle}>{errors.cardNumber}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Expiry (MM / YY)</label>
              <input
                type="text"
                required
                placeholder="MM / YY"
                maxLength={7}
                value={payment.expiry}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                  const formatted = raw.length > 2 ? raw.slice(0, 2) + " / " + raw.slice(2) : raw;
                  setPayment({ ...payment, expiry: formatted });
                }}
                style={{ ...inputStyle, borderColor: payment.expiry && validateExpiry(payment.expiry) ? "#d47b5f" : "#2a2620" }}
              />
              {(showErrors || payment.expiry) && errors.expiry && <p role="alert" style={errStyle}>{errors.expiry}</p>}
            </div>
            <div>
              <label style={labelStyle}>CVV</label>
              <input
                type="password"
                required
                placeholder="•••"
                maxLength={4}
                value={payment.cvv}
                onChange={(e) => setPayment({ ...payment, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                style={{ ...inputStyle, borderColor: payment.cvv && validateCVV(payment.cvv) ? "#d47b5f" : "#2a2620" }}
              />
              {(showErrors || payment.cvv) && errors.cvv && <p role="alert" style={errStyle}>{errors.cvv}</p>}
            </div>
          </div>
        </div>
      )}

      {/* GCash / Maya */}
      {(payment.method === "gcash" || payment.method === "maya") && (
        <div className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>{payment.method === "gcash" ? "GCash" : "Maya"} Mobile Number</label>
            <input
              type="tel"
              required
              placeholder="09XXXXXXXXX  or  +639XXXXXXXXX"
              value={payment.ewalletNumber}
              onChange={(e) => setPayment({ ...payment, ewalletNumber: e.target.value })}
              style={{ ...inputStyle, borderColor: payment.ewalletNumber && validatePHMobile(payment.ewalletNumber) ? "#d47b5f" : "#2a2620" }}
            />
            {(showErrors || payment.ewalletNumber) && errors.ewalletNumber && (
              <p role="alert" style={errStyle}>{errors.ewalletNumber}</p>
            )}
            {payment.ewalletNumber && !validatePHMobile(payment.ewalletNumber) && (
              <p style={{ ...errStyle, color: "#7bbf8e" }}>✓ Valid Philippine mobile number</p>
            )}
          </div>
          {/* QR Code */}
          <div className="border p-5 flex flex-col items-center gap-4" style={{ borderColor: "#2a2620", background: "#1a1814" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Scan to Pay via {payment.method === "gcash" ? "GCash" : "Maya"}
            </p>
            <div style={{ background: "#ffffff", padding: "12px", display: "inline-block" }}>
              <QRCodeSVG
                value={`${payment.method === "gcash" ? "gcash" : "maya"}://pay?merchant=red5starshotel&account=${payment.method === "gcash" ? "09171234567" : "09281234567"}&name=Red+5+Star+Hotel${amountDue ? `&amount=${amountDue}` : ""}`}
                size={140}
                bgColor="#ffffff"
                fgColor="#1a1512"
                level="M"
              />
            </div>
            <div className="text-center">
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#7a6f60", lineHeight: "1.7" }}>
                Open your <strong style={{ color: "#a89880" }}>{payment.method === "gcash" ? "GCash" : "Maya"}</strong> app → Scan QR → {amountDue ? `Pay ₱${amountDue.toLocaleString()}` : "Enter amount → Pay"}
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#5a5040", marginTop: "6px", letterSpacing: "0.1em" }}>
                Merchant: Red 5 Star Hotel · {payment.method === "gcash" ? "09171234567" : "09281234567"}
              </p>
            </div>
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#5a5040", textAlign: "center", lineHeight: "1.7" }}>
            Or enter your number above and we'll send a payment request to your app.
          </p>
        </div>
      )}

      {/* Bank transfer */}
      {payment.method === "bank" && (
        <div className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Bank Name</label>
            <select
              required
              value={payment.bankName}
              onChange={(e) => setPayment({ ...payment, bankName: e.target.value })}
              style={inputStyle}
            >
              <option value="" style={{ background: "#1a1814" }}>Select your bank</option>
              {["BDO", "BPI", "Metrobank", "PNB", "UnionBank", "Security Bank", "RCBC", "Landbank"].map((b) => (
                <option key={b} value={b} style={{ background: "#1a1814" }}>{b}</option>
              ))}
            </select>
            {showErrors && errors.bankName && <p role="alert" style={errStyle}>{errors.bankName}</p>}
          </div>
          <div>
            <label style={labelStyle}>Account Name</label>
            <input
              type="text"
              required
              placeholder="As registered with your bank"
              value={payment.accountName}
              onChange={(e) => setPayment({ ...payment, accountName: e.target.value })}
              style={inputStyle}
            />
            {(showErrors || payment.accountName) && errors.accountName && <p role="alert" style={errStyle}>{errors.accountName}</p>}
          </div>
          <div>
            <label style={labelStyle}>Transaction Reference</label>
            <input
              type="text"
              required
              placeholder="Enter the transfer reference"
              value={payment.bankReference}
              onChange={(e) => setPayment({ ...payment, bankReference: e.target.value })}
              style={{
                ...inputStyle,
                borderColor: payment.bankReference && validateBankRef(payment.bankReference) ? "#d47b5f" : "#2a2620",
              }}
            />
            {(showErrors || payment.bankReference) && errors.bankReference && (
              <p role="alert" style={errStyle}>{errors.bankReference}</p>
            )}
          </div>
          <div
            className="p-4 border"
            style={{ borderColor: "#2a2620", background: "#1a1814" }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
              Bank Transfer Details
            </p>
            <div className="flex gap-5 items-start">
              <div style={{ background: "#ffffff", padding: "10px", flexShrink: 0 }}>
                <QRCodeSVG
                  value={`bank://transfer?account=004578912345&name=Red+5+Star+Hotel+Corp&bank=BDO${amountDue ? `&amount=${amountDue}` : ""}`}
                  size={100}
                  bgColor="#ffffff"
                  fgColor="#1a1512"
                  level="M"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {[
                  { label: "Bank", val: "BDO Unibank" },
                  { label: "Account Name", val: "Red 5 Star Hotel Corp." },
                  { label: "Account No.", val: "0045-7891-2345" },
                  { label: "Reference", val: "Your booking confirmation no." },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.1em" }}>{label}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#a89880", textAlign: "right" }}>{val}</span>
                  </div>
                ))}
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#5a5040", marginTop: "4px", letterSpacing: "0.08em" }}>
                  Scan QR with your banking app to auto-fill details
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroSection({
  search,
  setSearch,
  onSearch,
  onAmenities,
  onPortal,
  onOffers,
  onCasino,
  onSignIn,
  onSignUp,
  onLogout,
  user,
  bookingCount,
}: {
  search: { checkIn: string; checkOut: string; guests: number; type: string };
  setSearch: (s: typeof search) => void;
  onSearch: () => void;
  onAmenities: (tab?: AmenityTab) => void;
  onPortal: () => void;
  onOffers: () => void;
  onCasino: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onLogout: () => void;
  user: AuthUser | null;
  bookingCount: number;
}) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1800&h=1200&fit=crop&auto=format"
          alt="Red 5 Star Hotel beachfront"
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.32)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(14,13,11,0.1) 0%, rgba(14,13,11,0.6) 60%, rgba(14,13,11,1) 100%)",
          }}
        />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8 md:px-16">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center rounded border"
            style={{ borderColor: "#c9a96e" }}
          >
            <span style={{ color: "#c9a96e", fontFamily: "var(--font-display)", fontSize: "14px" }}>R</span>
          </div>
          <span
            className="text-lg tracking-widest uppercase"
            style={{ fontFamily: "var(--font-body)", color: "#f0ece4", letterSpacing: "0.25em", fontSize: "13px" }}
          >
            Red 5 Star Hotel
          </span>
        </div>
        <div
          className="hidden md:flex items-center gap-8 text-sm"
          style={{ color: "#a89880", fontFamily: "var(--font-body)" }}
        >
          <button onClick={onSearch} className="hover:text-[#f0ece4] transition-colors" style={{ background: "none", color: "inherit", fontFamily: "inherit", fontSize: "inherit" }}>Rooms</button>
          <button onClick={() => onAmenities("Dining & Bars")} className="hover:text-[#f0ece4] transition-colors" style={{ background: "none", color: "inherit", fontFamily: "inherit", fontSize: "inherit" }}>Dining</button>
          <button onClick={() => onAmenities("Spa & Wellness")} className="hover:text-[#f0ece4] transition-colors" style={{ background: "none", color: "inherit", fontFamily: "inherit", fontSize: "inherit" }}>Spa</button>
          <button onClick={() => onAmenities("Experiences")} className="hover:text-[#f0ece4] transition-colors" style={{ background: "none", color: "inherit", fontFamily: "inherit", fontSize: "inherit" }}>Experiences</button>
          <button onClick={onCasino} className="hover:text-[#f0ece4] transition-colors" style={{ background: "none", color: "#a89880", fontFamily: "inherit", fontSize: "inherit" }}>Casino</button>
          <button onClick={onOffers} className="hover:text-[#f0ece4] transition-colors" style={{ background: "none", color: "#c9a96e", fontFamily: "inherit", fontSize: "inherit" }}>Offers</button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex min-h-11 items-center gap-2 rounded-full border border-[#c9a96e] bg-[#0e0d0b]/90 py-1 pl-1 pr-4 text-sm text-[#f0ece4]" title={user.name}>
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#c9a96e] font-semibold text-[#0e0d0b]">{user.avatar}</span>
                <span className="max-w-40 truncate">{user.name}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="min-h-11 px-4 border transition-colors"
                style={{ borderColor: "#2a2620", color: "#a89880", fontFamily: "var(--font-body)", fontSize: "13px", background: "rgba(14,13,11,0.5)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = "#c86464";
                  event.currentTarget.style.color = "#ef9b82";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = "#2a2620";
                  event.currentTarget.style.color = "#a89880";
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onSignIn}
                className="min-h-11 text-sm px-4 flex items-center gap-2 transition-colors"
                style={{ border: "1px solid #2a2620", color: "#a89880", fontFamily: "var(--font-body)", background: "rgba(14,13,11,0.5)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#7a6f60"; (e.currentTarget as HTMLElement).style.color = "#f0ece4"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2620"; (e.currentTarget as HTMLElement).style.color = "#a89880"; }}
              >
                Sign in
              </button>
              <button
                onClick={onSignUp}
                className="min-h-11 text-sm px-4 transition-colors"
                style={{ background: "#c9a96e", color: "#0e0d0b", fontFamily: "var(--font-body)", fontWeight: 600 }}
              >
                Sign up
              </button>
            </div>
          )}
          <button
            onClick={onPortal}
            className="text-sm px-5 py-2 border transition-colors flex items-center gap-2"
            style={{ borderColor: "#c9a96e", color: "#c9a96e", fontFamily: "var(--font-body)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#0e0d0b"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
          >
            My Bookings
            {bookingCount > 0 && (
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs" style={{ background: "#c9a96e", color: "#0e0d0b", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                {bookingCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Hero text */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-8 md:px-16 pb-24 max-w-5xl">
        <p
          className="mb-4 tracking-widest uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#c9a96e",
            letterSpacing: "0.3em",
          }}
        >
          Est. 1892 · 5-Star Excellence
        </p>
        <h1
          className="mb-6 leading-[1.05]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(42px, 6vw, 80px)",
            color: "#f0ece4",
            fontWeight: 400,
          }}
        >
          Where Stillness
          <br />
          <em style={{ fontStyle: "italic", color: "#c9a96e" }}>Becomes</em> Memory.
        </h1>
        <p
          className="max-w-md mb-12 leading-relaxed"
          style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "#a89880" }}
        >
          Fifty distinctive room types across six beachfront floors in Boracay. Three hundred rooms, a world-class spa, six dining venues, and every amenity the island deserves.
        </p>

        {/* Amenities quick links */}
        <div className="flex flex-wrap gap-3 mb-10">
          {(["Pools & Beach", "Spa & Wellness", "Dining & Bars", "Experiences"] as AmenityTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onAmenities(tab)}
              className="px-4 py-2 border transition-colors text-sm"
              style={{
                borderColor: "#2a2620",
                color: "#a89880",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                background: "rgba(14,13,11,0.6)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#c9a96e40"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2620"; (e.currentTarget as HTMLElement).style.color = "#a89880"; }}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={() => onAmenities()}
            className="px-4 py-2 transition-colors text-sm"
            style={{
              color: "#c9a96e",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: "transparent",
            }}
          >
            View All →
          </button>
        </div>

        {/* Search bar */}
        <div
          className="flex flex-col md:flex-row gap-0 border"
          style={{ borderColor: "#2a2620", background: "rgba(14,13,11,0.9)" }}
        >
          <div
            className="flex-1 flex flex-col px-5 py-4 border-b md:border-b-0 md:border-r"
            style={{ borderColor: "#2a2620" }}
          >
            <label
              className="mb-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase" }}
            >
              Check-in
            </label>
            <input
              type="date"
              value={search.checkIn}
              min={today}
              onChange={(e) => setSearch({ ...search, checkIn: e.target.value })}
              className="bg-transparent outline-none"
              style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#f0ece4", colorScheme: "dark" }}
            />
          </div>
          <div
            className="flex-1 flex flex-col px-5 py-4 border-b md:border-b-0 md:border-r"
            style={{ borderColor: "#2a2620" }}
          >
            <label
              className="mb-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase" }}
            >
              Check-out
            </label>
            <input
              type="date"
              value={search.checkOut}
              min={search.checkIn || today}
              onChange={(e) => setSearch({ ...search, checkOut: e.target.value })}
              className="bg-transparent outline-none"
              style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#f0ece4", colorScheme: "dark" }}
            />
          </div>
          <div
            className="flex flex-col px-5 py-4 border-b md:border-b-0 md:border-r min-w-[120px]"
            style={{ borderColor: "#2a2620" }}
          >
            <label
              className="mb-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase" }}
            >
              Guests
            </label>
            <select
              value={search.guests}
              onChange={(e) => setSearch({ ...search, guests: +e.target.value })}
              className="bg-transparent outline-none"
              style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#f0ece4" }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} style={{ background: "#161410" }}>
                  {n} {n === 1 ? "Guest" : "Guests"}
                </option>
              ))}
            </select>
          </div>
          <div
            className="flex flex-col px-5 py-4 border-b md:border-b-0 md:border-r min-w-[140px]"
            style={{ borderColor: "#2a2620" }}
          >
            <label
              className="mb-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase" }}
            >
              Room Type
            </label>
            <select
              value={search.type}
              onChange={(e) => setSearch({ ...search, type: e.target.value })}
              className="bg-transparent outline-none"
              style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#f0ece4" }}
            >
              <option value="All" style={{ background: "#161410" }}>All Types</option>
              <option value="Standard" style={{ background: "#161410" }}>Standard</option>
              <option value="Room" style={{ background: "#161410" }}>Deluxe / Premier</option>
              <option value="Suite" style={{ background: "#161410" }}>Suite</option>
              <option value="Family" style={{ background: "#161410" }}>Family</option>
              <option value="Villa" style={{ background: "#161410" }}>Villa / Casita</option>
            </select>
          </div>
          <button
            onClick={onSearch}
            className="px-8 py-4 transition-all font-medium"
            style={{
              background: "#c9a96e",
              color: "#0e0d0b",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              letterSpacing: "0.05em",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#b8964f")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#c9a96e")}
          >
            Search Rooms
          </button>
        </div>
      </div>
    </div>
  );
}

function HotelFooter({
  onRooms,
  onAmenities,
  onPortal,
  onOffers,
  onCasino,
  onFlowchart,
}: {
  onRooms?: () => void;
  onAmenities?: (tab?: AmenityTab) => void;
  onPortal?: () => void;
  onOffers?: () => void;
  onCasino?: () => void;
  onFlowchart?: () => void;
}) {
  const divider = <div style={{ width: "1px", background: "#2a2620", alignSelf: "stretch" }} />;

  const exploreLeft: { label: string; action: () => void }[] = [
    { label: "Rooms & Accommodation", action: () => onRooms?.() },
    { label: "Dining & Bars", action: () => onAmenities?.("Dining & Bars") },
    { label: "Spa & Wellness", action: () => onAmenities?.("Spa & Wellness") },
    { label: "Pools & Beach", action: () => onAmenities?.("Pools & Beach") },
    { label: "Sports & Recreation", action: () => onAmenities?.("Sports & Recreation") },
    { label: "Experiences", action: () => onAmenities?.("Experiences") },
    { label: "Offers & Promotions", action: () => onOffers?.() },
    { label: "Red Star Casino", action: () => onCasino?.() },
  ];
  const exploreRight: { label: string; action: () => void }[] = [
    { label: "Kids & Family", action: () => onAmenities?.("Kids & Family") },
    { label: "Events & Meetings", action: () => onAmenities?.("Events & Meetings") },
    { label: "Guest Services", action: () => onAmenities?.("Guest Services") },
    { label: "Business & Facilities", action: () => onAmenities?.("Business & Facilities") },
    { label: "My Bookings", action: () => onPortal?.() },
    { label: "System Flowchart", action: () => onFlowchart?.() },
    { label: "Contact Us", action: () => document.getElementById("footer-contact")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  const linkStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "15px",
    color: "#a89880",
    cursor: "pointer",
    display: "block",
    padding: "7px 0",
    transition: "color 0.2s",
    background: "none",
    border: "none",
    textAlign: "left",
    letterSpacing: "0.01em",
  };

  return (
    <footer style={{ background: "#080807", borderTop: "1px solid #2a2620" }}>
      {/* Contact bar */}
      <div
        style={{
          background: "rgba(201,169,110,0.06)",
          borderBottom: "1px solid #2a2620",
          padding: "14px 0",
        }}
      >
        <div
          className="flex flex-wrap items-center justify-center gap-6 px-8"
          style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.12em", color: "#c9a96e" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.7 13.8 19.79 19.79 0 0 1 1.64 5.18 2 2 0 0 1 3.62 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 18z"/></svg>
            RESERVATIONS: +63 36 288 5800
          </span>
          {divider}
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.7 13.8 19.79 19.79 0 0 1 1.64 5.18 2 2 0 0 1 3.62 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 18z"/></svg>
            GUEST SERVICES: +63 917 824 5800
          </span>
          {divider}
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            reservations@red5starshotel.com
          </span>
          {divider}
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            concierge@red5starshotel.com
          </span>
        </div>
      </div>

      {/* Explore quick-nav */}
      <div className="px-8 md:px-16 py-14 border-b" style={{ borderColor: "#1c1a17" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.28em", color: "#c9a96e", textTransform: "uppercase", marginBottom: "28px" }}>
          Explore
        </p>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-x-16 max-w-xl">
          <div>
            {exploreLeft.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={linkStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#a89880"; }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div>
            {exploreRight.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={linkStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#a89880"; }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div id="footer-contact" className="grid grid-cols-1 md:grid-cols-4 gap-10 px-8 md:px-16 py-14">
        {/* Brand */}
        <div className="md:col-span-1">
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "20px",
              color: "#c9a96e",
              letterSpacing: "0.06em",
              marginBottom: "6px",
            }}
          >
            RED 5 STAR HOTEL
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.18em",
              color: "#5a5040",
              marginBottom: "18px",
            }}
          >
            BORACAY ISLAND, PHILIPPINES
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60", lineHeight: 1.7 }}>
            A sanctuary of understated luxury on the shores of the world's most celebrated island. Six floors,
            300 rooms — each one a canvas of tropical refinement.
          </p>
        </div>

        {/* Address & Getting Here */}
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.18em",
              color: "#5a5040",
              marginBottom: "14px",
            }}
          >
            ADDRESS & LOCATION
          </div>
          <address style={{ fontStyle: "normal", fontFamily: "var(--font-body)", fontSize: "13px", color: "#a89880", lineHeight: 2 }}>
            Station 1, Balabag<br />
            Boracay Island, Malay<br />
            Aklan 5608, Philippines
          </address>
          <div style={{ marginTop: "14px", fontFamily: "var(--font-body)", fontSize: "12px", color: "#7a6f60", lineHeight: 1.8 }}>
            <div>✈ Caticlan Airport — 10 min boat + transfer</div>
            <div>✈ Kalibo Airport — 1 hr van + boat</div>
            <div>⛵ D'Mall Jetty Port — 5 min walk</div>
          </div>
        </div>

        {/* Customer Service */}
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.18em",
              color: "#5a5040",
              marginBottom: "14px",
            }}
          >
            CUSTOMER SERVICE
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#a89880", lineHeight: 2 }}>
            <div>24/7 Front Desk</div>
            <div>Concierge Services</div>
            <div>In-Room Dining (24 hrs)</div>
            <div>Housekeeping (6am – 10pm)</div>
            <div>Laundry & Dry Cleaning</div>
            <div>Airport & Boat Transfers</div>
            <div>Babysitting & Kids Club</div>
          </div>
        </div>

        {/* Hours & Emergency */}
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.18em",
              color: "#5a5040",
              marginBottom: "14px",
            }}
          >
            OPERATING HOURS
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#a89880", lineHeight: 2.1 }}>
            <div style={{ color: "#c9a96e" }}>Front Desk</div>
            <div>Open 24 hours, 7 days</div>
            <div style={{ color: "#c9a96e", marginTop: "8px" }}>Reservations Hotline</div>
            <div>Daily 6:00 AM – 11:00 PM</div>
            <div style={{ color: "#c9a96e", marginTop: "8px" }}>Emergency Line</div>
            <div>+63 917 000 5800</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#5a5040", marginTop: "4px" }}>
              Available 24/7 for in-hotel emergencies
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 px-8 md:px-16 py-5"
        style={{ borderTop: "1px solid #1c1a17", fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.14em", color: "#3a3530" }}
      >
        <span>© {new Date().getFullYear()} RED 5 STAR HOTEL · ALL RIGHTS RESERVED</span>
        <span>DOT ACCREDITED · AAA FIVE-STAR RATED · MEMBER OF LEADING HOTELS OF THE WORLD</span>
      </div>
    </footer>
  );
}

function RoomCard({ room, onBook, bookedFloors }: { room: Room; onBook: (r: Room) => void; bookedFloors: number[] }) {
  const [hovered, setHovered] = useState(false);
  const availableFloors = [1,2,3,4,5,6].filter(f => !bookedFloors.includes(f));
  const fullyBooked = availableFloors.length === 0;

  return (
    <article
      className="flex flex-col md:flex-row border transition-all duration-300"
      style={{
        borderColor: hovered ? (fullyBooked ? "#d47b5f40" : "#c9a96e40") : "#2a2620",
        background: "#161410",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative md:w-72 h-56 md:h-auto overflow-hidden flex-shrink-0" style={{ background: "#1a1814" }}>
        <img
          src={room.img}
          alt={room.name}
          className="w-full h-full object-cover transition-transform duration-700"
          style={{ transform: hovered ? "scale(1.05)" : "scale(1)", filter: fullyBooked ? "grayscale(0.4) brightness(0.7)" : "none" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=540&fit=crop&auto=format";
          }}
        />
        <div
          className="absolute top-3 left-3 px-2 py-1"
          style={{
            background: "rgba(14,13,11,0.85)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#c9a96e",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {room.type}
        </div>
        {/* Availability badge */}
        <div
          className="absolute top-3 right-3 px-2 py-1"
          style={{
            background: fullyBooked ? "rgba(212,123,95,0.9)" : "rgba(123,191,142,0.9)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#0e0d0b",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {fullyBooked ? "FULLY BOOKED" : availableFloors.length === 6 ? "ALL FLOORS OPEN" : `${availableFloors.length}/6 FLOORS`}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3
              className="mb-1"
              style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "#f0ece4", fontWeight: 500 }}
            >
              {room.name}
            </h3>
            <div className="flex items-center gap-3">
              <StarRating rating={room.rating} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60" }}>
                {room.rating} · {room.reviews} reviews
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "#c9a96e", fontWeight: 600 }}>
              ₱{room.price.toLocaleString()}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60" }}>per night</div>
          </div>
        </div>

        <p
          className="mb-4 leading-relaxed"
          style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#7a6f60", lineHeight: "1.7" }}
        >
          {room.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {room.amenities.map((a) => (
            <Badge key={a}>{a}</Badge>
          ))}
        </div>

        <div
          className="flex items-center gap-6 mb-5 pt-4 border-t"
          style={{ borderColor: "#2a2620" }}
        >
          {[
            { label: "Size", value: room.size },
            { label: "Guests", value: room.guests },
            { label: "Bed", value: room.beds },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {label}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#a89880" }}>{value}</div>
            </div>
          ))}
        </div>

        {fullyBooked ? (
          <div className="self-start px-7 py-3 text-sm border" style={{ borderColor: "#2a2620", color: "#5a5040", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}>
            Fully Booked — All Floors
          </div>
        ) : (
          <button
            onClick={() => onBook(room)}
            className="self-start px-7 py-3 text-sm transition-all border"
            style={{ borderColor: "#c9a96e", color: "#c9a96e", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#0e0d0b"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
          >
            Reserve Room
          </button>
        )}
      </div>
    </article>
  );
}

function BookingModal({
  room,
  search,
  onClose,
  onConfirm,
  getBookedFloors,
}: {
  room: Room;
  search: { checkIn: string; checkOut: string; guests: number };
  onClose: () => void;
  onConfirm: (data: BookingData) => void;
  getBookedFloors: (checkIn: string, checkOut: string) => number[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formError, setFormError] = useState("");
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const dialogRef = useDialogAccessibility(onClose);
  const [form, setForm] = useState<BookingData>({
    refNum: `ARL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    guests: search.guests,
    floor: 1,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    requests: "",
    paymentPercentage: 10,
    payment: { ...EMPTY_PAYMENT },
  });

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000
    )
  );
  const subtotal = room.price * nights;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;
  const amountDue = Math.round(total * form.paymentPercentage / 100);
  const balanceDue = total - amountDue;
  const bookedFloors = getBookedFloors(form.checkIn, form.checkOut);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (step === 1) {
      if (!form.checkIn || !form.checkOut || new Date(form.checkOut) <= new Date(form.checkIn)) {
        setFormError("Check-out must be after check-in.");
        return;
      }
      if (validatePHMobile(form.phone)) {
        setFormError("Enter a valid Philippine mobile number.");
        return;
      }
      if (!form.nationality) {
        setFormError("Select your nationality or country.");
        return;
      }
      if (bookedFloors.includes(form.floor)) {
        const firstAvailableFloor = [1, 2, 3, 4, 5, 6].find((floor) => !bookedFloors.includes(floor));
        if (!firstAvailableFloor) {
          setFormError("This room type is fully booked for the selected dates.");
          return;
        }
        setForm({ ...form, floor: firstAvailableFloor });
        setFormError(`Floor ${form.floor} is unavailable for these dates. Floor ${firstAvailableFloor} has been selected.`);
        return;
      }
      setStep(2);
      return;
    }
    const paymentError = validatePayment(form.payment);
    setPaymentAttempted(true);
    if (paymentError) {
      setFormError(paymentError);
      return;
    }
    setShowPaymentConfirmation(true);
  };

  const inputStyle: React.CSSProperties = {
    background: "#1a1814",
    border: "1px solid #2a2620",
    borderRadius: "2px",
    color: "#f0ece4",
    fontFamily: "var(--font-body)",
    fontSize: "14px",
    padding: "10px 14px",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    color: "#7a6f60",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(14,13,11,0.92)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-booking-title"
        tabIndex={-1}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border"
        style={{ background: "#0e0d0b", borderColor: "#2a2620" }}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: "#2a2620" }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 flex items-center justify-center text-xs"
                    style={{
                      background: step >= s ? "#c9a96e" : "#2a2620",
                      color: step >= s ? "#0e0d0b" : "#7a6f60",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                    }}
                  >
                    {s}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: step === s ? "#c9a96e" : "#7a6f60", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {s === 1 ? "Details" : "Payment"}
                  </span>
                  {s < 2 && <span style={{ color: "#2a2620", margin: "0 4px" }}>›</span>}
                </div>
              ))}
            </div>
            <h2 id="room-booking-title" style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#f0ece4", fontWeight: 400 }}>
              {room.name}
            </h2>
          </div>
          <button
            aria-label="Close reservation dialog"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{ color: "#7a6f60", fontSize: "20px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f0ece4")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}
          >
            ×
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: form fields */}
          <div className="md:col-span-2 flex flex-col gap-5">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Check-in</label>
                    <input type="date" required value={form.checkIn} min={today}
                      onChange={(e) => { setForm({ ...form, checkIn: e.target.value }); setFormError(""); }}
                      style={{ ...inputStyle, colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Check-out</label>
                    <input type="date" required value={form.checkOut} min={form.checkIn}
                      onChange={(e) => { setForm({ ...form, checkOut: e.target.value }); setFormError(""); }}
                      style={{ ...inputStyle, colorScheme: "dark" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Guests</label>
                    <select value={form.guests} onChange={(e) => setForm({ ...form, guests: +e.target.value })} style={inputStyle}>
                      {Array.from({ length: room.guests }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} style={{ background: "#1a1814" }}>{n} {n === 1 ? "Guest" : "Guests"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Preferred Floor</label>
                    <select value={form.floor} onChange={(e) => setForm({ ...form, floor: +e.target.value })} style={inputStyle}>
                      {[1,2,3,4,5,6].map((f) => {
                        const isBooked = bookedFloors.includes(f);
                        return (
                          <option key={f} value={f} disabled={isBooked} style={{ background: "#1a1814", color: isBooked ? "#4a4540" : "#f0ece4" }}>
                            Floor {f}{f === 1 ? " (Ground)" : f === 6 ? " (Top)" : ""}{isBooked ? " — BOOKED" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {bookedFloors.length > 0 && (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#d47b5f", letterSpacing: "0.05em", marginTop: "4px" }}>
                        {bookedFloors.length} floor{bookedFloors.length > 1 ? "s" : ""} unavailable for this room type
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t pt-5" style={{ borderColor: "#2a2620" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
                    Guest Details
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label style={labelStyle}>First Name</label>
                      <input type="text" required placeholder="Juan" value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name</label>
                      <input type="text" required placeholder="Dela Cruz" value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label style={labelStyle}>Email</label>
                    <input type="email" required placeholder="guest@example.com" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                  </div>
                  <div className="mb-4">
                    <label style={labelStyle}>Phone</label>
                    <input type="tel" required placeholder="+63 9XX XXX XXXX" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
                    {form.phone && validatePHMobile(form.phone) && (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#d47b5f", marginTop: "4px" }}>{validatePHMobile(form.phone)}</p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label style={labelStyle}>Nationality / Country</label>
                    <select required value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} style={{ ...inputStyle, width: "100%" }}>
                      <option value="" style={{ background: "#1a1814" }}>— Select country —</option>
                      {COUNTRIES.map((c) => <option key={c} value={c} style={{ background: "#1a1814" }}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Special Requests</label>
                    <textarea rows={3} placeholder="Late arrival, dietary requirements, room preferences..."
                      value={form.requests} onChange={(e) => setForm({ ...form, requests: e.target.value })}
                      style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
                    Choose Payment Amount
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { percentage: 10, label: "10% Down Payment", sub: "Reservation fee · 90% payable at check-in" },
                      { percentage: 100, label: "Paid in Full", sub: "100% upfront · no balance due" },
                    ].map((option) => {
                      const active = form.paymentPercentage === option.percentage;
                      return (
                        <button
                          key={option.percentage}
                          type="button"
                          onClick={() => setForm({ ...form, paymentPercentage: option.percentage })}
                          className="p-3 border text-left transition-all"
                          style={{
                            borderColor: active ? "#c9a96e" : "#2a2620",
                            background: active ? "#211d15" : "#161410",
                          }}
                        >
                          <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: "18px", color: active ? "#c9a96e" : "#f0ece4" }}>
                            {option.label}
                          </span>
                          <span style={{ display: "block", fontFamily: "var(--font-body)", fontSize: "12px", color: "#7a6f60", lineHeight: "1.4", marginTop: "3px" }}>
                            {option.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {balanceDue > 0 && (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#7a6f60", lineHeight: "1.6", marginTop: "10px" }}>
                      The remaining ₱{balanceDue.toLocaleString()} is payable upon check-in.
                    </p>
                  )}
                </div>
                <PaymentStep
                  payment={form.payment}
                  setPayment={(p) => setForm({ ...form, payment: p })}
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                  amountDue={amountDue}
                  showErrors={paymentAttempted}
                />
              </>
            )}
          </div>

          {/* Right: summary */}
          <div className="flex flex-col gap-4">
            <div className="border overflow-hidden" style={{ borderColor: "#2a2620" }}>
              <img src={room.img} alt={room.name} className="w-full h-36 object-cover" style={{ background: "#1a1814" }} />
              <div className="p-4">
                <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "#f0ece4", marginBottom: "4px" }}>{room.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60" }}>
                  Floor {form.floor} · Room {form.floor}{String(room.id).padStart(2,"0")} · {room.size} · {room.beds}
                </div>
              </div>
            </div>
            <div className="border p-4 flex flex-col gap-3" style={{ borderColor: "#2a2620", background: "#161410" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase" }}>Price Summary</p>
              {[
                { label: `${nights} night${nights !== 1 ? "s" : ""} × ₱${room.price.toLocaleString()}`, val: `₱${subtotal.toLocaleString()}` },
                { label: "Taxes & fees (12%)", val: `₱${taxes.toLocaleString()}` },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between">
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#a89880" }}>{val}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t" style={{ borderColor: "#2a2620" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#f0ece4" }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "#c9a96e" }}>₱{total.toLocaleString()}</span>
              </div>
              {step === 2 && (
                <>
                  <div className="flex justify-between">
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#f0ece4" }}>Due now ({form.paymentPercentage}%)</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#c9a96e" }}>₱{amountDue.toLocaleString()}</span>
                  </div>
                  {balanceDue > 0 && (
                    <div className="flex justify-between">
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60" }}>Payable upon Check-in</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#a89880" }}>₱{balanceDue.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {formError && (
                <p role="alert" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#d47b5f", lineHeight: 1.6, textAlign: "center" }}>
                  {formError}
                </p>
              )}
              <button
                type="submit"
                className="py-4 text-sm font-medium transition-all"
                style={{ background: "#c9a96e", color: "#0e0d0b", fontFamily: "var(--font-body)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "12px" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#b8964f")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#c9a96e")}
              >
                {step === 1 ? "Continue to Payment →" : `Confirm & Pay ₱${amountDue.toLocaleString()}`}
              </button>
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)}
                  className="py-2 text-xs transition-colors"
                  style={{ color: "#7a6f60", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a89880")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}
                >
                  ← Back to Details
                </button>
              )}
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", textAlign: "center", lineHeight: "1.6" }}>
              Free cancellation up to 48 hours before check-in
            </p>
          </div>
        </form>
      </div>
      {showPaymentConfirmation && (
        <PaymentConfirmationDialog
          payment={form.payment}
          amount={amountDue}
          reference={form.refNum}
          onBack={() => setShowPaymentConfirmation(false)}
          onConfirm={() => onConfirm(form)}
        />
      )}
    </div>
  );
}

function ConfirmationScreen({
  room,
  booking,
  refNum,
  onReset,
  onPortal,
}: {
  room: Room;
  booking: BookingData;
  refNum: string;
  onReset: () => void;
  onPortal: () => void;
}) {
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
    )
  );
  const total = room.price * nights + Math.round(room.price * nights * 0.12);
  const amountPaid = Math.round(total * booking.paymentPercentage / 100);
  const balanceDue = total - amountPaid;
  const methodLabel = PAYMENT_METHODS.find((m) => m.id === booking.payment?.method)?.label ?? "Card";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#0e0d0b" }}
    >
      <div className="max-w-lg w-full text-center">
        <div
          className="w-14 h-14 border flex items-center justify-center mx-auto mb-8"
          style={{ borderColor: "#c9a96e" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p
          className="mb-3 tracking-widest uppercase"
          style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.3em" }}
        >
          Reservation Confirmed
        </p>
        <h2
          className="mb-4"
          style={{ fontFamily: "var(--font-display)", fontSize: "36px", color: "#f0ece4", fontWeight: 400 }}
        >
          Thank you,<br />
          <em>{booking.firstName}.</em>
        </h2>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#7a6f60", marginBottom: "32px", lineHeight: "1.7" }}>
          Your reservation at Red 5 Star Hotel has been received. A confirmation has been sent to {booking.email}.
        </p>

        <div
          className="border p-6 mb-8 text-left"
          style={{ borderColor: "#2a2620", background: "#161410" }}
        >
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Confirmation No.", value: refNum },
              { label: "Room", value: room.name },
              { label: "Room No.", value: `${booking.floor}${String(room.id).padStart(2,"0")}` },
              { label: "Floor", value: `Floor ${booking.floor}` },
              { label: "Check-in", value: booking.checkIn },
              { label: "Check-out", value: booking.checkOut },
              { label: "Guests", value: String(booking.guests) },
              { label: "Booking Total", value: `₱${total.toLocaleString()}` },
              { label: "Payment Status", value: booking.paymentPercentage === 100 ? "Paid in Full" : "10% Down Payment Paid" },
              { label: "Paid Now", value: `₱${amountPaid.toLocaleString()} (${booking.paymentPercentage}%)` },
              ...(balanceDue > 0 ? [{ label: "Remaining · Payable upon Check-in", value: `₱${balanceDue.toLocaleString()}` }] : []),
              { label: "Payment Via", value: methodLabel },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                  {label}
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#f0ece4" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulated email confirmation */}
        <div className="border mb-8 text-left" style={{ borderColor: "#2a2620", background: "#0e0d0b" }}>
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#2a2620", background: "#161410" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em" }}>EMAIL CONFIRMATION SENT</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", marginLeft: "auto" }}>To: {booking.email}</span>
          </div>
          <div className="px-5 py-4">
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#7a6f60", lineHeight: 1.7 }}>
              <span style={{ color: "#a89880" }}>Subject:</span> Your Reservation at Red 5 Star Hotel — {refNum}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#7a6f60", marginTop: "8px", lineHeight: 1.8 }}>
              Dear <span style={{ color: "#a89880" }}>{booking.firstName} {booking.lastName}</span>,<br />
              Your reservation for <span style={{ color: "#a89880" }}>{room.name}</span> (Room {booking.floor}{String(room.id).padStart(2,"0")}, Floor {booking.floor}) from{" "}
              <span style={{ color: "#a89880" }}>{booking.checkIn}</span> to <span style={{ color: "#a89880" }}>{booking.checkOut}</span> has been confirmed.<br />
              Payment received: <span style={{ color: "#c9a96e" }}>₱{amountPaid.toLocaleString()}</span> via {methodLabel}.
              {balanceDue > 0 && <> Remaining balance: <span style={{ color: "#c9a96e" }}>₱{balanceDue.toLocaleString()}</span>, payable upon check-in.</>}<br />
              Ref: <span style={{ color: "#a89880" }}>{refNum}</span>. Present this number at check-in.
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#5a5040", marginTop: "10px" }}>
              Questions? Call +63 36 288 5800 or email concierge@red5starshotel.com
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onReset}
            className="px-8 py-3 border text-sm transition-all"
            style={{ borderColor: "#c9a96e", color: "#c9a96e", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#0e0d0b"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
          >
            Browse More Rooms
          </button>
          <button
            onClick={onPortal}
            className="px-8 py-3 text-sm transition-all"
            style={{ background: "#161410", border: "1px solid #2a2620", color: "#a89880", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#c9a96e40"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2620"; (e.currentTarget as HTMLElement).style.color = "#a89880"; }}
          >
            View My Bookings →
          </button>
        </div>
      </div>
    </div>
  );
}

const BOOKING_TIMES = (() => {
  const slots: string[] = [];
  for (let h = 7; h < 24; h++) {
    for (const m of [0, 30]) {
      if (h === 23 && m === 30) break;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      const minute = m === 0 ? "00" : "30";
      slots.push(`${hour12}:${minute} ${ampm}`);
    }
  }
  return slots;
})();

function AmenityBookingModal({
  amenity,
  onClose,
  onConfirm,
}: {
  amenity: Amenity;
  onClose: () => void;
  onConfirm: (data: AmenityBookingData) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formError, setFormError] = useState("");
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const dialogRef = useDialogAccessibility(onClose);
  const [form, setForm] = useState<AmenityBookingData>({
    refNum: `AMN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    date: today,
    time: "7:00 AM",
    guests: 1,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    requests: "",
    payment: { ...EMPTY_PAYMENT },
  });

  const isPerEvent = amenity.unit.includes("per event");
  const subtotal = isPerEvent ? amenity.price : amenity.price * form.guests;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (step === 1) {
      if (validatePHMobile(form.phone)) {
        setFormError("Enter a valid Philippine mobile number.");
        return;
      }
      if (!form.nationality) {
        setFormError("Select your nationality or country.");
        return;
      }
      setStep(2);
      return;
    }
    const paymentError = validatePayment(form.payment);
    setPaymentAttempted(true);
    if (paymentError) {
      setFormError(paymentError);
      return;
    }
    setShowPaymentConfirmation(true);
  };

  const inputStyle: React.CSSProperties = {
    background: "#1a1814",
    border: "1px solid #2a2620",
    borderRadius: "2px",
    color: "#f0ece4",
    fontFamily: "var(--font-body)",
    fontSize: "14px",
    padding: "10px 14px",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    color: "#7a6f60",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(14,13,11,0.92)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="amenity-booking-title" tabIndex={-1} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border" style={{ background: "#0e0d0b", borderColor: "#2a2620" }}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: "#2a2620" }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 flex items-center justify-center"
                    style={{
                      background: step >= s ? "#c9a96e" : "#2a2620",
                      color: step >= s ? "#0e0d0b" : "#7a6f60",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                    }}
                  >
                    {s}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: step === s ? "#c9a96e" : "#7a6f60", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {s === 1 ? "Details" : "Payment"}
                  </span>
                  {s < 2 && <span style={{ color: "#2a2620", margin: "0 4px" }}>›</span>}
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>
              {amenity.category}
            </p>
            <h2 id="amenity-booking-title" style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#f0ece4", fontWeight: 400 }}>
              {amenity.name}
            </h2>
          </div>
          <button aria-label="Close amenity booking dialog" onClick={onClose} className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{ color: "#7a6f60", fontSize: "20px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f0ece4")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}>
            ×
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 flex flex-col gap-5">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" required value={form.date} min={today}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      style={{ ...inputStyle, colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Time</label>
                    <select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={inputStyle}>
                      {BOOKING_TIMES.map((t) => (
                        <option key={t} value={t} style={{ background: "#1a1814" }}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {!isPerEvent && (
                  <div>
                    <label style={labelStyle}>
                      {amenity.category === "Events" ? "Expected Guests" : "Number of Persons"}
                    </label>
                    <select value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: +e.target.value })} style={inputStyle}>
                      {Array.from({ length: Math.min(amenity.capacity, 10) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} style={{ background: "#1a1814" }}>{n} {n === 1 ? "Person" : "Persons"}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="border-t pt-5" style={{ borderColor: "#2a2620" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
                    Contact Details
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label style={labelStyle}>First Name</label>
                      <input type="text" required placeholder="Juan" value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name</label>
                      <input type="text" required placeholder="Dela Cruz" value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label style={labelStyle}>Email</label>
                    <input type="email" required placeholder="guest@example.com" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                  </div>
                  <div className="mb-4">
                    <label style={labelStyle}>Phone</label>
                    <input type="tel" required placeholder="+63 9XX XXX XXXX" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
                    {form.phone && validatePHMobile(form.phone) && (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#d47b5f", marginTop: "4px" }}>{validatePHMobile(form.phone)}</p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label style={labelStyle}>Nationality / Country</label>
                    <select required value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} style={{ ...inputStyle, width: "100%" }}>
                      <option value="" style={{ background: "#1a1814" }}>— Select country —</option>
                      {COUNTRIES.map((c) => <option key={c} value={c} style={{ background: "#1a1814" }}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Special Requests</label>
                    <textarea rows={3} placeholder="Dietary needs, accessibility, preferences..."
                      value={form.requests} onChange={(e) => setForm({ ...form, requests: e.target.value })}
                      style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                </div>
              </>
            ) : (
              <PaymentStep
                payment={form.payment}
                setPayment={(p) => setForm({ ...form, payment: p })}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                amountDue={total}
                showErrors={paymentAttempted}
              />
            )}
          </div>

          {/* Summary sidebar */}
          <div className="flex flex-col gap-4">
            <div className="border overflow-hidden" style={{ borderColor: "#2a2620" }}>
              <img src={amenity.img} alt={amenity.name} className="w-full h-36 object-cover" style={{ background: "#1a1814" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1596178067639-5c6e68aea6dc?w=800&h=540&fit=crop&auto=format"; }} />
              <div className="p-4">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                  {amenity.category}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", color: "#f0ece4" }}>{amenity.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", marginTop: "4px" }}>{amenity.hours}</div>
              </div>
            </div>

            <div className="border p-4 flex flex-col gap-3" style={{ borderColor: "#2a2620", background: "#161410" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase" }}>Price Summary</p>
              {isPerEvent ? (
                <div className="flex justify-between">
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60" }}>Venue fee</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#a89880" }}>₱{amenity.price.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60" }}>{form.guests} × ₱{amenity.price.toLocaleString()}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#a89880" }}>₱{subtotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60" }}>Taxes & fees (12%)</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#a89880" }}>₱{taxes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-3 border-t" style={{ borderColor: "#2a2620" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#f0ece4" }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "#c9a96e" }}>₱{total.toLocaleString()}</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", textAlign: "right" }}>
                {amenity.unit}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {formError && (
                <p role="alert" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#d47b5f", lineHeight: 1.6, textAlign: "center" }}>
                  {formError}
                </p>
              )}
              <button type="submit"
                className="py-4 text-sm font-medium transition-all"
                style={{ background: "#c9a96e", color: "#0e0d0b", fontFamily: "var(--font-body)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "12px" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#b8964f")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#c9a96e")}
              >
                {step === 1 ? "Continue to Payment →" : "Confirm & Pay"}
              </button>
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)}
                  className="py-2 text-xs transition-colors"
                  style={{ color: "#7a6f60", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a89880")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}
                >
                  ← Back to Details
                </button>
              )}
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", textAlign: "center", lineHeight: "1.6" }}>
              Free cancellation up to 24 hours before
            </p>
          </div>
        </form>
      </div>
      {showPaymentConfirmation && (
        <PaymentConfirmationDialog
          payment={form.payment}
          amount={total}
          reference={form.refNum}
          onBack={() => setShowPaymentConfirmation(false)}
          onConfirm={() => onConfirm(form)}
        />
      )}
    </div>
  );
}

function AmenityConfirmScreen({
  amenity,
  booking,
  onBack,
}: {
  amenity: Amenity;
  booking: AmenityBookingData;
  onBack: () => void;
}) {
  const isPerEvent = amenity.unit.includes("per event");
  const subtotal = isPerEvent ? amenity.price : amenity.price * booking.guests;
  const total = subtotal + Math.round(subtotal * 0.12);
  const refNum = booking.refNum;
  const methodLabel = PAYMENT_METHODS.find((m) => m.id === booking.payment.method)?.label ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0e0d0b" }}>
      <div className="max-w-lg w-full text-center">
        <div className="w-14 h-14 border flex items-center justify-center mx-auto mb-8" style={{ borderColor: "#c9a96e" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="mb-3 tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.3em" }}>
          Booking Confirmed
        </p>
        <h2 className="mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "34px", color: "#f0ece4", fontWeight: 400 }}>
          Thank you,<br /><em>{booking.firstName}.</em>
        </h2>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#7a6f60", marginBottom: "32px", lineHeight: "1.7" }}>
          Your {amenity.name} booking is confirmed. Details have been sent to {booking.email}.
        </p>
        <div className="border p-6 mb-6 text-left" style={{ borderColor: "#2a2620", background: "#161410" }}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Confirmation No.", value: refNum },
              { label: "Experience", value: amenity.name },
              { label: "Date", value: booking.date },
              { label: "Time", value: booking.time },
              { label: "Persons", value: isPerEvent ? "Full venue" : String(booking.guests) },
              { label: "Total Paid", value: `₱${total.toLocaleString()}` },
              { label: "Payment Via", value: methodLabel },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#f0ece4" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Email confirmation preview */}
        <div className="border mb-8 text-left" style={{ borderColor: "#2a2620", background: "#0e0d0b" }}>
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#2a2620", background: "#161410" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em" }}>EMAIL CONFIRMATION SENT</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", marginLeft: "auto" }}>To: {booking.email}</span>
          </div>
          <div className="px-5 py-4">
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#7a6f60", lineHeight: 1.7 }}>
              <span style={{ color: "#a89880" }}>Subject:</span> {amenity.name} Booking Confirmed — {refNum}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#7a6f60", marginTop: "8px", lineHeight: 1.8 }}>
              Dear <span style={{ color: "#a89880" }}>{booking.firstName} {booking.lastName}</span>,<br />
              Your booking for <span style={{ color: "#a89880" }}>{amenity.name}</span> on{" "}
              <span style={{ color: "#a89880" }}>{booking.date}</span> at <span style={{ color: "#a89880" }}>{booking.time}</span> is confirmed.<br />
              Total charged: <span style={{ color: "#c9a96e" }}>₱{total.toLocaleString()}</span> via {methodLabel}.<br />
              Ref: <span style={{ color: "#a89880" }}>{refNum}</span>. Please present this at the venue.
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#5a5040", marginTop: "10px" }}>
              Questions? Call +63 917 824 5800 or email concierge@red5starshotel.com
            </p>
          </div>
        </div>

        <button onClick={onBack}
          className="px-8 py-3 border text-sm transition-all"
          style={{ borderColor: "#c9a96e", color: "#c9a96e", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#0e0d0b"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
        >
          Explore More Amenities
        </button>
      </div>
    </div>
  );
}

function AmenitiesPage({
  onBack,
  initialTab,
  onBookingConfirmed,
}: {
  onBack: () => void;
  initialTab?: AmenityTab;
  onBookingConfirmed?: (record: BookingRecord) => void;
}) {
  const [activeTab, setActiveTab] = useState<AmenityTab>(initialTab ?? "All");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [bookingAmenity, setBookingAmenity] = useState<Amenity | null>(null);
  const [confirmedAmenity, setConfirmedAmenity] = useState<{ amenity: Amenity; data: AmenityBookingData } | null>(null);

  if (confirmedAmenity) {
    return (
      <AmenityConfirmScreen
        amenity={confirmedAmenity.amenity}
        booking={confirmedAmenity.data}
        onBack={() => setConfirmedAmenity(null)}
      />
    );
  }

  const filtered =
    activeTab === "All" ? AMENITIES : AMENITIES.filter((a) => a.category === activeTab);

  return (
    <div style={{ background: "#0e0d0b", minHeight: "100vh" }}>
      {/* Header */}
      <div className="border-b px-8 md:px-16 py-6" style={{ borderColor: "#2a2620" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 transition-colors"
              style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.1em" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#c9a96e")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}
            >
              ← RED 5 STAR HOTEL
            </button>
            <span style={{ color: "#2a2620" }}>/</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.1em" }}>
              AMENITIES
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center border" style={{ borderColor: "#c9a96e" }}>
              <span style={{ color: "#c9a96e", fontFamily: "var(--font-display)", fontSize: "12px" }}>R</span>
            </div>
            <span style={{ color: "#a89880", fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Red 5 Star Hotel
            </span>
          </div>
        </div>
      </div>

      {/* Page heading */}
      <div className="px-8 md:px-16 pt-14 pb-10">
        <p
          className="mb-3 tracking-widest uppercase"
          style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.3em" }}
        >
          Beyond the Room
        </p>
        <h1
          className="mb-4"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 4vw, 54px)",
            color: "#f0ece4",
            fontWeight: 400,
            lineHeight: 1.1,
          }}
        >
          World-Class<br />
          <em style={{ fontStyle: "italic", color: "#c9a96e" }}>Experiences</em>
        </h1>
        <p
          className="max-w-lg"
          style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#7a6f60", lineHeight: "1.75" }}
        >
          Every corner of Red 5 Star Hotel is designed to exceed expectation — from sunrise yoga
          to midnight cocktails, island cruises to a heritage spa rooted in Philippine ritual.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="px-8 md:px-16 border-b flex gap-0 overflow-x-auto"
        style={{ borderColor: "#2a2620" }}
      >
        {AMENITY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative px-5 py-4 text-nowrap transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: activeTab === tab ? "#c9a96e" : "#7a6f60",
              background: "transparent",
              borderBottom: activeTab === tab ? "1px solid #c9a96e" : "1px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="px-8 md:px-16 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((amenity) => {
          const isOpen = expanded === amenity.id;
          return (
            <article
              key={amenity.id}
              className="flex flex-col border transition-all duration-300"
              style={{
                borderColor: isOpen ? "#c9a96e40" : "#2a2620",
                background: "#161410",
              }}
            >
              <div className="relative overflow-hidden h-52" style={{ background: "#1a1814" }}>
                <img
                  src={amenity.img}
                  alt={amenity.name}
                  className="w-full h-full object-cover transition-transform duration-700"
                  style={{ transform: isOpen ? "scale(1.05)" : "scale(1)" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1596178067639-5c6e68aea6dc?w=800&h=540&fit=crop&auto=format"; }}
                />
                <div
                  className="absolute top-3 left-3 px-2 py-1"
                  style={{
                    background: "rgba(14,13,11,0.85)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "#c9a96e",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  {amenity.category}
                </div>
                <div
                  className="absolute bottom-3 right-3 px-2 py-1"
                  style={{
                    background: "rgba(14,13,11,0.8)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "#7a6f60",
                    letterSpacing: "0.1em",
                  }}
                >
                  {amenity.hours}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3
                  className="mb-3"
                  style={{ fontFamily: "var(--font-display)", fontSize: "19px", color: "#f0ece4", fontWeight: 500, lineHeight: 1.2 }}
                >
                  {amenity.name}
                </h3>
                <p
                  className="mb-5 leading-relaxed flex-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "#7a6f60",
                    lineHeight: "1.75",
                    display: isOpen ? "block" : "-webkit-box",
                    WebkitLineClamp: isOpen ? "unset" : 3,
                    WebkitBoxOrient: "vertical",
                    overflow: isOpen ? "visible" : "hidden",
                  } as React.CSSProperties}
                >
                  {amenity.description}
                </p>
                <div className="flex items-center justify-between gap-3 mt-auto">
                  <button
                    onClick={() => setExpanded(isOpen ? null : amenity.id)}
                    className="transition-colors"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "#7a6f60",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a89880")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}
                  >
                    {isOpen ? "Show Less ↑" : "Details →"}
                  </button>
                  {amenity.bookable !== false && (
                    <button
                      onClick={() => setBookingAmenity(amenity)}
                      className="px-4 py-2 border transition-all text-xs"
                      style={{
                        borderColor: "#c9a96e",
                        color: "#c9a96e",
                        fontFamily: "var(--font-body)",
                        fontSize: "12px",
                        letterSpacing: "0.06em",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#0e0d0b"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
                    >
                      Book Now
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div
        className="px-8 md:px-16 py-16 border-t flex flex-col md:flex-row items-center justify-between gap-6"
        style={{ borderColor: "#2a2620" }}
      >
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#f0ece4", fontWeight: 400, marginBottom: "6px" }}>
            Ready to experience it firsthand?
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#7a6f60" }}>
            Book a room and all amenities are yours to explore.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-8 py-4 transition-all"
          style={{
            background: "#c9a96e",
            color: "#0e0d0b",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#b8964f")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#c9a96e")}
        >
          Reserve a Room
        </button>
      </div>

      {/* Amenity booking modal */}
      {bookingAmenity && (
        <AmenityBookingModal
          amenity={bookingAmenity}
          onClose={() => setBookingAmenity(null)}
          onConfirm={(data) => {
            const a = bookingAmenity!;
            const isPerEvent = a.unit.includes("per event");
            const subtotal = isPerEvent ? a.price : a.price * data.guests;
            const total = subtotal + Math.round(subtotal * 0.12);
            const refNum = data.refNum;
            const methodLabel = PAYMENT_METHODS.find((m) => m.id === data.payment.method)?.label ?? "Card";
            onBookingConfirmed?.({
              id: refNum,
              kind: "amenity",
              name: a.name,
              category: a.category,
              img: a.img,
              date: data.date,
              time: data.time,
              guests: data.guests,
              total,
              amountPaid: total,
              paymentMethod: methodLabel,
              paymentHistory: [{
                id: `PAY-${Date.now().toString(36).toUpperCase()}`,
                date: new Date().toLocaleString(),
                method: methodLabel,
                amount: total,
                purpose: "Deposit",
              }],
              status: "upcoming",
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              refNum,
            });
            setConfirmedAmenity({ amenity: a, data });
            setBookingAmenity(null);
          }}
        />
      )}
    </div>
  );
}

const STATUS_COLORS: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  upcoming:     { bg: "rgba(201,169,110,0.12)", text: "#c9a96e",  label: "Upcoming" },
  "checked-in": { bg: "rgba(100,200,120,0.12)", text: "#6cc87a",  label: "Checked-in" },
  completed:    { bg: "rgba(80,80,80,0.25)",    text: "#7a6f60",  label: "Completed" },
  cancelled:    { bg: "rgba(200,80,80,0.12)",   text: "#c86464",  label: "Cancelled" },
};

function StayActionModal({
  booking,
  mode,
  onClose,
  onComplete,
}: {
  booking: BookingRecord;
  mode: "check-in" | "check-out";
  onClose: () => void;
  onComplete: (paymentMethod: string, charges: ChargeItem[]) => void;
}) {
  const [payment, setPayment] = useState<PaymentData>({ ...EMPTY_PAYMENT });
  const [error, setError] = useState("");
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const dialogRef = useDialogAccessibility(onClose);
  const [checkoutStep, setCheckoutStep] = useState<"charges" | "review">("charges");
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const balance = Math.max(0, booking.total - (booking.amountPaid ?? 0));
  const extraCharges = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const vatAmount = Math.round(extraCharges * 0.12);
  const serviceCharge = Math.round(extraCharges * 0.1);
  const checkoutDue = extraCharges + vatAmount + serviceCharge;
  const amountDue = mode === "check-in" ? balance : checkoutDue;
  const inputStyle: React.CSSProperties = {
    background: "#1a1814", border: "1px solid #2a2620", borderRadius: "2px",
    color: "#f0ece4", fontFamily: "var(--font-body)", fontSize: "14px",
    padding: "10px 14px", outline: "none", width: "100%",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: "12px", color: "#a89880",
    letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "6px",
  };

  const validateAndContinue = () => {
    if (charges.some((charge) => charge.amount < 0)) {
      setError("Charge amounts cannot be negative.");
      return;
    }
    if (charges.some((charge) => !charge.description.trim())) {
      setError("Add a short description for every posted charge.");
      return;
    }
    if (amountDue > 0) {
      const paymentError = validatePayment(payment);
      setPaymentAttempted(true);
      if (paymentError) {
        setError(paymentError);
        return;
      }
    }
    if (mode === "check-out" && checkoutStep === "charges") {
      setCheckoutStep("review");
      return;
    }
    if (amountDue > 0) {
      setShowPaymentConfirmation(true);
      return;
    }
    onComplete("No payment due", charges);
  };

  const addCharge = () => {
    setCharges((current) => [
      ...current,
      { id: `CHG-${Date.now()}-${current.length}`, type: "Minibar", description: "", amount: 0 },
    ]);
  };

  const updateCharge = (id: string, updates: Partial<ChargeItem>) => {
    setCharges((current) => current.map((charge) => charge.id === id ? { ...charge, ...updates } : charge));
    setError("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(14,13,11,0.94)" }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="stay-action-title" tabIndex={-1} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto border" style={{ background: "#0e0d0b", borderColor: "#2a2620" }}>
        <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: "#2a2620" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              {mode === "check-in" ? "Arrival verification" : "Final account settlement"}
            </p>
            <h2 id="stay-action-title" style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "#f0ece4", marginTop: "6px" }}>
              {mode === "check-in" ? "Check In" : "Check Out"} · {booking.name}
            </h2>
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="w-11 h-11" style={{ color: "#a89880", fontSize: "24px" }}>×</button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Reference", booking.refNum],
              ["Guest", `${booking.firstName} ${booking.lastName}`],
              ["Stay", `${booking.date} – ${booking.endDate}`],
              ["Booked total", `₱${booking.total.toLocaleString()}`],
            ].map(([label, value]) => (
              <div key={label} className="border p-3" style={{ borderColor: "#2a2620", background: "#161410" }}>
                <div style={{ ...labelStyle, fontSize: "12px" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#f0ece4" }}>{value}</div>
              </div>
            ))}
          </div>

          {mode === "check-out" && checkoutStep === "charges" && (
            <div>
              <div className="flex items-center justify-between gap-4 mb-3">
                <p style={{ ...labelStyle, color: "#c9a96e", margin: 0 }}>Charges posted by front desk</p>
                <button type="button" onClick={addCharge} className="min-h-11 px-4 border" style={{ borderColor: "#c9a96e", color: "#c9a96e", fontSize: "13px" }}>+ Add charge</button>
              </div>
              {charges.length === 0 ? (
                <p className="border p-4" style={{ borderColor: "#2a2620", color: "#a89880", fontSize: "14px" }}>No additional charges have been posted.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {charges.map((charge, index) => (
                    <div key={charge.id} className="border p-4" style={{ borderColor: "#2a2620", background: "#161410" }}>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_140px_44px] gap-3 items-end">
                        <div>
                          <label style={labelStyle}>Charge type</label>
                          <select value={charge.type} onChange={(event) => updateCharge(charge.id, { type: event.target.value as ChargeType })} style={inputStyle}>
                            {(["Minibar", "Dining / room service", "Incidentals / damages"] as ChargeType[]).map((type) => <option key={type} value={type} style={{ background: "#1a1814" }}>{type}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Short description</label>
                          <input aria-label={`Charge ${index + 1} description`} value={charge.description} onChange={(event) => updateCharge(charge.id, { description: event.target.value })} placeholder="e.g. Two soft drinks" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Amount</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#c9a96e" }}>₱</span>
                            <input aria-label={`Charge ${index + 1} amount`} type="number" min="0" step="1" value={charge.amount} onChange={(event) => updateCharge(charge.id, { amount: Math.max(0, Number(event.target.value) || 0) })} style={{ ...inputStyle, paddingLeft: "30px" }} />
                          </div>
                        </div>
                        <button type="button" aria-label={`Remove charge ${index + 1}`} onClick={() => setCharges((current) => current.filter((item) => item.id !== charge.id))} className="w-11 h-11 border" style={{ borderColor: "#5a3530", color: "#ef9b82", fontSize: "20px" }}>×</button>
                      </div>
                      <div className="flex justify-end mt-3" style={{ color: "#a89880", fontSize: "13px" }}>Line total&nbsp; <strong style={{ color: "#f0ece4" }}>₱{charge.amount.toLocaleString()}</strong></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === "check-out" && checkoutStep === "review" && (
            <div className="flex flex-col gap-5">
              <div>
                <p style={{ ...labelStyle, color: "#c9a96e", marginBottom: "12px" }}>Review checkout</p>
                <div className="border p-4 flex flex-col gap-3" style={{ borderColor: "#2a2620", background: "#161410" }}>
                  <div className="flex justify-between"><span style={{ color: "#a89880" }}>Room total</span><span>₱{booking.total.toLocaleString()}</span></div>
                  {charges.map((charge) => (
                    <div key={charge.id} className="flex justify-between gap-4">
                      <span style={{ color: "#a89880" }}>{charge.type} · {charge.description}</span>
                      <span>₱{charge.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between"><span style={{ color: "#a89880" }}>VAT on charges (12%)</span><span>₱{vatAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: "#a89880" }}>Service charge (10%)</span><span>₱{serviceCharge.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: "#a89880" }}>Amount already paid</span><span>− ₱{(booking.amountPaid ?? 0).toLocaleString()}</span></div>
                  <div className="flex justify-between pt-3 border-t" style={{ borderColor: "#2a2620", color: "#c9a96e", fontSize: "18px" }}>
                    <strong>Final amount due</strong><strong>₱{checkoutDue.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
              <p style={{ color: "#a89880", fontSize: "14px", lineHeight: 1.7 }}>Review all front-desk charges carefully. The stay is not completed until you press Confirm Check-out.</p>
            </div>
          )}

          <div className="flex items-center justify-between border p-4" style={{ borderColor: "#c9a96e55", background: "#161410" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#f0ece4" }}>
              {mode === "check-in" ? "Balance due at check-in" : "Additional charges due"}
            </span>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "#c9a96e" }}>₱{amountDue.toLocaleString()}</strong>
          </div>

          {amountDue > 0 && (mode === "check-in" || checkoutStep === "charges") ? (
            <PaymentStep payment={payment} setPayment={(next) => { setPayment(next); setError(""); }} inputStyle={inputStyle} labelStyle={labelStyle} amountDue={amountDue} showErrors={paymentAttempted} />
          ) : amountDue === 0 ? (
            <p className="border p-4" style={{ borderColor: "#6cc87a55", color: "#9bd5a4", fontSize: "14px" }}>
              The account is fully settled. No payment is required for this step.
            </p>
          ) : null}

          {mode === "check-in" && (
            <p style={{ color: "#a89880", fontSize: "14px", lineHeight: 1.7 }}>
              Completing check-in records the live arrival time and creates a six-digit room access code for this browser-based prototype.
            </p>
          )}
          {mode === "check-out" && checkoutStep === "charges" && (
            <p style={{ color: "#a89880", fontSize: "14px", lineHeight: 1.7 }}>
              Completing checkout records the departure time and automatically generates the final printable payment receipt.
            </p>
          )}
          {error && <p role="alert" style={{ color: "#ef9b82", fontSize: "14px" }}>{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" onClick={mode === "check-out" && checkoutStep === "review" ? () => setCheckoutStep("charges") : onClose} className="min-h-11 flex-1 border px-5" style={{ borderColor: "#2a2620", color: "#a89880" }}>
              {mode === "check-out" && checkoutStep === "review" ? "Back" : "Cancel"}
            </button>
            <button type="button" onClick={validateAndContinue} className="min-h-11 flex-[2] px-5" style={{ background: "#c9a96e", color: "#0e0d0b", fontWeight: 600 }}>
              {mode === "check-in" ? "Confirm Check-in" : checkoutStep === "charges" ? "Review Check-out" : "Confirm Check-out"}
            </button>
          </div>
        </div>
      </div>
      {showPaymentConfirmation && (
        <PaymentConfirmationDialog
          payment={payment}
          amount={amountDue}
          reference={booking.refNum}
          onBack={() => setShowPaymentConfirmation(false)}
          onConfirm={() => onComplete(paymentMethodLabel(payment), charges)}
        />
      )}
    </div>
  );
}

function ReceiptModal({ booking, onClose }: { booking: BookingRecord; onClose: () => void }) {
  const dialogRef = useDialogAccessibility(onClose);
  const finalTotal = booking.finalTotal ?? booking.total;
  const charges = booking.charges ?? [];
  const depositPaid = booking.depositPaid ?? Math.min(booking.amountPaid ?? booking.total, booking.total);
  const checkInPayment = booking.checkInPayment ?? Math.max(0, booking.total - depositPaid);
  const checkoutPayment = booking.checkoutPayment ?? Math.max(0, finalTotal - booking.total);
  const receiptLines = [
    "RED 5 STAR HOTEL — FINAL PAYMENT RECEIPT",
    `Receipt: ${booking.receiptNo}`,
    `Reservation: ${booking.refNum}`,
    `Guest: ${booking.firstName} ${booking.lastName}`,
    `Accommodation: ${booking.name}`,
    `Stay: ${booking.date} to ${booking.endDate}`,
    `Checked in: ${booking.checkedInAt ?? "—"}`,
    `Checked out: ${booking.checkedOutAt ?? "—"}`,
    `Room booking: PHP ${booking.total.toLocaleString()}`,
    ...charges.map((charge) => `${charge.type} - ${charge.description}: PHP ${charge.amount.toLocaleString()}`),
    `VAT on charges (12%): PHP ${(booking.vatAmount ?? 0).toLocaleString()}`,
    `Service charge (10%): PHP ${(booking.serviceCharge ?? 0).toLocaleString()}`,
    `Deposit paid at booking: PHP ${depositPaid.toLocaleString()}`,
    `Balance paid at check-in: PHP ${checkInPayment.toLocaleString()}`,
    `Payment at check-out: PHP ${checkoutPayment.toLocaleString()}`,
    `Final total paid: PHP ${finalTotal.toLocaleString()}`,
    `Final payment: ${booking.checkoutPaymentMethod ?? "No additional payment due"}`,
    "Status: PAID IN FULL",
    "This receipt was generated by the local prototype and is stored in this browser.",
  ];

  const downloadReceipt = () => {
    const escapePdf = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const content = [
      "BT",
      "/F1 11 Tf",
      "50 790 Td",
      ...receiptLines.flatMap((line, index) => [
        index === 0 ? "/F1 16 Tf" : index === 1 ? "/F1 11 Tf" : "",
        `(${escapePdf(line)}) Tj`,
        "0 -22 Td",
      ]).filter(Boolean),
      "ET",
    ].join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${booking.receiptNo ?? "hotel-receipt"}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 receipt-overlay" style={{ background: "rgba(14,13,11,0.96)" }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="receipt-title" tabIndex={-1} className="receipt-print-root w-full max-w-xl max-h-[92vh] overflow-y-auto border p-6 md:p-8" style={{ background: "#fffaf2", borderColor: "#9a7437", color: "#181510" }}>
        <div className="flex items-start justify-between gap-4 border-b pb-5" style={{ borderColor: "#c9bda8" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.2em", color: "#765d2f" }}>RED 5 STAR HOTEL</p>
            <h2 id="receipt-title" style={{ fontFamily: "var(--font-display)", fontSize: "28px", marginTop: "4px" }}>Final Payment Receipt</h2>
            <p style={{ fontSize: "13px", color: "#544c41", marginTop: "4px" }}>Boracay Island, Aklan, Philippines</p>
          </div>
          <button aria-label="Close receipt" onClick={onClose} className="w-11 h-11" style={{ fontSize: "24px", color: "#675f52" }}>×</button>
        </div>
        <div className="grid grid-cols-2 gap-4 py-6">
          {[
            ["Receipt No.", booking.receiptNo ?? "—"],
            ["Reservation No.", booking.refNum],
            ["Guest", `${booking.firstName} ${booking.lastName}`],
            ["Checkout time", booking.checkedOutAt ?? "—"],
            ["Accommodation", booking.name],
            ["Stay dates", `${booking.date} – ${booking.endDate}`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#595147", textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: "14px", marginTop: "3px" }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="border-y py-4 flex flex-col gap-3" style={{ borderColor: "#c9bda8" }}>
          <div className="flex justify-between"><span>Room reservation</span><span>₱{booking.total.toLocaleString()}</span></div>
          {charges.map((charge) => <div key={charge.id} className="flex justify-between gap-4"><span>{charge.type} · {charge.description}</span><span>₱{charge.amount.toLocaleString()}</span></div>)}
          <div className="flex justify-between"><span>VAT on charges (12%)</span><span>₱{(booking.vatAmount ?? 0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Service charge (10%)</span><span>₱{(booking.serviceCharge ?? 0).toLocaleString()}</span></div>
          <div className="flex justify-between pt-3 border-t text-lg font-semibold" style={{ borderColor: "#c9bda8" }}><span>Total paid</span><span>₱{finalTotal.toLocaleString()}</span></div>
        </div>
        <div className="py-4 flex flex-col gap-2 border-b" style={{ borderColor: "#c9bda8" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#595147", textTransform: "uppercase" }}>Payment breakdown</p>
          <div className="flex justify-between"><span>Deposit paid at booking</span><span>₱{depositPaid.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Balance paid at check-in</span><span>₱{checkInPayment.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Payment made at check-out</span><span>₱{checkoutPayment.toLocaleString()}</span></div>
        </div>
        <div className="my-5 p-4 text-center" style={{ background: "#e3f1e5", color: "#245b2d", fontWeight: 700, letterSpacing: "0.08em" }}>PAID IN FULL</div>
        <p style={{ fontSize: "13px", color: "#544c41", lineHeight: 1.7 }}>
          Final settlement: {booking.checkoutPaymentMethod ?? "No additional payment due"}. This receipt is generated and retained locally in the current browser for this academic prototype.
        </p>
        <div className="receipt-dialog-actions flex flex-col sm:flex-row gap-3 mt-6">
          <button onClick={() => window.print()} className="min-h-11 flex-1 border px-4" style={{ borderColor: "#765d2f", color: "#563f18" }}>Print Receipt</button>
          <button onClick={downloadReceipt} className="min-h-11 flex-1 px-4" style={{ background: "#765d2f", color: "#fff" }}>Download Receipt</button>
        </div>
      </div>
    </div>
  );
}

function CancellationDialog({
  booking,
  onClose,
  onConfirm,
}: {
  booking: BookingRecord;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogAccessibility(onClose);
  const refundAmount = booking.nonRefundable ? 0 : booking.amountPaid ?? 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(14,13,11,0.92)" }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title" tabIndex={-1} className="w-full max-w-sm border p-8 text-center" style={{ background: "#0e0d0b", borderColor: "#2a2620" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.15em", color: "#c9a96e", marginBottom: "16px", textTransform: "uppercase" }}>Confirm Cancellation</p>
        <h2 id="cancel-booking-title" style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#f0ece4", marginBottom: "10px" }}>Cancel this booking?</h2>
        <p style={{ fontFamily: "var(--font-body)", color: "#a89880", fontSize: "14px", lineHeight: "1.7", marginBottom: "28px" }}>
          This action cannot be undone. A cancellation notice will be shown for this local prototype.
        </p>
        <div className="mb-6 border p-4 text-left flex flex-col gap-2" style={{ borderColor: "#2a2620", background: "#161410" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", textTransform: "uppercase", letterSpacing: "0.12em" }}>Refund summary</p>
          {booking.nonRefundable && (
            <p style={{ color: "#ef9b82", fontSize: "14px", fontWeight: 600 }}>Non-refundable offer — no refund</p>
          )}
          <div className="flex justify-between gap-3"><span style={{ color: "#a89880", fontSize: "13px" }}>Amount paid</span><span>₱{(booking.amountPaid ?? 0).toLocaleString()}</span></div>
          <div className="flex justify-between gap-3"><span style={{ color: "#a89880", fontSize: "13px" }}>Refund amount</span><strong style={{ color: booking.nonRefundable ? "#ef9b82" : "#6cc87a" }}>₱{refundAmount.toLocaleString()}</strong></div>
          <div className="flex justify-between gap-3"><span style={{ color: "#a89880", fontSize: "13px" }}>Refund method</span><span className="text-right">{booking.nonRefundable ? "Not applicable" : booking.paymentHistory?.find((item) => item.purpose === "Deposit")?.method ?? booking.paymentMethod}</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="min-h-11 flex-1 border transition-colors" style={{ borderColor: "#2a2620", color: "#a89880", fontFamily: "var(--font-body)", fontSize: "13px" }}>Keep Booking</button>
          <button onClick={onConfirm} className="min-h-11 flex-1" style={{ background: "#c86464", color: "#fff", fontFamily: "var(--font-body)", fontSize: "13px" }}>Yes, Cancel</button>
        </div>
      </div>
    </div>
  );
}

function GuestPortal({
  bookings,
  onCancel,
  onCheckIn,
  onCheckOut,
  onBack,
  onBookRoom,
  onLogout,
}: {
  bookings: BookingRecord[];
  onCancel: (id: string) => void;
  onCheckIn: (id: string, paymentMethod: string) => BookingRecord;
  onCheckOut: (id: string, charges: ChargeItem[], paymentMethod: string) => BookingRecord;
  onBack: () => void;
  onBookRoom: () => void;
  onLogout: () => void;
}) {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [stayAction, setStayAction] = useState<{ booking: BookingRecord; mode: "check-in" | "check-out" } | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<BookingRecord | null>(null);

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = {
    upcoming: bookings.filter((b) => b.status === "upcoming").length,
    "checked-in": bookings.filter((b) => b.status === "checked-in").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const monoSm: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" };
  const bodyMd: React.CSSProperties = { fontFamily: "var(--font-body)", fontSize: "14px" };

  return (
    <div style={{ background: "#0e0d0b", minHeight: "100vh" }}>
      {/* Header */}
      <div className="border-b px-8 md:px-16 py-6 flex items-center justify-between" style={{ borderColor: "#2a2620" }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="transition-colors"
            style={{ ...monoSm, color: "#7a6f60" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#c9a96e")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}>
            ← RED 5 STAR HOTEL
          </button>
          <span style={{ color: "#2a2620" }}>/</span>
          <span style={{ ...monoSm, color: "#c9a96e" }}>MY BOOKINGS</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center border" style={{ borderColor: "#c9a96e" }}>
            <span style={{ color: "#c9a96e", fontFamily: "var(--font-display)", fontSize: "12px" }}>R</span>
          </div>
          <span style={{ ...bodyMd, color: "#a89880", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Red 5 Star Hotel</span>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-11 px-4 border transition-colors"
            style={{ borderColor: "#2a2620", color: "#a89880", fontFamily: "var(--font-body)", fontSize: "13px" }}
          >
            Log out
          </button>
        </div>
      </div>

      <div className="px-8 md:px-16 pt-12 pb-4">
        <p style={{ ...monoSm, color: "#c9a96e", marginBottom: "12px" }}>Guest Portal</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,46px)", color: "#f0ece4", fontWeight: 400, lineHeight: 1.1, marginBottom: "8px" }}>
          My Bookings
        </h1>
        <p style={{ ...bodyMd, color: "#7a6f60", fontSize: "15px" }}>
          {bookings.length} total reservation{bookings.length !== 1 ? "s" : ""} on file
        </p>
      </div>

      {/* Stats row */}
      <div className="px-8 md:px-16 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["upcoming", "checked-in", "completed", "cancelled"] as BookingStatus[]).map((s) => (
          <div key={s} className="border p-4" style={{ borderColor: "#2a2620", background: "#161410" }}>
            <div style={{ ...monoSm, color: "#7a6f60", marginBottom: "8px" }}>{STATUS_COLORS[s].label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "32px", color: STATUS_COLORS[s].text, lineHeight: 1 }}>{counts[s]}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="px-8 md:px-16 flex gap-0 border-b" style={{ borderColor: "#2a2620" }}>
        {(["all", "upcoming", "checked-in", "completed", "cancelled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-5 py-3 transition-colors"
            style={{
              ...monoSm,
              color: filter === f ? "#c9a96e" : "#7a6f60",
              borderBottom: filter === f ? "1px solid #c9a96e" : "1px solid transparent",
              marginBottom: "-1px",
              textTransform: "capitalize",
            }}>
            {f === "all" ? "All" : STATUS_COLORS[f as BookingStatus].label}
            {f !== "all" && counts[f as BookingStatus] > 0 && (
              <span className="ml-2" style={{ color: STATUS_COLORS[f as BookingStatus].text }}>
                {counts[f as BookingStatus]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking cards */}
      <div className="px-8 md:px-16 py-10 flex flex-col gap-5">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#7a6f60", marginBottom: "16px" }}>
              {bookings.length === 0 ? "No bookings yet." : "No bookings in this category."}
            </p>
            {bookings.length === 0 && (
              <button onClick={onBookRoom}
                className="px-7 py-3 border transition-all text-sm"
                style={{ borderColor: "#c9a96e", color: "#c9a96e", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#0e0d0b"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}>
                Browse Rooms & Amenities
              </button>
            )}
          </div>
        ) : (
          filtered.map((b) => {
            const sc = STATUS_COLORS[b.status];
            const checkInReady = new Date(`${b.date}T00:00:00`).getTime() <= Date.now();
            const cancellationDeadline = new Date(`${b.date}T00:00:00`).getTime() - 48 * 60 * 60 * 1000;
            const canCancel = Date.now() <= cancellationDeadline;
            return (
              <article key={b.id} className="border flex flex-col md:flex-row overflow-hidden" style={{ borderColor: "#2a2620", background: "#161410" }}>
                <div className="relative md:w-52 h-44 md:h-auto flex-shrink-0">
                  <img src={b.img} alt={b.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 60%, #161410)" }} />
                </div>
                <div className="flex flex-col flex-1 p-5 gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div style={{ ...monoSm, color: "#7a6f60", marginBottom: "4px" }}>{b.category}</div>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "#f0ece4", fontWeight: 500 }}>{b.name}</h3>
                    </div>
                    <span className="px-3 py-1 text-xs" style={{ ...monoSm, background: sc.bg, color: sc.text, flexShrink: 0 }}>
                      {sc.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Ref No.", value: b.refNum },
                      { label: b.kind === "room" ? "Check-in" : "Date", value: b.date },
                      ...(b.endDate ? [{ label: "Check-out", value: b.endDate }] : []),
                      ...(b.time ? [{ label: "Time", value: b.time }] : []),
                      { label: b.kind === "room" ? "Guests" : "Persons", value: String(b.guests) },
                      { label: "Total", value: `₱${b.total.toLocaleString()}` },
                      ...(b.amountPaid !== undefined && b.amountPaid < b.total
                        ? [
                            { label: "Paid", value: `₱${b.amountPaid.toLocaleString()}` },
                            { label: "Balance", value: `₱${(b.total - b.amountPaid).toLocaleString()}` },
                          ]
                        : []),
                      { label: "Paid via", value: b.paymentMethod },
                      { label: "Guest", value: `${b.firstName} ${b.lastName}` },
                      ...(b.checkedInAt ? [{ label: "Checked in", value: b.checkedInAt }] : []),
                      ...(b.checkedOutAt ? [{ label: "Checked out", value: b.checkedOutAt }] : []),
                      ...(b.roomAccessCode && b.status === "checked-in" ? [{ label: "Room access", value: b.roomAccessCode }] : []),
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ ...monoSm, color: "#a89880", fontSize: "12px", marginBottom: "3px" }}>{label}</div>
                        <div style={{ ...bodyMd, color: "#a89880", fontSize: "13px" }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3" style={{ borderColor: "#2a2620" }}>
                    <p style={{ ...monoSm, color: "#c9a96e", fontSize: "12px", marginBottom: "10px" }}>Payment history</p>
                    {(b.paymentHistory ?? []).length > 0 ? (
                      <div className="overflow-x-auto">
                        <div className="min-w-[560px] flex flex-col">
                          <div className="grid grid-cols-[1.2fr_1fr_0.7fr_1fr] gap-3 pb-2" style={{ color: "#a89880", fontSize: "12px" }}>
                            <span>Date</span><span>Method</span><span>Amount</span><span>Purpose</span>
                          </div>
                          {(b.paymentHistory ?? []).map((paymentItem) => (
                            <div key={paymentItem.id} className="grid grid-cols-[1.2fr_1fr_0.7fr_1fr] gap-3 border-t py-2" style={{ borderColor: "#2a2620", fontSize: "13px", color: paymentItem.purpose === "Refund" ? "#6cc87a" : "#d6cec1" }}>
                              <span>{paymentItem.date}</span>
                              <span>{paymentItem.method}</span>
                              <span>{paymentItem.purpose === "Refund" ? "− " : ""}₱{paymentItem.amount.toLocaleString()}</span>
                              <span>{paymentItem.purpose}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "#a89880", fontSize: "13px" }}>No payment records are available for this legacy booking.</p>
                    )}
                  </div>

                  {b.nonRefundable && (
                    <div className="border p-3" style={{ borderColor: "#ef9b8255", background: "rgba(239,155,130,0.07)" }}>
                      <p style={{ color: "#efb09e", fontSize: "13px" }}>Non-refundable offer — no refund</p>
                    </div>
                  )}

                  {b.status === "cancelled" && !b.nonRefundable && b.refundAmount !== undefined && (
                    <div className="border p-3" style={{ borderColor: "#6cc87a55", background: "rgba(108,200,122,0.07)" }}>
                      <p style={{ color: "#9bd5a4", fontSize: "13px" }}>
                        Refund recorded: ₱{b.refundAmount.toLocaleString()} via {b.refundMethod} on {b.refundedAt}.
                      </p>
                    </div>
                  )}

                  {(b.status === "upcoming" || b.status === "checked-in") && (
                    <div className="flex flex-wrap gap-3 pt-2 border-t" style={{ borderColor: "#2a2620" }}>
                      {b.status === "upcoming" && b.kind === "room" && (
                        <button
                          onClick={() => checkInReady && setStayAction({ booking: b, mode: "check-in" })}
                          disabled={!checkInReady}
                          title={checkInReady ? "Begin check-in" : `Check-in opens on ${b.date}`}
                          className="px-4 py-2 border text-xs transition-colors"
                          style={{ borderColor: checkInReady ? "#6cc87a" : "#3a3530", color: checkInReady ? "#6cc87a" : "#5a5040", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(100,200,120,0.12)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          ✓ Check In
                        </button>
                      )}
                      {b.status === "checked-in" && b.kind === "room" && (
                        <button
                          onClick={() => setStayAction({ booking: b, mode: "check-out" })}
                          className="px-4 py-2 border text-xs transition-colors"
                          style={{ borderColor: "#c9a96e", color: "#c9a96e", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(201,169,110,0.12)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          → Check Out
                        </button>
                      )}
                      {b.status === "upcoming" && canCancel && (
                        <button
                          onClick={() => setCancelTarget(b.id)}
                          className="px-4 py-2 border text-xs transition-colors"
                          style={{ borderColor: "#2a2620", color: "#7a6f60", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#c86464"; (e.currentTarget as HTMLElement).style.color = "#c86464"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2620"; (e.currentTarget as HTMLElement).style.color = "#7a6f60"; }}>
                          Cancel Booking
                        </button>
                      )}
                      <span style={{ ...monoSm, color: "#a89880", fontSize: "12px", alignSelf: "center", lineHeight: 1.6 }}>
                        {b.status === "upcoming"
                          ? canCancel
                            ? b.nonRefundable
                              ? `Cancellation allowed until ${new Date(cancellationDeadline).toLocaleString()} · Non-refundable offer — no refund`
                              : `Free cancellation until ${new Date(cancellationDeadline).toLocaleString()}`
                            : checkInReady
                              ? "Arrival date reached · cancellation window closed"
                              : "Cancellation window closed"
                          : "Settle charges and generate the receipt when ready to leave"}
                      </span>
                    </div>
                  )}
                  {b.status === "completed" && b.receiptNo && (
                    <div className="flex pt-2 border-t" style={{ borderColor: "#2a2620" }}>
                      <button onClick={() => setReceiptTarget(b)} className="min-h-11 px-4 border text-xs" style={{ borderColor: "#c9a96e", color: "#c9a96e" }}>
                        View Final Receipt
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Cancel confirmation overlay */}
      {cancelTarget && (
        <CancellationDialog
          booking={bookings.find((booking) => booking.id === cancelTarget)!}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => { onCancel(cancelTarget); setCancelTarget(null); }}
        />
      )}

      {stayAction && (
        <StayActionModal
          booking={stayAction.booking}
          mode={stayAction.mode}
          onClose={() => setStayAction(null)}
          onComplete={(paymentMethod, charges) => {
            const updated = stayAction.mode === "check-in"
              ? onCheckIn(stayAction.booking.id, paymentMethod)
              : onCheckOut(stayAction.booking.id, charges, paymentMethod);
            setStayAction(null);
            if (updated.status === "completed") setReceiptTarget(updated);
          }}
        />
      )}
      {receiptTarget && <ReceiptModal booking={receiptTarget} onClose={() => setReceiptTarget(null)} />}

      {/* Bottom CTA */}
      <div className="px-8 md:px-16 py-14 border-t flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: "#2a2620" }}>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "#f0ece4", marginBottom: "6px" }}>
            Planning another stay?
          </p>
          <p style={{ ...bodyMd, color: "#7a6f60", fontSize: "14px" }}>Browse rooms, villas, and all 52 bookable experiences.</p>
        </div>
        <button onClick={onBookRoom}
          className="px-8 py-4 transition-all"
          style={{ background: "#c9a96e", color: "#0e0d0b", fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#b8964f")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#c9a96e")}>
          Browse & Book
        </button>
      </div>
    </div>
  );
}

function OffersPage({
  onBack,
  onRooms,
  onAmenities,
  onPortal,
}: {
  onBack: () => void;
  onRooms: (offer: HotelOffer) => void;
  onAmenities: (tab?: AmenityTab) => void;
  onPortal: () => void;
}) {
  return (
    <div style={{ background: "#0e0d0b", minHeight: "100vh" }}>
      {/* Header nav */}
      <div className="border-b px-8 md:px-16 py-6" style={{ borderColor: "#2a2620" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 transition-colors"
              style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#c9a96e")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}
            >
              ← RED 5 STAR HOTEL
            </button>
            <span style={{ color: "#2a2620" }}>/</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.1em" }}>
              OFFERS & PROMOTIONS
            </span>
          </div>
          <button
            onClick={onPortal}
            className="text-sm px-5 py-2 border transition-colors"
            style={{ borderColor: "#2a2620", color: "#a89880", fontFamily: "var(--font-body)", fontSize: "13px" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2620"; (e.currentTarget as HTMLElement).style.color = "#a89880"; }}
          >
            My Bookings
          </button>
        </div>
      </div>

      {/* Hero banner */}
      <div className="relative px-8 md:px-16 py-20 overflow-hidden" style={{ borderBottom: "1px solid #2a2620" }}>
        <div className="absolute inset-0" style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=1800&h=600&fit=crop&auto=format)",
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          filter: "brightness(0.18)",
        }} />
        <div className="relative z-10 max-w-2xl">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.3em", color: "#c9a96e", textTransform: "uppercase", marginBottom: "16px" }}>
            Exclusive Offers
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)", color: "#f0ece4", lineHeight: 1.1, marginBottom: "16px" }}>
            Curated for<br /><em>Extraordinary Stays</em>
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "#a89880", maxWidth: "480px", lineHeight: 1.7 }}>
            From honeymoon escapes to island adventures — discover packages crafted to elevate every moment in Boracay.
          </p>
        </div>
      </div>

      {/* Offer grid */}
      <div className="px-8 md:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {OFFERS.map((offer) => (
            <div
              key={offer.id}
              className="group relative overflow-hidden cursor-pointer"
              style={{ background: "#161410", border: "1px solid #2a2620" }}
            >
              {/* Image */}
              <div className="relative overflow-hidden" style={{ height: "320px" }}>
                <img
                  src={offer.img}
                  alt={offer.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{ display: "block" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1596178067639-5c6e68aea6dc?w=900&h=600&fit=crop&auto=format"; }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,13,11,0.92) 0%, rgba(14,13,11,0.3) 50%, rgba(14,13,11,0.05) 100%)" }} />
                {/* Badge */}
                <div className="absolute top-4 left-4">
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      background: offer.color,
                      color: "#0e0d0b",
                      padding: "4px 10px",
                      display: "inline-block",
                    }}
                  >
                    {offer.badge}
                  </span>
                </div>
                {/* Tag */}
                <div className="absolute top-4 right-4">
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      border: "1px solid rgba(240,236,228,0.3)",
                      color: "rgba(240,236,228,0.7)",
                      padding: "3px 8px",
                      display: "inline-block",
                    }}
                  >
                    {offer.tag}
                  </span>
                </div>
                {/* Title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "#f0ece4", lineHeight: 1.2, marginBottom: "4px" }}>
                    {offer.title}
                  </h2>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.2em", color: offer.color, textTransform: "uppercase" }}>
                    {offer.subtitle}
                  </p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-6 flex flex-col gap-4" style={{ borderTop: "1px solid #2a2620" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "#a89880", lineHeight: 1.75 }}>
                  {offer.description}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => onRooms(offer)}
                    className="px-6 py-2.5 transition-all text-sm"
                    style={{
                      background: offer.color === "#c9a96e" ? "#c9a96e" : "transparent",
                      border: offer.color === "#c9a96e" ? "none" : `1px solid ${offer.color}`,
                      color: offer.color === "#c9a96e" ? "#0e0d0b" : offer.color,
                      fontFamily: "var(--font-body)",
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = offer.color;
                      (e.currentTarget as HTMLElement).style.color = "#0e0d0b";
                      (e.currentTarget as HTMLElement).style.border = "none";
                    }}
                    onMouseLeave={(e) => {
                      if (offer.color === "#c9a96e") {
                        (e.currentTarget as HTMLElement).style.background = "#c9a96e";
                        (e.currentTarget as HTMLElement).style.color = "#0e0d0b";
                      } else {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = offer.color;
                        (e.currentTarget as HTMLElement).style.border = `1px solid ${offer.color}`;
                      }
                    }}
                  >
                    {offer.cta}
                  </button>
                  <button
                    onClick={() => onAmenities()}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.12em", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a89880")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}
                  >
                    VIEW INCLUSIONS →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#4a4540", letterSpacing: "0.08em", marginTop: "48px", lineHeight: 1.8 }}>
          All prices are in Philippine Peso (₱) and subject to 12% VAT. Offers are subject to availability and may be withdrawn without notice.
          Packages cannot be combined with other promotions unless stated. Minimum stay requirements may apply.
          For bespoke package enquiries contact concierge@red5starshotel.com or call +63 36 288 5800.
        </p>
      </div>

      <HotelFooter onRooms={() => onBack()} onAmenities={onAmenities} onPortal={onPortal} onOffers={() => {}} />
    </div>
  );
}

// ── Casino Chip Booking Modal ──────────────────────────────────────────────
type ChipOrder = { denomId: number; qty: number };

function ChipBookingModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (order: ChipOrder[], total: number, paymentMethod: string, refNum: string) => void;
}) {
  const [orders, setOrders] = useState<ChipOrder[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentError, setPaymentError] = useState("");
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [payment, setPayment] = useState<PaymentData>({ ...EMPTY_PAYMENT });
  const [refNum] = useState(() => `CSN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const dialogRef = useDialogAccessibility(onClose);

  const inputStyle: React.CSSProperties = { background: "#1a1814", border: "1px solid #2a2620", borderRadius: "2px", color: "#f0ece4", fontFamily: "var(--font-body)", fontSize: "14px", padding: "10px 14px", outline: "none", width: "100%" };
  const labelStyle: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.15em", textTransform: "uppercase" as const, display: "block", marginBottom: "6px" };

  const updateQty = (denomId: number, delta: number) => {
    setOrders(prev => {
      const existing = prev.find(o => o.denomId === denomId);
      const newQty = Math.max(0, (existing?.qty ?? 0) + delta);
      if (newQty === 0) return prev.filter(o => o.denomId !== denomId);
      if (existing) return prev.map(o => o.denomId === denomId ? { ...o, qty: newQty } : o);
      return [...prev, { denomId, qty: newQty }];
    });
  };

  const subtotal = orders.reduce((s, o) => {
    const denom = CHIP_DENOMINATIONS.find(d => d.value === o.denomId);
    return s + (denom?.value ?? 0) * o.qty;
  }, 0);
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax;
  const totalChips = orders.reduce((s, o) => s + o.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="chip-booking-title" tabIndex={-1} className="relative flex flex-col w-full max-w-xl max-h-[92vh] overflow-y-auto" style={{ background: "#0e0d0b", border: "1px solid #2a2620" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#2a2620", background: "#161410" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.25em", textTransform: "uppercase" }}>Red Star Casino</p>
            <h2 id="chip-booking-title" style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#f0ece4", margin: 0 }}>Book Casino Chips</h2>
          </div>
          <button aria-label="Close chip booking dialog" onClick={onClose} style={{ background: "none", border: "none", color: "#a89880", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div className="px-6 py-6">
          {step === 1 ? (
            <>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "20px" }}>
                Select Chip Denominations
              </p>
              <div className="flex flex-col gap-3">
                {CHIP_DENOMINATIONS.map((d) => {
                  const order = orders.find(o => o.denomId === d.value);
                  const qty = order?.qty ?? 0;
                  return (
                    <div key={d.value} className="flex items-center gap-4 p-4 border" style={{ borderColor: qty > 0 ? "#c9a96e40" : "#2a2620", background: "#161410" }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-4" style={{ background: d.hex, borderColor: "rgba(0,0,0,0.3)" }} />
                      <div className="flex-1">
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#f0ece4" }}>₱{d.value.toLocaleString()}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.1em" }}>{d.label} chip</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateQty(d.value, -1)} disabled={qty === 0} style={{ width: "30px", height: "30px", border: "1px solid #2a2620", background: "#1a1814", color: qty === 0 ? "#3a3530" : "#c9a96e", fontSize: "18px", cursor: qty === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "#f0ece4", width: "24px", textAlign: "center" }}>{qty}</span>
                        <button onClick={() => updateQty(d.value, 1)} style={{ width: "30px", height: "30px", border: "1px solid #2a2620", background: "#1a1814", color: "#c9a96e", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#a89880", width: "80px", textAlign: "right" }}>
                        {qty > 0 ? `₱${(d.value * qty).toLocaleString()}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 p-4 border" style={{ borderColor: "#2a2620", background: "#161410" }}>
                <div className="flex justify-between mb-2">
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60" }}>Chips ({totalChips} pcs)</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#a89880" }}>₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-3">
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60" }}>VAT 12%</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#a89880" }}>₱{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-3 border-t" style={{ borderColor: "#2a2620" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#f0ece4" }}>Total</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "#c9a96e" }}>₱{total.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => setStep(2)} disabled={orders.length === 0}
                className="w-full mt-5 py-4 transition-all"
                style={{ background: orders.length === 0 ? "#1a1814" : "#c9a96e", color: orders.length === 0 ? "#3a3530" : "#0e0d0b", fontFamily: "var(--font-body)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "13px", border: "none", cursor: orders.length === 0 ? "default" : "pointer" }}
              >
                Proceed to Payment
              </button>
            </>
          ) : (
            <>
              <PaymentStep
                payment={payment as Parameters<typeof PaymentStep>[0]["payment"]}
                setPayment={(nextPayment) => {
                  setPayment(nextPayment as typeof payment);
                  setPaymentError("");
                }}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                amountDue={total}
                showErrors={paymentAttempted}
              />
              <div className="mt-5 p-4 border" style={{ borderColor: "#2a2620", background: "#161410" }}>
                <div className="flex justify-between"><span style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#f0ece4" }}>Total Due</span><span style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "#c9a96e" }}>₱{total.toLocaleString()}</span></div>
              </div>
              {paymentError && (
                <p role="alert" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#d47b5f", lineHeight: 1.6, textAlign: "center", marginTop: "12px" }}>
                  {paymentError}
                </p>
              )}
              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(1)} className="flex-1 py-4 border" style={{ borderColor: "#2a2620", color: "#a89880", fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.08em", background: "none", cursor: "pointer" }}>← Back</button>
                <button onClick={() => {
                  const error = validatePayment(payment);
                  setPaymentAttempted(true);
                  if (error) {
                    setPaymentError(error);
                    return;
                  }
                  setShowPaymentConfirmation(true);
                }} className="flex-2 py-4 transition-all px-8"
                  style={{ background: "#c9a96e", color: "#0e0d0b", fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", border: "none", cursor: "pointer", flex: 2 }}>
                  Confirm & Pay
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showPaymentConfirmation && (
        <PaymentConfirmationDialog
          payment={payment}
          amount={total}
          reference={refNum}
          onBack={() => setShowPaymentConfirmation(false)}
          onConfirm={() => onConfirm(orders, total, paymentMethodLabel(payment), refNum)}
        />
      )}
    </div>
  );
}

// ── Casino Page ────────────────────────────────────────────────────────────
function CasinoPage({
  onBack, onRooms, onAmenities, onPortal, onBookChips,
}: {
  onBack: () => void;
  onRooms: () => void;
  onAmenities: (tab?: AmenityTab) => void;
  onPortal: () => void;
  onBookChips: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", ...Array.from(new Set(CASINO_GAMES.map(g => g.category)))];
  const filtered = activeCategory === "All" ? CASINO_GAMES : CASINO_GAMES.filter(g => g.category === activeCategory);

  const [occupancy] = useState<Record<number, number>>(() =>
    Object.fromEntries(CASINO_GAMES.map(g => [g.id, Math.floor(Math.random() * 101)]))
  );

  return (
    <div style={{ background: "#0e0d0b", minHeight: "100vh" }}>
      {/* Header */}
      <div className="border-b px-8 md:px-16 py-6" style={{ borderColor: "#2a2620" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#c9a96e")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}>
              ← RED 5 STAR HOTEL
            </button>
            <span style={{ color: "#2a2620" }}>/</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.1em" }}>RED STAR CASINO</span>
          </div>
          <button onClick={onPortal} className="text-sm px-5 py-2 border transition-colors" style={{ borderColor: "#2a2620", color: "#a89880", fontFamily: "var(--font-body)", fontSize: "13px" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2620"; (e.currentTarget as HTMLElement).style.color = "#a89880"; }}>
            My Bookings
          </button>
        </div>
      </div>

      {/* Casino hero */}
      <div className="relative px-8 md:px-16 py-20 overflow-hidden" style={{ borderBottom: "1px solid #2a2620" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=1800&h=600&fit=crop&auto=format)", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.15)" }} />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.3em", color: "#c9a96e", textTransform: "uppercase", marginBottom: "16px" }}>Boracay Island · Licensed Casino</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)", color: "#f0ece4", lineHeight: 1.1, marginBottom: "16px" }}>Red Star<br /><em>Casino</em></h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "#a89880", maxWidth: "500px", lineHeight: 1.7 }}>
              Twelve game types across three floors. From mass-market tables to exclusive VIP private rooms — Boracay's premier gaming destination, licensed under PAGCOR.
            </p>
          </div>
          <button
            onClick={onBookChips}
            className="px-8 py-4 flex items-center gap-3 flex-shrink-0 transition-all"
            style={{ background: "#c9a96e", color: "#0e0d0b", fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#b8964f"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#c9a96e"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
            Book Chips Online
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b" style={{ borderColor: "#2a2620" }}>
        {[
          { label: "Table Games", value: "40+" },
          { label: "Slot Machines", value: "200" },
          { label: "VIP Private Rooms", value: "4" },
          { label: "Open Hours", value: "24/7" },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center justify-center py-6 border-r last:border-r-0" style={{ borderColor: "#2a2620" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: "#c9a96e", marginBottom: "4px" }}>{value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.2em", textTransform: "uppercase" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="px-8 md:px-16 py-6 border-b overflow-x-auto" style={{ borderColor: "#2a2620" }}>
        <div className="flex gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 text-sm flex-shrink-0 transition-all"
              style={{
                fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase",
                border: "1px solid", borderColor: activeCategory === cat ? "#c9a96e" : "#2a2620",
                background: activeCategory === cat ? "rgba(201,169,110,0.1)" : "transparent",
                color: activeCategory === cat ? "#c9a96e" : "#7a6f60", cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Games grid */}
      <div className="px-8 md:px-16 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game) => (
            <div key={game.id} className="group border flex flex-col" style={{ borderColor: "#2a2620", background: "#161410" }}>
              <div className="relative overflow-hidden h-44">
                <img src={game.img} alt={game.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=540&fit=crop&auto=format"; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,13,11,0.8) 0%, transparent 60%)" }} />
                <div className="absolute top-3 left-3 px-2 py-1" style={{ background: "rgba(14,13,11,0.85)", fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {game.category}
                </div>
                <div className="absolute bottom-3 left-4">
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#f0ece4" }}>{game.name}</span>
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1 gap-3">
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#7a6f60", lineHeight: 1.7, flex: 1 }}>{game.description}</p>
                {/* Occupancy indicator */}
                {(() => {
                  const occ = occupancy[game.id] ?? 0;
                  const pct = Math.min(occ, 100);
                  const color = pct <= 30 ? "#4ade80" : pct <= 60 ? "#fb923c" : "#f87171";
                  const label = pct <= 30 ? "LOW" : pct <= 60 ? "MODERATE" : "HIGH";
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#5a5040", letterSpacing: "0.15em", textTransform: "uppercase" }}>People in game area</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color, letterSpacing: "0.1em", fontWeight: 600 }}>
                          {pct} people · {label}
                        </span>
                      </div>
                      <div style={{ height: "3px", background: "#1e1c18", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })()}
                <div className="flex flex-wrap gap-3 pt-2 border-t" style={{ borderColor: "#2a2620" }}>
                  {[
                    { label: "Min Bet", value: `₱${game.minBet.toLocaleString()}` },
                    { label: "Tables", value: game.tables.toString() },
                    { label: "Max Bet", value: game.maxBet > 0 ? `₱${game.maxBet.toLocaleString()}` : "No limit" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#5a5040", letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#a89880" }}>{value}</div>
                    </div>
                  ))}
                </div>
                {game.category === "VIP" ? (
                  <button onClick={onBookChips} className="w-full py-2.5 border transition-all text-sm mt-1"
                    style={{ borderColor: "#c9a96e", color: "#c9a96e", fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.08em", background: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#0e0d0b"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}>
                    Request VIP Access
                  </button>
                ) : (
                  <button onClick={onBookChips} className="w-full py-2.5 border transition-all text-sm mt-1"
                    style={{ borderColor: "#2a2620", color: "#a89880", fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.08em", background: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2620"; (e.currentTarget as HTMLElement).style.color = "#a89880"; }}>
                    Book Chips for This Game
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* PAGCOR notice */}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#3a3530", letterSpacing: "0.08em", marginTop: "48px", lineHeight: 1.8 }}>
          Red Star Casino operates under PAGCOR License No. RSC-2019-0087. Must be 21 years or older to enter. Please gamble responsibly.
          If you or someone you know has a gambling problem, call the PAGCOR helpline: 1800-988-1212.
          All chip purchases are final. Chips must be redeemed at the Casino Cage within the booking date.
        </p>
      </div>

      <HotelFooter onRooms={onRooms} onAmenities={onAmenities} onPortal={onPortal} onCasino={() => {}} />
    </div>
  );
}

export default function App({ roomRates = {} }: { roomRates?: Record<number, number> }) {
  const router = useRouter();
  const session = useSyncExternalStore(
    appSession.subscribe,
    appSession.getSnapshot,
    appSession.getServerSnapshot,
  );
  // Returning from the auth routes must not reuse a cached signed-out snapshot.
  // Keep this refresh scoped to the public page; dashboard UI/routing is untouched.
  useEffect(() => {
    void appSession.refresh();
  }, []);
  const [search, setSearch] = useState({
    checkIn: nextWeek,
    checkOut: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
    guests: 1,
    type: "All",
  });
  const [view, setView] = useState<View>("search");
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeOffer, setActiveOffer] = useState<HotelOffer | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<{ room: Room; data: BookingData; refNum: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [amenitiesTab, setAmenitiesTab] = useState<AmenityTab>("All");
  const [allBookings, setAllBookings] = useState<BookingRecord[]>(() =>
    loadStoredValue<BookingRecord[]>(BOOKINGS_STORAGE_KEY, [])
  );
  const user: AuthUser | null = session.status === "signed-in"
    ? {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        avatar: session.user.name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join(""),
      }
    : null;
  const [showChipBooking, setShowChipBooking] = useState(false);
  const [bookingSaveError, setBookingSaveError] = useState("");

  useEffect(() => {
    window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(allBookings));
  }, [allBookings]);

  const getBookedFloorsForRoom = (roomId: number, checkIn: string, checkOut: string): number[] =>
    allBookings
      .filter((booking) =>
        booking.kind === "room"
        && booking.roomId === roomId
        && booking.floor !== undefined
        && booking.endDate
        && booking.status !== "cancelled"
        && datesOverlap(checkIn, checkOut, booking.date, booking.endDate)
      )
      .map((booking) => booking.floor as number);

  const visibleBookings = user ? allBookings : [];

  const openPortal = () => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
        return;
      }
      if (user.role === "staff") {
        router.push("/staff/dashboard");
        return;
      }
      setView("portal");
      return;
    }
    void appSession.beginSignIn().then(() => router.push("/sign-in?switch=1"));
  };

  const handleLogout = () => {
    setView("search");
    void signOutEverywhere(router);
  };

  const addBooking = (record: BookingRecord) => {
    setAllBookings((prev) => [record, ...prev]);
    setBookingSaveError("");

    void createWebsiteBooking({
      reference: record.refNum,
      kind: record.kind,
      serviceName: record.name,
      category: record.category,
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      phone: record.phone,
      arrivalDate: record.date,
      departureDate: record.endDate,
      bookingTime: record.time,
      guests: record.guests,
      roomTypeId: record.roomId,
      floor: record.floor,
      total: record.total,
      amountPaid: record.amountPaid ?? 0,
      paymentMethod: record.paymentMethod,
    })
      .then((result) => {
        if (!result.ok) setBookingSaveError(result.message);
      })
      .catch(() => {
        setBookingSaveError(
          "Your reservation is saved on this device, but it could not be sent to hotel staff. Please contact reservations with your reference number.",
        );
      });
  };

  const cancelBooking = (id: string) =>
    setAllBookings((prev) =>
      prev.map((booking) => {
        if (booking.id !== id) return booking;
        const refundAmount = booking.nonRefundable ? 0 : booking.amountPaid ?? 0;
        const refundMethod = booking.nonRefundable
          ? "Not applicable"
          : booking.paymentHistory?.find((item) => item.purpose === "Deposit")?.method ?? booking.paymentMethod;
        const refundedAt = new Date().toLocaleString();
        return {
          ...booking,
          status: "cancelled",
          refundAmount,
          refundMethod,
          refundedAt,
          paymentHistory: refundAmount > 0
            ? [
                ...(booking.paymentHistory ?? []),
                { id: `REF-${Date.now().toString(36).toUpperCase()}`, date: refundedAt, method: refundMethod, amount: refundAmount, purpose: "Refund" as const },
              ]
            : booking.paymentHistory,
        };
      })
    );

  const checkInBooking = (id: string, paymentMethod: string): BookingRecord => {
    const current = allBookings.find((booking) => booking.id === id)!;
    const checkInPayment = Math.max(0, current.total - (current.amountPaid ?? 0));
    const updated: BookingRecord = {
      ...current,
      status: "checked-in",
      amountPaid: current.total,
      depositPaid: current.depositPaid ?? current.amountPaid ?? current.total,
      checkInPayment,
      checkedInAt: new Date().toLocaleString(),
      roomAccessCode: String(Math.floor(100000 + Math.random() * 900000)),
      paymentMethod: (current.amountPaid ?? 0) < current.total
        ? `${current.paymentMethod} · Balance paid via ${paymentMethod}`
        : current.paymentMethod,
      paymentHistory: checkInPayment > 0
        ? [
            ...(current.paymentHistory ?? []),
            { id: `PAY-${Date.now().toString(36).toUpperCase()}`, date: new Date().toLocaleString(), method: paymentMethod, amount: checkInPayment, purpose: "Balance at check-in" },
          ]
        : current.paymentHistory,
    };
    setAllBookings((prev) => prev.map((booking) => booking.id === id ? updated : booking));
    return updated;
  };

  const checkOutBooking = (id: string, charges: ChargeItem[], paymentMethod: string): BookingRecord => {
    const current = allBookings.find((booking) => booking.id === id)!;
    const extraCharges = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const vatAmount = Math.round(extraCharges * 0.12);
    const serviceCharge = Math.round(extraCharges * 0.1);
    const checkoutPayment = extraCharges + vatAmount + serviceCharge;
    const updated: BookingRecord = {
      ...current,
      status: "completed",
      checkedOutAt: new Date().toLocaleString(),
      charges,
      extraCharges,
      vatAmount,
      serviceCharge,
      checkoutPayment,
      finalTotal: current.total + checkoutPayment,
      amountPaid: current.total + checkoutPayment,
      receiptNo: `R5R-${Date.now().toString(36).toUpperCase()}`,
      checkoutPaymentMethod: paymentMethod,
      paymentHistory: checkoutPayment > 0
        ? [
            ...(current.paymentHistory ?? []),
            { id: `PAY-${Date.now().toString(36).toUpperCase()}`, date: new Date().toLocaleString(), method: paymentMethod, amount: checkoutPayment, purpose: "Check-out payment" },
          ]
        : current.paymentHistory,
    };
    setAllBookings((prev) => prev.map((booking) => booking.id === id ? updated : booking));
    return updated;
  };

  const filteredRooms = ROOMS.map((room) => ({
    ...room,
    price: roomRates[room.id] ?? room.price,
  })).filter(
    (r) =>
      (search.type === "All" || r.type === search.type) &&
      r.guests >= search.guests
  );

  const handleSearch = () => {
    setActiveOffer(null);
    setView("listings");
  };

  const handleOfferRooms = (offer: HotelOffer) => {
    setActiveOffer(offer);
    setView("listings");
  };

  const handleBook = (room: Room) => {
    setActiveRoom(room);
    setShowModal(true);
  };

  const handleConfirm = (data: BookingData) => {
    const room = activeRoom!;
    const nights = Math.max(1, Math.ceil((new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000));
    const subtotal = room.price * nights;
    const total = subtotal + Math.round(subtotal * 0.12);
    const amountPaid = Math.round(total * data.paymentPercentage / 100);
    const refNum = data.refNum;
    const methodLabel = PAYMENT_METHODS.find((m) => m.id === data.payment.method)?.label ?? "Card";
    const roomNumber = `${data.floor}${String(room.id).padStart(2, "0")}`;
    addBooking({
      id: refNum,
      kind: "room",
      roomId: room.id,
      floor: data.floor,
      name: `${room.name} — Room ${roomNumber}`,
      category: `${room.type} · Floor ${data.floor}`,
      img: room.img,
      date: data.checkIn,
      endDate: data.checkOut,
      guests: data.guests,
      total,
      amountPaid,
      depositPaid: amountPaid,
      paymentMethod: `${methodLabel} · ${data.paymentPercentage === 100 ? "Paid in full" : `${data.paymentPercentage}% down payment`}`,
      paymentHistory: [{
        id: `PAY-${Date.now().toString(36).toUpperCase()}`,
        date: new Date().toLocaleString(),
        method: methodLabel,
        amount: amountPaid,
        purpose: "Deposit",
      }],
      status: "upcoming",
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      refNum,
      offerName: activeOffer?.title,
      nonRefundable: activeOffer?.nonRefundable ?? false,
    });
    setActiveOffer(null);
    setConfirmedBooking({ room, data, refNum });
    setShowModal(false);
    setView("confirm");
  };

  const handleReset = () => {
    setView("search");
    setConfirmedBooking(null);
    setActiveRoom(null);
  };

  const goToAmenities = (tab: AmenityTab = "All") => {
    setAmenitiesTab(tab);
    setView("amenities");
  };

  const [appTab, setAppTab] = useState<"booking" | "flowchart">("booking");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  if (appTab === "flowchart") {
    return (
      <div style={{ background: "#0e0d0b", minHeight: "100%" }}>
        <div className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: "#2a2620" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.25em", textTransform: "uppercase" }}>
            Red 5 Star Hotel
          </span>
          <button
            onClick={() => setAppTab("booking")}
            className="text-sm px-5 py-2 border transition-colors"
            style={{ borderColor: "#2a2620", color: "#a89880", fontFamily: "var(--font-body)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#c9a96e"; (e.currentTarget as HTMLElement).style.color = "#c9a96e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a2620"; (e.currentTarget as HTMLElement).style.color = "#a89880"; }}
          >
            ← Back to Booking
          </button>
        </div>
        <Flowchart />
      </div>
    );
  }

  if (view === "portal") {
    return (
      <GuestPortal
        bookings={visibleBookings}
        onCancel={cancelBooking}
        onCheckIn={checkInBooking}
        onCheckOut={checkOutBooking}
        onBack={() => setView("search")}
        onBookRoom={() => setView("search")}
        onLogout={handleLogout}
      />
    );
  }

  if (view === "amenities") {
    return (
      <>
        <BookingAdminSyncNotice message={bookingSaveError} />
        <AmenitiesPage
          onBack={() => setView("search")}
          initialTab={amenitiesTab}
          onBookingConfirmed={addBooking}
        />
      </>
    );
  }

  if (view === "offers") {
    return (
      <OffersPage
        onBack={() => setView("search")}
        onRooms={handleOfferRooms}
        onAmenities={goToAmenities}
        onPortal={openPortal}
      />
    );
  }

  if (view === "casino") {
    return (
      <>
        <BookingAdminSyncNotice message={bookingSaveError} />
        <CasinoPage
          onBack={() => setView("search")}
          onRooms={handleSearch}
          onAmenities={goToAmenities}
          onPortal={openPortal}
          onBookChips={() => setShowChipBooking(true)}
        />
        {showChipBooking && (
          <ChipBookingModal
            onClose={() => setShowChipBooking(false)}
            onConfirm={(orders, total, paymentMethod, refNum) => {
              const totalChips = orders.reduce((s, o) => s + o.qty, 0);
              addBooking({
                id: refNum, kind: "amenity", name: `Casino Chips — ${totalChips} pcs`,
                category: "Red Star Casino", img: "https://images.unsplash.com/photo-1738814041356-9f8187530643?w=800&h=540&fit=crop&auto=format",
                date: today, guests: 1, total, amountPaid: total, paymentMethod, status: "upcoming",
                paymentHistory: [{
                  id: `PAY-${Date.now().toString(36).toUpperCase()}`,
                  date: new Date().toLocaleString(),
                  method: paymentMethod,
                  amount: total,
                  purpose: "Deposit",
                }],
                firstName: user?.name.split(" ")[0] ?? "Guest", lastName: user?.name.split(" ").slice(1).join(" ") ?? "",
                email: user?.email ?? "", phone: "", refNum,
              });
              setShowChipBooking(false);
            }}
          />
        )}
      </>
    );
  }

  if (view === "confirm" && confirmedBooking) {
    return (
      <>
        <BookingAdminSyncNotice message={bookingSaveError} />
        <ConfirmationScreen
          room={confirmedBooking.room}
          booking={confirmedBooking.data}
          refNum={confirmedBooking.refNum}
          onReset={handleReset}
          onPortal={openPortal}
        />
      </>
    );
  }

  return (
    <div style={{ background: "#0e0d0b", minHeight: "100%" }}>
      <BookingAdminSyncNotice message={bookingSaveError} />
      {view === "search" && (
        <>
          <HeroSection
            search={search}
            setSearch={setSearch}
            onSearch={handleSearch}
            onAmenities={goToAmenities}
            onPortal={openPortal}
            onOffers={() => setView("offers")}
            onCasino={() => setView("casino")}
            onSignIn={() => { void appSession.beginSignIn().then(() => router.push("/sign-in?switch=1")); }}
            onSignUp={() => { void appSession.beginSignIn().then(() => router.push("/sign-up?switch=1")); }}
            onLogout={handleLogout}
            user={user}
            bookingCount={visibleBookings.filter((b) => b.status !== "cancelled").length}
          />
          <HotelFooter onRooms={handleSearch} onAmenities={goToAmenities} onPortal={openPortal} onOffers={() => setView("offers")} onCasino={() => setView("casino")} onFlowchart={() => setAppTab("flowchart")} />
        </>
      )}

      {view === "listings" && (
        <div style={{ background: "#0e0d0b", minHeight: "100vh" }}>
          {/* Listings header */}
          <div
            className="border-b px-8 md:px-16 py-6"
            style={{ borderColor: "#2a2620" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView("search")}
                  className="flex items-center gap-2 transition-colors"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.1em" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#c9a96e")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7a6f60")}
                >
                  ← RED 5 STAR HOTEL
                </button>
                <span style={{ color: "#2a2620" }}>/</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c9a96e", letterSpacing: "0.1em" }}>
                  ROOMS
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div
                  className="hidden md:flex items-center gap-2 px-4 py-2 border"
                  style={{ borderColor: "#2a2620" }}
                >
                  {[
                    { label: "In", val: search.checkIn },
                    { label: "Out", val: search.checkOut },
                    { label: "Guests", val: String(search.guests) },
                  ].map(({ label, val }, i) => (
                    <span key={label} className="flex items-center gap-2">
                      {i > 0 && <span style={{ color: "#2a2620" }}>·</span>}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60" }}>
                        {label}:
                      </span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#a89880" }}>
                        {val}
                      </span>
                    </span>
                  ))}
                </div>
                <select
                  value={search.type}
                  onChange={(e) => setSearch({ ...search, type: e.target.value })}
                  className="px-3 py-2 border outline-none"
                  style={{
                    borderColor: "#2a2620",
                    background: "transparent",
                    color: "#a89880",
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                  }}
                >
                  <option value="All" style={{ background: "#161410" }}>All Types</option>
                  <option value="Standard" style={{ background: "#161410" }}>Standard</option>
                  <option value="Room" style={{ background: "#161410" }}>Deluxe / Premier</option>
                  <option value="Suite" style={{ background: "#161410" }}>Suite</option>
                  <option value="Family" style={{ background: "#161410" }}>Family</option>
                  <option value="Villa" style={{ background: "#161410" }}>Villa / Casita</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="px-8 md:px-16 py-8">
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#7a6f60", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              {filteredRooms.length} {filteredRooms.length === 1 ? "Room" : "Rooms"} Available
            </p>
          </div>

          {/* Room list */}
          <div className="px-8 md:px-16 pb-20 flex flex-col gap-6">
            {filteredRooms.length === 0 ? (
              <div className="py-20 text-center">
                <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#a89880" }}>
                  No rooms match your criteria.
                </p>
                <button
                  onClick={() => setSearch({ ...search, type: "All" })}
                  className="mt-4 text-sm underline"
                  style={{ color: "#c9a96e", fontFamily: "var(--font-body)" }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onBook={handleBook}
                  bookedFloors={getBookedFloorsForRoom(room.id, search.checkIn, search.checkOut)}
                />
              ))
            )}
          </div>
          <HotelFooter onRooms={() => setView("search")} onAmenities={goToAmenities} onPortal={openPortal} onOffers={() => setView("offers")} onCasino={() => setView("casino")} />
        </div>
      )}

      {showModal && activeRoom && (
        <BookingModal
          room={activeRoom}
          search={search}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
          getBookedFloors={(checkIn, checkOut) =>
            getBookedFloorsForRoom(activeRoom.id, checkIn, checkOut)
          }
        />
      )}
    </div>
  );
}
