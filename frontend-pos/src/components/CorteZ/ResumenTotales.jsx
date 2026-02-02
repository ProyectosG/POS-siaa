"use client";

export default function ResumenTotales({
  totalRecibido,
  totalContado,
  totalAnticipos,
  totalAbonos,
}) {
  return (
    <>
    

      <div className="flex flex-col justify-center items-center min-h-[150px] space-y-3 bg-slate-800/40 rounded-lg border border-slate-600 p-4">
        <Bloque label="Total de Contado" value={totalContado} />
        <Bloque label="Total Anticipos" value={totalAnticipos} />
        <Bloque label="Total Abonos" value={totalAbonos} />
      </div>
    </>
  );
}

function Bloque({ label, value }) {
  return (
    <div className="border-b border-slate-600 pb-2 w-full text-center">
      <p className="text-slate-300 text-sm">{label}</p>
      <p className="text-lg font-bold text-green-300">
        ${Number(value).toFixed(2)}
      </p>
    </div>
  );
}
