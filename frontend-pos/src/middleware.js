// middleware.ts (o middleware.js)
import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Obtener cookies
  const authToken = request.cookies.get('auth-token')?.value
  const isSuperDev = request.cookies.get('is-superdev')?.value === 'true'
  const cajaId = request.cookies.get('caja-id')?.value

  // 1. Rutas públicas (sin autenticación)
  if (
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/users/login') ||
    pathname.startsWith('/api/cash-registers/abrir') ||
    pathname.startsWith('/api/products') ||      // lectura pública de productos
    pathname.startsWith('/api/categories') ||    // lectura pública
    pathname.startsWith('/api/customers') ||     // lectura pública
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/health')           // si tienes health check
  ) {
    return NextResponse.next()
  }

  // 2. Rutas API que requieren SUPERDEVELOPER exclusivamente
  if (pathname.startsWith('/api/reset') || pathname.startsWith('/api/dev')) {
    if (!authToken || !isSuperDev) {
      console.warn(`[MIDDLEWARE] Acceso denegado a ${pathname} - Requiere SUPERdeveloper`);
      return NextResponse.json(
        { error: 'Acceso denegado. Solo SUPERdeveloper puede usar esta ruta.' },
        { status: 403 }
      )
    }
    return NextResponse.next()
  }

  // 3. Otras rutas API → requieren auth-token (pueden ser usadas por superdev y usuarios normales)
  if (pathname.startsWith('/api')) {
    if (!authToken) {
      console.warn(`[MIDDLEWARE] No auth-token para API: ${pathname}`);
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // 4. Rutas frontend protegidas (dashboard y todo lo demás)
  if (!authToken) {
    console.warn(`[MIDDLEWARE] Redirigiendo a login desde: ${pathname}`);
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. SUPERDEVELOPER: acceso total, salta selección de caja
  if (isSuperDev) {
    // Si intenta ir a seleccion-caja → lo mandamos directo a dashboard
    if (pathname.startsWith('/seleccion-caja')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Todo lo demás → permitido sin caja
    return NextResponse.next()
  }

  // 6. USUARIOS NORMALES: obligar a seleccionar caja
  if (!cajaId && !pathname.startsWith('/seleccion-caja')) {
    console.log(`[MIDDLEWARE] Redirigiendo a seleccion-caja (falta caja-id) desde: ${pathname}`);
    return NextResponse.redirect(new URL('/seleccion-caja', request.url))
  }

  // 7. Todo OK
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