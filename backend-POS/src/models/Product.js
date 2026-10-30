// src/models/Product.js
// Con Prisma. El alta (crear) va en una transacción junto con el kardex de su
// stock inicial; un cambio de código de barras, junto con su historial.
const { prisma } = require('../config/prisma');
const { enTransaccion } = require('../config/transaccion');
const { ahoraNegocio, ahoraUTC } = require('../utils/fechas');
const { aCentavos, filaAPesos } = require('../utils/dinero');
const { ErrorCampo, numeroONulo } = require('../utils/peticion');

// Precios y costo: llegan y salen en pesos; en la base van en centavos
const PRECIOS = ['precio_menudeo', 'precio_mayoreo', 'precio_especial', 'precio_oferta', 'costo'];

// Campos que se pueden modificar con update(). El stock NO: solo cambia con
// ventas, entradas y salidas, que dejan kardex (el formulario de productos
// mandaba el stock que tenía al abrirse y borraba las ventas de en medio).
const CAMPOS_EDITABLES = [
  'codigo_barras', 'codigo_interno', 'articulo', 'presentacion', 'unidad_medida',
  'precio_menudeo', 'precio_mayoreo', 'precio_especial', 'precio_oferta',
  'iva', 'ieps', 'category_id', 'photo_url', 'activo',
  'costo', // solo el Administrador (lo revisa productController)
];
const NUMEROS = ['iva', 'ieps'];

// Familia y subfamilia de la categoría, como las daba el JOIN de antes
const CON_CATEGORIA = { categories: { select: { family: true, subfamily: true } } };

// Fila de Prisma → producto del API (en pesos, con family y subfamily)
function aProducto(fila) {
  if (!fila) return fila;
  const { categories, ...producto } = fila;
  return filaAPesos({ ...producto, family: categories?.family, subfamily: categories?.subfamily }, 'products');
}

// Valor del API → valor de la columna (lanza ErrorCampo si no es del tipo)
function convertir(campo, valor) {
  if (PRECIOS.includes(campo)) {
    if (valor === null || valor === '') return null;
    const centavos = aCentavos(valor);
    if (centavos === null) throw new ErrorCampo(campo);
    return centavos;
  }
  if (NUMEROS.includes(campo)) return numeroONulo(campo, valor);
  if (campo === 'category_id') {
    const id = numeroONulo(campo, valor, { entero: true });
    if (id === null) throw new ErrorCampo(campo);
    return id;
  }
  if (campo === 'activo') return valor ? 1 : 0;
  return valor === null ? null : String(valor);
}

class Product {
  // Va DENTRO de una transacción (tx de Prisma), junto con el kardex del alta.
  // Lanza ErrorCampo si un precio o el IVA no son número.
  static async crear(tx, data) {
    const precio = (campo) => {
      const v = data[campo];
      if (v === null || v === undefined || v === '') return null;
      const centavos = aCentavos(v);
      if (centavos === null) throw new ErrorCampo(campo);
      return centavos || null;
    };
    const producto = await tx.products.create({
      data: {
        codigo_barras: data.codigo_barras ? String(data.codigo_barras) : null,
        codigo_interno: data.codigo_interno ? String(data.codigo_interno) : null,
        articulo: String(data.articulo).trim(),
        presentacion: data.presentacion ? String(data.presentacion) : null,
        unidad_medida: data.unidad_medida ? String(data.unidad_medida) : null,
        precio_menudeo: precio('precio_menudeo'),
        precio_mayoreo: precio('precio_mayoreo'),
        precio_especial: precio('precio_especial'),
        precio_oferta: precio('precio_oferta'),
        costo: precio('costo'),
        iva: numeroONulo('iva', data.iva) || null,
        ieps: numeroONulo('ieps', data.ieps) || null,
        stock: data.stock || 0,
        category_id: data.category_id,
        photo_url: data.photo_url || null,
        activo: data.activo ? 1 : 0,
      },
      select: { id: true },
    });
    return producto.id;
  }


