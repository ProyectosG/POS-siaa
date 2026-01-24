const Kardex = require('../models/Kardex');

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
       FECHA / HORA - Usamos las que llegan del frontend (ya correctas)
    ========================= */
    const now = new Date();

    // Priorizamos lo enviado desde frontend
    let finalDate = date;
    if (!finalDate || !finalDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      finalDate = now.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').reverse().join('-');
      console.log('[Kardex] Fecha fallback (no llegó válida):', finalDate);
    }

    let finalTime = time;
    if (!finalTime || !finalTime.match(/^\d{2}:\d{2}:\d{2}$/)) {
      finalTime = now.toLocaleTimeString('es-MX', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      console.log('[Kardex] Hora fallback (no llegó válida):', finalTime);
    }

    console.log('[Kardex] Fecha y hora FINALES para guardar:', { finalDate, finalTime });

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