"use client";

export default function ResumenTotales({
  totalRecibido,
  totalContado,
  totalAnticipos,
  totalAbonos,
}) {
  return (
    <>
    

      <div className="flex flex-col justify-center items-center min-h-[150px] space-y-3 bg-card rounded-lg border border-border p-4">
        <Bloque label="Total de Contado" value={totalContado} />
        <Bloque label="Total Anticipos" value={totalAnticipos} />
        <Bloque label="Total Abonos" value={totalAbonos} />
      </div>
    </>
  );
}

function Bloque({ label, value }) {
  return (
    <div className="border-b border-border pb-2 w-full text-center">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-lg font-bold text-exito">
        ${Number(value).toFixed(2)}
      </p>
    </div>
  );
}