  static async findAll() {
    const filas = await prisma.products.findMany({ include: CON_CATEGORIA, orderBy: { articulo: 'asc' } });
    return filas.map(aProducto);
  }

  static async findByBarcode(codigo) {
    return aProducto(await prisma.products.findUnique({ where: { codigo_barras: String(codigo) }, include: CON_CATEGORIA }));
  }

  // Activos cuyo nombre contiene el texto (máximo 20)
  static async searchByName(texto) {
    const filas = await prisma.products.findMany({
      where: { articulo: { contains: texto }, activo: 1 },
      select: {
        id: true, codigo_barras: true, articulo: true, presentacion: true, stock: true,
        precio_menudeo: true, precio_mayoreo: true, precio_especial: true, precio_oferta: true,
        iva: true, category_id: true, ...CON_CATEGORIA,
      },
      orderBy: { articulo: 'asc' },
      take: 20,
    });
    return filas.map(aProducto);
  }

  static async findById(id) {
    return aProducto(await prisma.products.findUnique({ where: { id }, include: CON_CATEGORIA }));
  }

  // Solo campos de la lista fija; lo demás (incluido stock) se ignora.
  // Devuelve false si no existe. Una categoría inexistente lanza P2003 y un
  // código de barras repetido, P2002.
  // Con `usuario` (del token) va en una transacción: si cambia el código de
  // barras, anota el cambio en codigo_barras_historial junto con la edición.
  static async update(id, data, usuario) {
    const cambios = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (data[campo] !== undefined) cambios[campo] = convertir(campo, data[campo]);
    }
    if (Object.keys(cambios).length === 0) {
      return (await prisma.products.count({ where: { id } })) > 0;
    }
    if (cambios.codigo_barras === undefined) {
      const { count } = await prisma.products.updateMany({ where: { id }, data: cambios });
      return count > 0;
    }
    return enTransaccion(async (tx) => {
      const antes = await tx.products.findUnique({ where: { id }, select: { codigo_barras: true } });
      if (!antes) return false;
      await tx.products.update({ where: { id }, data: cambios });
      const anterior = antes.codigo_barras ?? null;
      const nuevo = cambios.codigo_barras ?? null;
      if (anterior !== nuevo) {
        const { date, time } = ahoraNegocio();
        await tx.codigo_barras_historial.create({
          data: {
            product_id: id,
            codigo_anterior: anterior,
            codigo_nuevo: nuevo,
            id_user: usuario?.id ?? null,
            nickname_user: usuario?.nickname ?? null,
            date,
            time,
            fecha: ahoraUTC(),
          },
        });
      }
      return true;
    });
  }

  // Cambios de código de barras del producto, del más reciente al más viejo
  static async historialCodigos(id) {
    return prisma.codigo_barras_historial.findMany({
      where: { product_id: id },
      select: {
        id: true, codigo_anterior: true, codigo_nuevo: true,
        nickname_user: true, date: true, time: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  // Producto que tuvo antes este código (etiquetas viejas en el anaquel). Solo
  // se usa si ningún producto tiene hoy ese código. Si varios lo tuvieron, gana
  // el cambio más reciente.
  static async findByCodigoAnterior(codigo) {
    const cambio = await prisma.codigo_barras_historial.findFirst({
      where: { codigo_anterior: String(codigo) },
      select: { product_id: true },
      orderBy: { id: 'desc' },
    });
    if (!cambio) return null;
    return Product.findById(cambio.product_id);
  }

  // Devuelve false si no existe. Con movimientos (kardex, ventas, entradas,
  // salidas) SQLite rechaza el borrado y Prisma lanza P2003.
  static async delete(id) {
    const { count } = await prisma.products.deleteMany({ where: { id } });
    return count > 0;
  }
}

module.exports = Product;
