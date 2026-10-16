import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE_NAME, USER_COOKIE_NAME, verifyManagementToken } from '@/lib/session-token'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value
    const userToken = request.cookies.get(USER_COOKIE_NAME)?.value
    const admin = adminToken ? await verifyManagementToken(adminToken) : null
    const user = userToken ? await verifyManagementToken(userToken) : null
    if (admin?.role !== 'admin' && user?.role !== 'user') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
