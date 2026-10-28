const Kardex = require('../models/Kardex');
const { ahoraNegocio } = require('../utils/fechas');

exports.createMovement = async (req, res) => {
  try {
    let {
      product_id,
      id_user,
      nickname_user,
      movement_type,
      movement_reason,
      previous_stock,
      moved_quantity,
      new_stock,
      related_folio,
      date,           // ← Ahora recibimos date y time del frontend
      time
    } = req.body;

    // El usuario sale del token, nunca del cuerpo de la petición
    id_user = req.user.id;
    nickname_user = req.user.nickname;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id es requerido' });
    }

    const allowedTypes = [
      'ALTA',
      'BAJA',
      'CAMBIO',
      'ENTRADA',
      'SALIDA',
      'INVENTARIO'
    ];

    if (!allowedTypes.includes(movement_type)) {
      return res.status(400).json({
        error: `movement_type inválido. Permitidos: ${allowedTypes.join(', ')}`
      });
    }

    if (
      previous_stock === undefined ||
      moved_quantity === undefined ||
      new_stock === undefined
    ) {
      return res.status(400).json({
        error: 'previous_stock, moved_quantity y new_stock son requeridos'
      });
    }

    /* =========================
       🔒 NORMALIZACIÓN CRÍTICA
    ========================= */
    moved_quantity = Math.abs(Number(moved_quantity)) || 0;
    previous_stock = Number(previous_stock);
    new_stock = Number(new_stock);

    /* =========================
       ✅ VALIDAR REASON
    ========================= */
    if (movement_reason) {
      const isValidReason = await Kardex.validateReason(
        movement_type,
        movement_reason
      );

      if (!isValidReason) {
        return res.status(400).json({
          error: 'movement_reason inválido o no compatible con movement_type'
        });
      }
    }

    /* =========================
       FECHA / HORA - las pone el servidor, en la zona del negocio
    ========================= */
    const { date: finalDate, time: finalTime } = ahoraNegocio();

    const kardexId = await Kardex.logMovement({
      product_id,
      id_user,
      nickname_user,
      movement_type,
      movement_reason,
      previous_stock,
      moved_quantity,
      new_stock,
      date: finalDate,
      time: finalTime,
      related_folio
    });

    res.status(201).json({
      id: kardexId,
      message: 'Movimiento de kardex registrado correctamente'
    });
  } catch (error) {
    console.error('Kardex create error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getByProduct = async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id es requerido' });
    }

    const movements = await Kardex.findByProductId(product_id);

    res.json(movements);
  } catch (error) {
    console.error('Kardex fetch error:', error);
    res.status(500).json({ error: error.message });
  }
};