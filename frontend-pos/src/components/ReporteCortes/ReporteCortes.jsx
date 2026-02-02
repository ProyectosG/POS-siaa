"use client"

// src/components/ReporteCortes/ReporteCortes.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ArrowUpDown, Eye, Printer, FileText, FileSpreadsheet, File, Calendar, Ticket, DollarSign, CreditCard, Package, Wallet, Banknote } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const ReporteCortes = () => {
  const [cortes, setCortes] = useState([]);
  const [cortesFiltrados, setCortesFiltrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({
    tipo: '',
    fechaDesde: null,
    fechaHasta: null,
  });

  const [modalVistaPreviaAbierto, setModalVistaPreviaAbierto] = useState(false);
  const [corteSeleccionado, setCorteSeleccionado] = useState(null);

  // Estados para modal de reimpresión
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [cortePreviewText, setCortePreviewText] = useState('');
  const [selectedCorteId, setSelectedCorteId] = useState(null);

  useEffect(() => {
    cargarCortes();
  }, []);

  const cargarCortes = async () => {
    try {
      setCargando(true);
      setError(null);

      const response = await fetch(`${API_BASE}/cuts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setCortes(data);
      setCortesFiltrados(data);
    } catch (err) {
      console.error('Error cargando cortes:', err);
      setError('No se pudieron cargar los cortes. Verifica que el backend esté corriendo.');
    } finally {
      setCargando(false);
    }
  };

  const aplicarFiltros = useMemo(() => {
    let filtrados = [...cortes];

    if (filtros.tipo && filtros.tipo !== 'todos') {
      filtrados = filtrados.filter(c => c.type === filtros.tipo);
    }

    if (filtros.fechaDesde) {
      const desde = new Date(filtros.fechaDesde).toISOString().split('T')[0];
      filtrados = filtrados.filter(c => c.date >= desde);
    }

    if (filtros.fechaHasta) {
      const hasta = new Date(filtros.fechaHasta).toISOString().split('T')[0];
      filtrados = filtrados.filter(c => c.date <= hasta);
    }

    return filtrados;
  }, [cortes, filtros]);

  useEffect(() => {
    setCortesFiltrados(aplicarFiltros);
  }, [aplicarFiltros]);

  const totales = useMemo(() => {
    if (cortesFiltrados.length === 0) return { totalVentas: 0, efectivoEnCaja: 0, conteo: 0 };

    const totalVentas = cortesFiltrados.reduce((sum, c) => sum + (Number(c.total_sales) || 0), 0);
    const efectivoEnCaja = cortesFiltrados.reduce((sum, c) => sum + (Number(c.cash_in_box) || 0), 0);
    const conteo = cortesFiltrados.length;

    return { totalVentas, efectivoEnCaja, conteo };
  }, [cortesFiltrados]);

  const columnas = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'type', header: 'Tipo' },
      { accessorKey: 'date', header: 'Fecha' },
      { accessorKey: 'desde', header: 'Desde Ticket' },
      { accessorKey: 'hasta', header: 'Hasta Ticket' },
      { accessorKey: 'user_nickname', header: 'Usuario' },
      {
        accessorKey: 'total_sales',
        header: 'Total Ventas',
        cell: info => `$${Number(info.getValue() || 0).toFixed(2)}`,
      },
      {
        accessorKey: 'cash_in_box',
        header: 'Efectivo en Caja',
        cell: info => `$${Number(info.getValue() || 0).toFixed(2)}`,
      },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => manejarVistaPrevia(row.original)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReimprimirCorte(row.original)}
              className="h-8 w-8 p-0"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const tabla = useReactTable({
    data: cortesFiltrados,
    columns: columnas,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const manejarVistaPrevia = async (corte) => {
    try {
      const response = await fetch(`${API_BASE}/cuts/${corte.id}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error al cargar detalle');

      const detalle = await response.json();
      setCorteSeleccionado(detalle);
      setModalVistaPreviaAbierto(true);
    } catch (err) {
      alert('Error al cargar vista previa: ' + err.message);
    }
  };

  const handleReimprimirCorte = async (corte) => {
    try {
      const response = await fetch(`${API_BASE}/cuts/${corte.id}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error al cargar datos del corte');

      const detalle = await response.json();

      const ticketFormateado = `
╔════════════════════════════════════════════╗
║           CORTE ${detalle.type.toUpperCase()}               ║
╚════════════════════════════════════════════╝
Fecha: ${detalle.date} 
Usuario: ${detalle.user_nickname || '—'} 
Caja: ${detalle.cash_register || '—'}

Rango de Tickets:
Desde: ${detalle.desde || '—'} 
Hasta: ${detalle.hasta || '—'}

📊 RESUMEN DE VENTAS
Total Ventas:     $${Number(detalle.total_sales || 0).toFixed(2)}
Contado:          $${Number(detalle.ventas_contado || 0).toFixed(2)}
Crédito:          $${Number(detalle.ventas_credito || 0).toFixed(2)}
Apartado:         $${Number(detalle.ventas_apartado || 0).toFixed(2)}
IVA Gravado:      $${Number(detalle.total_iva_gravado || 0).toFixed(2)}

💰 DINERO RECIBIDO
Total Recibido:   $${Number(detalle.total_recibido || 0).toFixed(2)}
Anticipos:        $${Number(detalle.total_anticipos || 0).toFixed(2)}
Abonos:           $${Number(detalle.total_abonos || 0).toFixed(2)}

Formas de Pago:
• Efectivo:       $${Number(detalle.pago_efectivo || 0).toFixed(2)}
• Tarjeta:        $${Number(detalle.pago_tarjeta || 0).toFixed(2)}
• Transferencia:  $${Number(detalle.pago_transferencia || 0).toFixed(2)}
• Otros:          $${Number(detalle.pago_otros || 0).toFixed(2)}

Efectivo en Caja: $${Number(detalle.cash_in_box || 0).toFixed(2)}

╭────────────────────────────────────────────╮
│ ¡Gran trabajo hoy! Sigue así 🚀            │
╰────────────────────────────────────────────╯
      `.trim();

      setCortePreviewText(ticketFormateado);
      setSelectedCorteId(corte.id);
      setShowPrintModal(true);
    } catch (err) {
      console.error('Error en previsualización de corte:', err);
      alert('No se pudo cargar la previsualización del corte.');
    }
  };

  const handleConfirmPrintCorte = async () => {
    try {
      // Ruta real cuando la tengas
      // await fetch(`${API_BASE}/cuts/${selectedCorteId}/print`, { method: 'POST' });
      console.log(`Imprimiendo corte #${selectedCorteId}`);
      alert(`Corte #${selectedCorteId} enviado a impresión! 🖨️`);
      setShowPrintModal(false);
    } catch (err) {
      console.error('Error imprimiendo corte:', err);
      alert('No se pudo imprimir. Verifica impresora o ruta del backend.');
    }
  };

  const imprimirReporte = () => window.print();

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Cortes de Caja', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString('es-MX')}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [columnas.map(c => c.header || 'Acciones')],
      body: cortesFiltrados.map(row =>
        columnas.map(col => {
          if (col.id === 'acciones') return '';
          const val = row[col.accessorKey];
          return col.cell ? col.cell({ getValue: () => val }) : val ?? '';
        })
      ),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      foot: [[
        'Totales', '', '', '', '', '', 
        `$${totales.totalVentas.toFixed(2)}`, 
        `$${totales.efectivoEnCaja.toFixed(2)}`, 
        ''
      ]],
    });

    doc.save('reporte-cortes.pdf');
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(cortesFiltrados);
    XLSX.utils.sheet_add_aoa(ws, [[
      'Totales', '', '', '', '', '', 
      totales.totalVentas, 
      totales.efectivoEnCaja, 
      ''
    ]], { origin: -1 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cortes');
    XLSX.writeFile(wb, 'reporte-cortes.xlsx');
  };

  const exportarTXT = () => {
    const contenido = cortesFiltrados.map(row => Object.values(row).join('\t')).join('\n');
    const totalLine = `\nTotales:\t\t\t\t\t\t$${totales.totalVentas.toFixed(2)}\t$${totales.efectivoEnCaja.toFixed(2)}`;
    const blob = new Blob([contenido + totalLine], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte-cortes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cerrarModal = () => {
    setModalVistaPreviaAbierto(false);
    setCorteSeleccionado(null);
  };

  const cerrarPrintModal = () => {
    setShowPrintModal(false);
    setCortePreviewText('');
    setSelectedCorteId(null);
  };

  return (
    <Card className="border-none shadow-xl rounded-xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-4">
        <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-6 w-6 text-emerald-600" />
            Reporte de Cortes
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportarExcel} className="gap-1">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportarPDF} className="gap-1">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportarTXT} className="gap-1">
              <File className="h-4 w-4" />
              TXT
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo de corte
            </label>
            <Select
              value={filtros.tipo || 'todos'}
              onValueChange={(v) => setFiltros((p) => ({ ...p, tipo: v === 'todos' ? '' : v }))}
            >
              <SelectTrigger className="bg-white shadow-sm border-gray-300 focus:ring-emerald-500">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los cortes</SelectItem>
                <SelectItem value="X">Corte X</SelectItem>
                <SelectItem value="Z">Corte Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Desde
            </label>
            <DatePicker
              selected={filtros.fechaDesde}
              onChange={(d) => setFiltros((p) => ({ ...p, fechaDesde: d }))}
              dateFormat="yyyy-MM-dd"
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholderText="Fecha inicial"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hasta
            </label>
            <DatePicker
              selected={filtros.fechaHasta}
              onChange={(d) => setFiltros((p) => ({ ...p, fechaHasta: d }))}
              dateFormat="yyyy-MM-dd"
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholderText="Fecha final"
            />
          </div>
        </div>

        {/* Tabla */}
        {cargando ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg text-muted-foreground animate-pulse">Cargando cortes... 📊</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600 font-medium bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        ) : cortesFiltrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-slate-200">
            No se encontraron cortes con los filtros aplicados 😔
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50">
                {tabla.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-emerald-800 cursor-pointer hover:bg-emerald-100 transition"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="ml-2">
                          {header.column.getIsSorted() === 'asc' ? '↑' :
                           header.column.getIsSorted() === 'desc' ? '↓' : 
                           <ArrowUpDown className="inline h-3 w-3 opacity-50" />}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tabla.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-emerald-100 transition-colors duration-150 even:bg-slate-50/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white font-semibold border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-right text-gray-900">
                    Totales ({totales.conteo} cortes):
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    ${totales.totalVentas.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    ${totales.efectivoEnCaja.toFixed(2)}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Botón Imprimir Reporte */}
        <div className="flex justify-center mt-10">
          <Button
            onClick={imprimirReporte}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl shadow-lg transition"
          >
            Imprimir Reporte Completo
          </Button>
        </div>

{/* Modal Vista Previa - FORZANDO PADDINGS ABSOLUTOS + CARDS CHICAS */}
<Dialog open={modalVistaPreviaAbierto} onOpenChange={cerrarModal}>
  <DialogContent 
    className="w-[95vw] max-w-[95vw] !max-w-none lg:!max-w-[1800px] xl:!max-w-[2000px] rounded-2xl bg-white shadow-2xl border-emerald-100 p-0 overflow-hidden"
  >
    <DialogHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-2">
      <DialogTitle className="text-base font-bold text-emerald-800 flex items-center gap-2">
        <Eye className="h-5 w-5 text-emerald-600" />
        Vista Previa - Corte #{corteSeleccionado?.id} ({corteSeleccionado?.type})
      </DialogTitle>
    </DialogHeader>

    <div className="p-4 space-y-4 bg-gray-50/30 overflow-y-auto max-h-[85vh]">
      {/* Fecha y Rango - muy compacto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-emerald-100 shadow-sm !p-0">
          <CardHeader className="bg-emerald-50 !py-1.5 !px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              Fecha y Detalles
            </CardTitle>
          </CardHeader>
          <CardContent className="!py-1.5 !px-3 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fecha:</span>
              <span className="font-medium">{corteSeleccionado?.date || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Usuario:</span>
              <span className="font-medium">{corteSeleccionado?.user_nickname || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Caja:</span>
              <span className="font-medium">{corteSeleccionado?.cash_register || '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm !p-0">
          <CardHeader className="bg-emerald-50 !py-1.5 !px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-emerald-600" />
              Rango de Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="!py-1.5 !px-3 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Inicial:</span>
              <span className="font-bold text-emerald-700 text-sm">{corteSeleccionado?.desde || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Final:</span>
              <span className="font-bold text-emerald-700 text-sm">{corteSeleccionado?.hasta || '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ventas */}
<Card className="border-emerald-100 shadow-sm !p-0 !m-0">
  <CardHeader className="bg-emerald-50 !py-1.5 !px-3 !mb-0">
    <CardTitle className="text-xs flex items-center gap-1.5 !m-0">
      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
      Resumen de Ventas
    </CardTitle>
  </CardHeader>
  <CardContent className="!py-1.5 !px-3 !pt-1.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs !mt-0">
    <div className="text-center p-2 bg-emerald-50/50 rounded">
      <p className="text-gray-600 mb-0.5 text-xs">Total Ventas</p>
      <p className="text-sm font-bold text-emerald-700">${Number(corteSeleccionado?.total_sales || 0).toFixed(2)}</p>
    </div>
    <div className="text-center p-2 bg-green-50/50 rounded">
      <p className="text-gray-600 mb-0.5 text-xs">Contado</p>
      <p className="text-xs font-semibold text-green-600">${Number(corteSeleccionado?.ventas_contado || 0).toFixed(2)}</p>
    </div>
    <div className="text-center p-2 bg-yellow-50/50 rounded">
      <p className="text-gray-600 mb-0.5 text-xs">Crédito</p>
      <p className="text-xs font-semibold text-yellow-600">${Number(corteSeleccionado?.ventas_credito || 0).toFixed(2)}</p>
    </div>
    <div className="text-center p-2 bg-blue-50/50 rounded">
      <p className="text-gray-600 mb-0.5 text-xs">Apartado</p>
      <p className="text-xs font-semibold text-blue-600">${Number(corteSeleccionado?.ventas_apartado || 0).toFixed(2)}</p>
    </div>
    <div className="text-center p-2 bg-purple-50/50 rounded">
      <p className="text-gray-600 mb-0.5 text-xs">IVA Gravado</p>
      <p className="text-xs font-semibold text-purple-600">${Number(corteSeleccionado?.total_iva_gravado || 0).toFixed(2)}</p>
    </div>
  </CardContent>
</Card>

      {/* Cash Recibido */}
      <Card className="border-emerald-100 shadow-sm !p-0">
        <CardHeader className="bg-emerald-50 !py-1.5 !px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            Cash Recibido
          </CardTitle>
        </CardHeader>
        <CardContent className="!py-1 !px-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-emerald-50/50 rounded">
            <p className="text-gray-600 mb-0.5 text-xs">Total Recibido</p>
            <p className="text-sm font-bold text-emerald-700">${Number(corteSeleccionado?.total_recibido || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-blue-50/50 rounded">
            <p className="text-gray-600 mb-0.5 text-xs">Anticipos</p>
            <p className="text-xs font-bold text-blue-600">${Number(corteSeleccionado?.total_anticipos || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-purple-50/50 rounded">
            <p className="text-gray-600 mb-0.5 text-xs">Abonos</p>
            <p className="text-xs font-bold text-purple-600">${Number(corteSeleccionado?.total_abonos || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-green-50/50 rounded">
            <p className="text-gray-600 mb-0.5 text-xs">Efectivo en Caja</p>
            <p className="text-sm font-bold text-green-700">${Number(corteSeleccionado?.cash_in_box || 0).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Formas de Pago */}
      <Card className="border-emerald-100 shadow-sm !p-0">
        <CardHeader className="bg-emerald-50 !py-1.5 !px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-emerald-600" />
            Formas de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="!py-1 !px-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-green-50/50 rounded border border-green-100">
            <p className="text-gray-600 mb-0.5 text-xs">Efectivo</p>
            <p className="text-xs font-bold text-green-700">${Number(corteSeleccionado?.pago_efectivo || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-blue-50/50 rounded border border-blue-100">
            <p className="text-gray-600 mb-0.5 text-xs">Tarjeta</p>
            <p className="text-xs font-bold text-blue-600">${Number(corteSeleccionado?.pago_tarjeta || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-indigo-50/50 rounded border border-indigo-100">
            <p className="text-gray-600 mb-0.5 text-xs">Transferencia</p>
            <p className="text-xs font-bold text-indigo-600">${Number(corteSeleccionado?.pago_transferencia || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-purple-50/50 rounded border border-purple-100">
            <p className="text-gray-600 mb-0.5 text-xs">Otros</p>
            <p className="text-xs font-bold text-purple-600">${Number(corteSeleccionado?.pago_otros || 0).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="flex justify-end gap-3 px-6 py-2 bg-gray-50 border-t">
      <Button variant="outline" onClick={cerrarModal} className="px-5 py-1.5 text-xs">
        Cerrar
      </Button>
    </div>
  </DialogContent>
</Dialog>

        {/* Modal Reimpresión */}
        <Dialog open={showPrintModal} onOpenChange={cerrarPrintModal}>
          <DialogContent className="max-w-4xl rounded-2xl bg-white shadow-2xl border-emerald-100">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Printer className="h-6 w-6 text-emerald-600" />
                Previsualización Corte #{selectedCorteId}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 bg-white border rounded-lg font-mono text-sm max-h-[60vh] overflow-auto leading-relaxed">
              <div className="text-center mb-4 border-b pb-3">
                <h3 className="text-xl font-bold text-emerald-700">CORTE DE CAJA</h3>
                <p className="text-gray-600 text-sm">Sistema POS - ¡Todo bajo control! 🚀</p>
              </div>
              <div className="whitespace-pre-wrap">
                {cortePreviewText || 'Cargando contenido del corte...'}
              </div>
              <div className="text-center mt-6 pt-4 border-t text-gray-500 text-xs">
                Gracias por tu esfuerzo hoy 💪 • {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button variant="outline" onClick={cerrarPrintModal}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmPrintCorte}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Imprimir Corte
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Estilos impresión */}
        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .overflow-x-auto, .overflow-x-auto * { visibility: visible; }
            .overflow-x-auto { position: absolute; left: 0; top: 0; width: 100%; }
            button, .no-print { display: none !important; }
            tfoot { font-weight: bold; background: white !important; color: black !important; }
          }
        `}</style>
      </CardContent>
    </Card>
  );
};

export default ReporteCortes;