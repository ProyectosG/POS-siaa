// src/models/Product.js
// Consulta, edición y baja con Prisma. El alta (crear) sigue con la conexión
// de transacciones: va junto con el kardex de su stock inicial.
const { prisma } = require('../config/prisma');
const { aCentavos, filaAPesos } = require('../utils/dinero');
const { ErrorCampo, numeroONulo } = require('../utils/peticion');

// Precios: llegan y salen en pesos; en la base van en centavos
const PRECIOS = ['precio_menudeo', 'precio_mayoreo', 'precio_especial', 'precio_oferta'];

// Campos que se pueden modificar con update(). El stock NO: solo cambia con
// ventas, entradas y salidas, que dejan kardex (el formulario de productos
// mandaba el stock que tenía al abrirse y borraba las ventas de en medio).
const CAMPOS_EDITABLES = [
  'codigo_barras', 'codigo_interno', 'articulo', 'presentacion', 'unidad_medida',
  'precio_menudeo', 'precio_mayoreo', 'precio_especial', 'precio_oferta',
  'iva', 'ieps', 'category_id', 'photo_url', 'activo',
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
  // Va DENTRO de una transacción, junto con el kardex del alta
  static async crear(tx, data) {
    const { lastID } = await tx.run(
        `INSERT INTO products
        (codigo_barras, codigo_interno,articulo, presentacion, unidad_medida, precio_menudeo, precio_mayoreo, precio_especial, precio_oferta,
          iva, ieps, stock, category_id, photo_url, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_barras || null,          // codigo_barras
          data.codigo_interno || null,         // codigo_interno
          data.articulo.trim(),               // articulo
          data.presentacion || null,          // presentacion
          data.unidad_medida || null,         // unidad_medida
          aCentavos(data.precio_menudeo) || null,        // precio_menudeo
          aCentavos(data.precio_mayoreo) || null,        // precio_mayoreo
          aCentavos(data.precio_especial) || null,       // precio_especial
          aCentavos(data.precio_oferta) || null,         // precio_oferta
          data.iva || null,                    // iva
          data.ieps || null,                   // ieps
          data.stock || 0,                     // stock
          data.category_id || null,            // category_id
          data.photo_url || null,              // photo_url
          data.activo ? 1 : 0                  // activo
        ]
    );
    return lastID;
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
  static async update(id, data) {
    const cambios = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (data[campo] !== undefined) cambios[campo] = convertir(campo, data[campo]);
    }
    if (Object.keys(cambios).length === 0) {
      return (await prisma.products.count({ where: { id } })) > 0;
    }
    const { count } = await prisma.products.updateMany({ where: { id }, data: cambios });
    return count > 0;
  }

  // Devuelve false si no existe. Con movimientos (kardex, ventas, entradas,
  // salidas) SQLite rechaza el borrado y Prisma lanza P2003.
  static async delete(id) {
    const { count } = await prisma.products.deleteMany({ where: { id } });
    return count > 0;
  }
}

module.exports = Product;
