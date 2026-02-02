"use client"

// src/components/ReporteEntradas/ReporteEntradas.jsx

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
import { ArrowUpDown, Eye, Printer, FileText, FileSpreadsheet, File, Calendar, Package, DollarSign } from 'lucide-react';

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

const ReporteEntradas = () => {
  const [entradas, setEntradas] = useState([]);
  const [entradasFiltradas, setEntradasFiltradas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({
    tipo: '',
    fechaDesde: null,
    fechaHasta: null,
  });

  const [modalVistaPreviaAbierto, setModalVistaPreviaAbierto] = useState(false);
  const [entradaSeleccionada, setEntradaSeleccionada] = useState(null);

  useEffect(() => {
    cargarEntradas();
  }, []);

  const cargarEntradas = async () => {
    try {
      setCargando(true);
      setError(null);

      const response = await fetch(`${API_BASE}/entries`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setEntradas(data);
      setEntradasFiltradas(data);
    } catch (err) {
      console.error('Error cargando entradas:', err);
      setError('No se pudieron cargar las entradas.');
    } finally {
      setCargando(false);
    }
  };

  const aplicarFiltros = useMemo(() => {
    let filtradas = [...entradas];

    if (filtros.tipo) {
      filtradas = filtradas.filter(e => e.entry_type === filtros.tipo);
    }

    if (filtros.fechaDesde) {
      const desde = new Date(filtros.fechaDesde).toISOString().split('T')[0];
      filtradas = filtradas.filter(e => e.date >= desde);
    }

    if (filtros.fechaHasta) {
      const hasta = new Date(filtros.fechaHasta).toISOString().split('T')[0];
      filtradas = filtradas.filter(e => e.date <= hasta);
    }

    return filtradas;
  }, [entradas, filtros]);

  useEffect(() => {
    setEntradasFiltradas(aplicarFiltros);
  }, [aplicarFiltros]);

  const columnas = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'entry_type', header: 'Tipo Entrada' },
      { accessorKey: 'date', header: 'Fecha' },
      { accessorKey: 'time', header: 'Hora' },
      { accessorKey: 'comments', header: 'Comentarios' },
      { accessorKey: 'related_folio', header: 'Folio Relacionado' },
      { accessorKey: 'nickname_user', header: 'Usuario' },
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
              onClick={() => handleReimprimirEntrada(row.original)}
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
    data: entradasFiltradas,
    columns: columnas,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const manejarVistaPrevia = async (entrada) => {
    try {
      const response = await fetch(`${API_BASE}/entries/${entrada.id}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error al cargar detalle');

      const detalle = await response.json();
      setEntradaSeleccionada(detalle);
      setModalVistaPreviaAbierto(true);
    } catch (err) {
      alert('Error al cargar vista previa: ' + err.message);
    }
  };

  const handleReimprimirEntrada = (entrada) => {
    alert(`Reimprimiendo entrada #${entrada.id} (${entrada.entry_type})`);
    // Aquí puedes agregar la lógica real de impresión cuando la tengas
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Entradas', 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [columnas.map(c => c.header)],
      body: entradasFiltradas.map(row => 
        columnas.map(col => 
          col.id === 'acciones' ? '' : row[col.accessorKey] ?? ''
        )
      ),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save('reporte-entradas.pdf');
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(entradasFiltradas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entradas');
    XLSX.writeFile(wb, 'reporte-entradas.xlsx');
  };

  const exportarTXT = () => {
    const contenido = entradasFiltradas.map(row => Object.values(row).join('\t')).join('\n');
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte-entradas.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cerrarModal = () => {
    setModalVistaPreviaAbierto(false);
    setEntradaSeleccionada(null);
  };

  return (
    <Card className="border-none shadow-xl rounded-xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-4">
        <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Reporte de Entradas
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
        {/* Filtros - con todos los tipos de entrada */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo de entrada
            </label>
            <Select
              value={filtros.tipo || 'todos'}
              onValueChange={(v) => setFiltros(p => ({ ...p, tipo: v === 'todos' ? '' : v }))}
            >
              <SelectTrigger className="bg-white shadow-sm border-gray-300 focus:ring-emerald-500">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="COMPRA A PROVEEDOR">Compra a proveedor</SelectItem>
                <SelectItem value="DEVOLUCIÓN DE CLIENTE">Devolución de cliente</SelectItem>
                <SelectItem value="ENTRADA POR TRASPASO">Entrada por traspaso</SelectItem>
                <SelectItem value="AJUSTE POSITIVO DE INVENTARIO">Ajuste positivo de inventario</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Desde
            </label>
            <DatePicker
              selected={filtros.fechaDesde}
              onChange={(d) => setFiltros(p => ({ ...p, fechaDesde: d }))}
              dateFormat="yyyy-MM-dd"
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500"
              placeholderText="Fecha inicial"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hasta
            </label>
            <DatePicker
              selected={filtros.fechaHasta}
              onChange={(d) => setFiltros(p => ({ ...p, fechaHasta: d }))}
              dateFormat="yyyy-MM-dd"
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500"
              placeholderText="Fecha final"
            />
          </div>
        </div>

        {/* Tabla principal */}
        {cargando ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg text-muted-foreground animate-pulse">Cargando entradas... 📦</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600 font-medium bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        ) : entradasFiltradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-slate-200">
            No se encontraron entradas con los filtros aplicados 😔
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
            </table>
          </div>
        )}

        {/* Modal Vista Previa - Tabla fila por fila para productos */}
        <Dialog open={modalVistaPreviaAbierto} onOpenChange={cerrarModal}>
          <DialogContent className="w-[95vw] max-w-[95vw] !max-w-none lg:!max-w-[1800px] xl:!max-w-[2000px] rounded-2xl bg-white shadow-2xl border-emerald-100 p-0 overflow-hidden">
            <DialogHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-3">
              <DialogTitle className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-600" />
                Vista Previa - Entrada #{entradaSeleccionada?.id}
              </DialogTitle>
            </DialogHeader>

            <div className="p-5 space-y-5 bg-gray-50/30 overflow-y-auto max-h-[85vh]">
              {/* Info general */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-emerald-100 rounded p-3 bg-white shadow-sm">
                  <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha y Detalles
                  </h3>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha:</span>
                      <span>{entradaSeleccionada?.date || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hora:</span>
                      <span>{entradaSeleccionada?.time || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Usuario:</span>
                      <span>{entradaSeleccionada?.nickname_user || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-emerald-100 rounded p-3 bg-white shadow-sm">
                  <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Información Adicional
                  </h3>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">{entradaSeleccionada?.entry_type || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Folio:</span>
                      <span>{entradaSeleccionada?.related_folio || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Comentarios:</span>
                      <span>{entradaSeleccionada?.comments || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de productos - fila por fila */}
              <div className="border border-emerald-100 rounded overflow-hidden shadow-sm">
                <div className="bg-emerald-50 px-4 py-2">
                  <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Productos Entrados
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Código</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Producto</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Presentación</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {entradaSeleccionada?.items?.length > 0 ? (
                        entradaSeleccionada.items.map((item, index) => (
                          <tr key={index} className="hover:bg-emerald-50/50 transition-colors">
                            <td className="px-4 py-2 text-sm text-gray-900">{item.codigo_barras || '—'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.articulo || `Producto #${item.product_id}`}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{item.presentacion || '—'}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-emerald-700">{item.quantity}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                            Sin productos en esta entrada
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-3 bg-gray-50 border-t">
              <Button variant="outline" onClick={cerrarModal} className="px-6 py-2 text-sm">
                Cerrar
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
          }
        `}</style>
      </CardContent>
    </Card>
  );
};

export default ReporteEntradas;