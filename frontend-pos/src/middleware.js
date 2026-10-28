// middleware.js
// Solo hace REDIRECCIONES. Los permisos reales los revisa el backend con el token.
import { NextResponse } from 'next/server'

// Lee el contenido del JWT sin verificar la firma (aquí no hay secreto).
// Solo sirve para decidir a dónde redirigir, nunca para dar permisos.
function leerPayload(token) {
  try {
    const parte = token.split('.')[1]
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl

  const authToken = request.cookies.get('auth-token')?.value
  const cajaId = request.cookies.get('caja-id')?.value

  // 1. Rutas públicas
  if (
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }

  // 2. Sin token, o con token vencido → login
  const payload = authToken ? leerPayload(authToken) : null
  const vencido = !payload || (payload.exp && payload.exp * 1000 < Date.now())

  if (!authToken || vencido) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    if (authToken) res.cookies.delete('auth-token')
    return res
  }

  // 3. SUPERDEVELOPER: salta la selección de caja
  if (payload.superdev === true) {
    if (pathname.startsWith('/seleccion-caja')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 4. USUARIOS NORMALES: obligar a seleccionar caja
  if (!cajaId && !pathname.startsWith('/seleccion-caja')) {
    return NextResponse.redirect(new URL('/seleccion-caja', request.url))
  }

  // 5. Todo OK
  return NextResponse.next()
}

// Aplicar middleware a TODAS las rutas excepto assets estáticos
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - _next/static (archivos estáticos de Next.js)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
