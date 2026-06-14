import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Table, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataPreviewProps {
  data: Record<string, any>[];
  columns: { name: string; type: string }[];
  fileName: string;
}

const DataPreview: React.FC<DataPreviewProps> = ({ data, columns, fileName }) => {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = data.slice(page * pageSize, (page + 1) * pageSize);

  const handleDownload = () => {
    // Convert to CSV
    const headers = columns.map(c => c.name).join(',');
    const rows = data.map(row => 
      columns.map(c => {
        const val = row[c.name];
        // Escape commas and quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    ).join('\n');
    
    const csv = headers + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.[^/.]+$/, '') + '_cleaned.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'numeric': return 'text-cyan-500 bg-cyan-500/10';
      case 'categorical': return 'text-purple-500 bg-purple-500/10';
      case 'date': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Table className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Data Preview</h3>
            <p className="text-xs text-muted-foreground">
              Showing {paginatedData.length} of {data.length} rows
            </p>
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
      </div>

      {/* Column Types */}
      <div className="px-4 py-2 border-b border-border/50 flex flex-wrap gap-2">
        {columns.map((col) => (
          <div
            key={col.name}
            className="flex items-center gap-1.5 text-xs"
          >
            <span className="font-medium truncate max-w-[100px]">{col.name}</span>
            <span className={`px-1.5 py-0.5 rounded ${getTypeColor(col.type)}`}>
              {col.type}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <UITable>
          <TableHeader>
            <TableRow className="bg-muted/20">
              {columns.map((col) => (
                <TableHead key={col.name} className="whitespace-nowrap">
                  {col.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-muted/30">
                {columns.map((col) => (
                  <TableCell key={col.name} className="whitespace-nowrap max-w-[200px] truncate">
                    {row[col.name]?.toString() ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </UITable>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DataPreview;