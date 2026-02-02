"use client";

export default function TablaPagos({ pagos }) {
  const pagosNormalizados = {
    ...pagos,
    tarjeta: pagos?.tarjeta || 0,
  };

  return (
    <div className="bg-slate-800/40 rounded-lg border border-slate-600 p-4 mt-4">
      <table className="w-full text-left text-slate-300">
        <tbody>
          {Object.entries(pagosNormalizados).map(([method, amount]) => (
            <tr key={method} className="border-b border-slate-600">
              <td className="py-2 px-3 capitalize">{method}</td>
              <td className="py-2 px-3 text-right font-bold text-green-300">
                ${Number(amount || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
