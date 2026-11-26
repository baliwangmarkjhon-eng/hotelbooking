import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const destination = request.nextUrl.clone()
  destination.pathname = request.nextUrl.pathname.replace(
    /^\/admin\/dashboard/,
    '/hotel-admin-dashboard',
  )
  return NextResponse.rewrite(destination)
}

export const config = {
  matcher: '/admin/dashboard/:path*',
}
