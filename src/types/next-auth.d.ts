import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      payloadUserId?: string
      role?: 'guest' | 'staff' | 'admin'
      active?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    payloadUserId?: string
    role?: 'guest' | 'staff' | 'admin'
    active?: boolean
  }
}
