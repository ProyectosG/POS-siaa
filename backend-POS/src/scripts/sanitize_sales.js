const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const db = new sqlite3.Database(
  path.join(__dirname, '../pos.db'),
  err => {
    if (err) console.error(err)
    else console.log('Conectado a SQLite')
  }
)

db.serialize(() => {
  console.log('🧹 Sanenado sale_details...')

  db.run(`
    UPDATE sale_details
    SET
      articulo = COALESCE(articulo, 'ARTÍCULO'),
      quantity = COALESCE(quantity, 1),
      subtotal = COALESCE(subtotal, 0)
  `)

  console.log('✅ Registros saneados')
})

db.close()
