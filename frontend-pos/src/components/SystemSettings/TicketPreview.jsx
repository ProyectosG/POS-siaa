"use client"

export default function TicketPreview({ settings }) {
  if (!settings) return null;

  // Calculamos el ancho visual relativo
  const containerWidth = settings.ticket_width === 80 ? "w-full" : settings.ticket_width === 58 ? "w-[85%]" : "w-[75%]";

  return (
    <div className="flex justify-center bg-black/40 py-6 rounded-xl border border-slate-800 min-h-[450px] items-start">
      <div 
        className={`${containerWidth} transition-all duration-300 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative flex flex-col text-black font-mono select-none`}
        style={{ fontSize: '11px', lineHeight: '1.2' }}
      >
        {/* Notch de papel superior */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[radial-gradient(circle,transparent_40%,#0f172a_45%)] bg-[length:8px_8px] bg-repeat-x"></div>

        {/* HEADER SECTION */}
        <div className="flex flex-col text-center mb-3">
          {[1, 2, 3, 4].map(n => (
            <div key={`hp-${n}`} className="break-words min-h-[1em] font-bold uppercase text-[12px]">
              {settings[`ticket_header_line${n}`] || ""}
            </div>
          ))}
        </div>

        {/* SUBHEADER SECTION */}
        <div className="flex flex-col text-center mb-4 border-b border-black border-dashed pb-2">
          {[1, 2, 3, 4].map(n => (
            <div key={`shp-${n}`} className="break-words min-h-[1em]">
              {settings[`ticket_subheader_line${n}`] || ""}
            </div>
          ))}
        </div>

        {/* MOCK ITEMS (Visual Only) */}
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex justify-between font-bold border-b border-black mb-1">
            <span>DESC.</span>
            <span>TOTAL</span>
          </div>
          <div className="flex justify-between">
            <span>PRODUCTO GENERICO X1</span>
            <span>$100.00</span>
          </div>
          <div className="flex justify-between">
            <span>SERVICIO DE POS X1</span>
            <span>$50.00</span>
          </div>
        </div>

        {/* TOTALS */}
        <div className="flex flex-col items-end gap-1 mb-6 border-t border-black pt-2 font-bold">
          <div className="flex justify-between w-full text-[13px]">
            <span>TOTAL:</span>
            <span>$150.00</span>
          </div>
        </div>

        {/* FOOTER SECTION */}
        <div className="flex flex-col text-center mt-auto pt-4 border-t border-black border-dotted">
          {[1, 2].map(n => (
            <div key={`fp-${n}`} className="break-words italic">
              {settings[`ticket_footer_line${n}`] || ""}
            </div>
          ))}
          <div className="text-[9px] mt-4 opacity-70">
            *** {new Date().toLocaleDateString()} ***
          </div>
        </div>

        {/* Notch de papel inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[radial-gradient(circle,transparent_40%,#0f172a_45%)] bg-[length:8px_8px] bg-repeat-x rotate-180"></div>
      </div>
    </div>
  );
}