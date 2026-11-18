import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Loader2,
  Copy,
  Check,
  Download,
  Printer,
  ExternalLink,
  Search,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { tableApi } from '@/api/table.api';
import { StoreTable, StoreTableRequest } from '@/types/table';
import { Card, CardContent, Button, Input, Dialog, Badge } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';

export const AdminTablesPage: React.FC = () => {
  const { showSuccess, showError, showWarning, showConfirmModal } = useToast();
  const [tables, setTables] = useState<StoreTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal create/edit table
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<StoreTable | null>(null);
  const [form, setForm] = useState<StoreTableRequest>({
    zone: 'Tầng 1 (CAFE)',
    location_name: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Preview QR Modal
  const [viewingTable, setViewingTable] = useState<StoreTable | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const fetchTables = () => {
    setLoading(true);
    tableApi
      .getAllTablesAdmin()
      .then((res) => setTables(res.data || []))
      .catch((err) => console.error('Lỗi tải danh sách bàn:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Danh sách các khu vực / tầng được sắp xếp
  const zones = useMemo(() => {
    const list = Array.from(new Set(tables.map((t) => t.zone?.trim()).filter(Boolean) as string[]));
    list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return ['ALL', ...list];
  }, [tables]);

  const getZoneCount = (zone: string) => {
    if (zone === 'ALL') return tables.length;
    return tables.filter((t) => t.zone?.trim() === zone).length;
  };

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchZone = selectedZone === 'ALL' || t.zone?.trim() === selectedZone;
      const matchKeyword =
        !searchKeyword.trim() ||
        t.location_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (t.zone && t.zone.toLowerCase().includes(searchKeyword.toLowerCase()));
      return matchZone && matchKeyword;
    });
  }, [tables, selectedZone, searchKeyword]);

  const getFullMenuUrl = (token: string) => {
    const customerBaseUrl = import.meta.env.VITE_CUSTOMER_APP_URL || 'http://localhost:3001';
    return `${customerBaseUrl}/menu/${token}`;
  };

  // Format chuẩn: "Bàn 1 - Tầng 1 (Coffee)"
  const getTableDisplayName = (table: { location_name: string; zone?: string }) => {
    if (table.zone && table.zone.trim()) {
      return `${table.location_name} - ${table.zone.trim()}`;
    }
    return table.location_name;
  };

  const handleCopyLink = async (token: string) => {
    try {
      const url = getFullMenuUrl(token);
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      showToast('Đã copy link vào clipboard!');
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      showToast('Không thể copy link tự động!');
    }
  };

  const handleOpenCreate = () => {
    setEditingTable(null);
    setForm({ zone: 'Tầng 1 (CAFE)', location_name: '', is_active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (table: StoreTable) => {
    setEditingTable(table);
    setForm({
      zone: table.zone || 'Tầng 1 (CAFE)',
      location_name: table.location_name,
      is_active: table.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location_name.trim()) {
      showWarning('Vui lòng nhập tên bàn!');
      return;
    }

    try {
      setSaving(true);
      const payload: StoreTableRequest = {
        location_name: form.location_name.trim(),
        zone: form.zone?.trim() || 'Tầng 1 (CAFE)',
        is_active: form.is_active,
      };

      if (editingTable) {
        const res = await tableApi.updateTable(editingTable.id, payload);
        setTables((prev) => prev.map((t) => (t.id === editingTable.id ? res.data : t)));
        showSuccess('Cập nhật thông tin bàn thành công!');
      } else {
        const res = await tableApi.createTable(payload);
        setTables((prev) => [...prev, res.data]);
        showSuccess('Tạo bàn mới thành công!');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Lưu thông tin bàn thất bại!'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (table: StoreTable) => {
    const displayName = getTableDisplayName(table);
    showConfirmModal({
      title: 'Xác nhận xóa bàn',
      message: `Bạn có chắc chắn muốn xóa "${displayName}"?`,
      description: 'Mã QR và thông tin bàn này sẽ bị gỡ bỏ khỏi hệ thống.',
      type: 'danger',
      confirmText: 'Xóa bàn',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await tableApi.deleteTable(table.id);
          setTables((prev) => prev.filter((t) => t.id !== table.id));
          showSuccess(`Đã xóa "${displayName}" thành công!`);
        } catch (err: unknown) {
          showError(getErrorMessage(err, 'Không thể xóa bàn!'));
        }
      },
    });
  };

  // Tải ảnh QR có in sẵn TÊN BÀN & THÔNG TIN QUÁN ở dưới
  const handleDownloadQrPng = (table: StoreTable) => {
    const svg = document.getElementById('modal-qr-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 900;
    canvas.height = 1200;

    img.onload = () => {
      if (ctx) {
        // Nền trắng
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Viền thẻ
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 14;
        ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

        // Header: Tên quán
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('HOÀNG AN COFFEE & BILLIARD', canvas.width / 2, 135);

        // Subtitle
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('QUÉT MÃ ĐỂ XEM MENU & GỌI MÓN', canvas.width / 2, 185);

        // QR Code ở giữa
        const qrSize = 560;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 225;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // TÊN BÀN HIỆN RÕ Ở DƯỚI QR (TO & NỔI BẬT)
        const displayName = getTableDisplayName(table);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(displayName, canvas.width / 2, 880);

        // Hướng dẫn
        ctx.fillStyle = '#64748b';
        ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Không cần đợi nhân viên • Gọi món tức thì tại bàn', canvas.width / 2, 940);

        // Footer: Địa chỉ
        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('KĐT Mới Thành Công - KM - HP', canvas.width / 2, 1040);

        // Tải xuống file PNG
        const a = document.createElement('a');
        a.download = `QR_${displayName.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  // Xuất in hàng loạt trên trang A4
  const handlePrintA4 = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = filteredTables
      .filter((t) => t.is_active)
      .map((t) => {
        const svgElement = document.getElementById(`table-qr-svg-${t.id}`);
        const svgHtml = svgElement ? svgElement.outerHTML : '';
        const displayName = getTableDisplayName(t);

        return `
          <div class="qr-card">
            <div class="shop-name">HOÀNG AN COFFEE & BILLIARD</div>
            <div class="qr-box">${svgHtml}</div>
            <div class="table-name">${displayName}</div>
            <div class="instruction">Quét mã QR để xem Menu & Gọi món</div>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Thẻ QR Bàn - Hoàng An Coffee & Billiard</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; }
            .grid-a4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15mm; }
            .qr-card {
              border: 2px dashed #2563eb;
              border-radius: 16px;
              padding: 20px;
              text-align: center;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .shop-name { font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 12px; }
            .qr-box { display: flex; justify-content: center; margin: 10px 0; }
            .qr-box svg { width: 140px; height: 140px; }
            .table-name { font-size: 18px; font-weight: 900; color: #2563eb; margin: 12px 0 4px 0; }
            .instruction { font-size: 11px; color: #64748b; font-weight: 600; }
            .hotline { font-size: 11px; color: #059669; font-weight: bold; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="grid-a4">
            ${cardsHtml}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 text-slate-800 px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2 text-xs font-bold animate-in fade-in duration-150">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Bàn & Mã QR
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý danh sách bàn và mã QR gọi món tại bàn theo từng khu vực
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrintA4}>
              <Printer className="w-4 h-4 text-slate-600" />
              <span>
                {selectedZone === 'ALL'
                  ? 'In hàng loạt khổ A4'
                  : `In QR ${selectedZone} (${filteredTables.filter((t) => t.is_active).length} bàn)`}
              </span>
            </Button>

            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="w-4 h-4" />
              <span>Thêm bàn</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Zone Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Zone Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {zones.map((zone) => {
            const isSelected = selectedZone === zone;
            const count = getZoneCount(zone);
            return (
              <button
                key={zone}
                type="button"
                onClick={() => setSelectedZone(zone)}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{zone === 'ALL' ? 'Tất cả khu vực' : zone}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Tìm tên bàn (VD: Bàn 01)..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9 text-xs h-9 rounded-xl"
          />
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <p className="text-slate-500 text-xs font-medium">Đang tải danh sách bàn & QR...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-xs">
          <p className="text-xs font-semibold">Chưa có bàn nào trong hệ thống.</p>
          <Button onClick={handleOpenCreate} className="mt-3" size="sm">
            Tạo bàn đầu tiên
          </Button>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-xs">
          <p className="text-xs font-semibold">
            Không tìm thấy bàn nào thuộc khu vực "{selectedZone === 'ALL' ? 'Tất cả' : selectedZone}"
            {searchKeyword ? ` với từ khóa "${searchKeyword}"` : ''}.
          </p>
          <Button
            onClick={() => {
              setSelectedZone('ALL');
              setSearchKeyword('');
            }}
            variant="outline"
            className="mt-3"
            size="sm"
          >
            Xem tất cả bàn
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
          {filteredTables.map((table) => {
            const menuUrl = getFullMenuUrl(table.qr_token);
            const displayName = getTableDisplayName(table);

            return (
              <div
                key={table.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Top Section */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Tên hiển thị chuẩn: "Bàn 1 - Tầng 1 (Coffee)" */}
                    <div className="text-base font-bold text-slate-900 truncate flex items-center gap-2">
                      <span>{displayName}</span>
                    </div>

                    <div className="mt-1 break-all text-xs text-slate-400 font-mono">
                      {menuUrl}
                    </div>

                    <div className="mt-2 text-xs font-medium">
                      <Badge variant={table.is_active ? 'success' : 'secondary'}>
                        {table.is_active ? 'Đang mở QR' : 'Đã khóa QR'}
                      </Badge>
                    </div>
                  </div>

                  {/* QR code thumbnail + Table label underneath */}
                  <div className="w-24 shrink-0 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center">
                      <QRCodeSVG
                        id={`table-qr-svg-${table.id}`}
                        value={menuUrl}
                        size={68}
                        level="M"
                        className="w-full h-full"
                      />
                    </div>
                    <span
                      className="text-[11px] font-bold text-slate-700 mt-1 truncate max-w-full text-center"
                      title={displayName}
                    >
                      {table.location_name}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingTable(table)}
                  >
                    Xem QR
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(table.qr_token)}
                  >
                    {copiedToken === table.qr_token ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-blue-600">Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy link</span>
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(table)}
                  >
                    Sửa
                  </Button>

                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <span>Mở Menu</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(table)}
                    className="ml-auto text-rose-600 hover:bg-rose-50"
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Thêm / Sửa Bàn */}
      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingTable ? 'Sửa thông tin bàn' : 'Thêm bàn mới'}
        description="Đặt tên số bàn và khu vực tương ứng (VD: Bàn 1 - Tầng 1 (Coffee))"
        maxWidth="sm"
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tên bàn <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
              placeholder="VD: Bàn 1, Bàn 01..."
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Khu vực / Tầng
            </label>
            <Input
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              placeholder="VD: Tầng 1 (CAFE), Sân vườn..."
            />
          </div>

          {/* Dòng xem trước tên hiển thị trực tiếp */}
          <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs">
            <span className="text-slate-500 font-medium">Tên hiển thị mã QR: </span>
            <span className="font-bold text-blue-700">
              {getTableDisplayName(form) || 'Bàn 1 - Tầng 1 (CAFE)'}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="table_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="table_active" className="text-xs font-medium text-slate-700 select-none">
              Cho phép khách mở QR bàn này
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingTable ? 'Cập nhật' : 'Lưu bàn'}</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Xem QR Lớn & Thao tác (CÓ HIỆN RÕ TÊN BÀN Ở DƯỚI QR) */}
      <Dialog
        open={!!viewingTable}
        onOpenChange={(open) => !open && setViewingTable(null)}
        title={viewingTable ? `Mã QR - ${getTableDisplayName(viewingTable)}` : ''}
        maxWidth="sm"
      >
        {viewingTable && (
          <div className="space-y-4 text-center">
            {/* Khung thẻ QR để bàn */}
            <div className="p-5 bg-gradient-to-b from-blue-50/60 to-white border-2 border-blue-500/20 rounded-3xl shadow-xs flex flex-col items-center">
              <span className="text-xs font-black text-blue-600 tracking-wider uppercase mb-0.5">
                HOÀNG AN COFFEE & BILLIARD
              </span>
              <p className="text-[11px] text-slate-500 font-medium mb-3">
                Quét mã để xem menu & gọi món
              </p>

              {/* QR Code SVG */}
              <div className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <QRCodeSVG
                  id="modal-qr-svg"
                  value={getFullMenuUrl(viewingTable.qr_token)}
                  size={200}
                  level="H"
                />
              </div>

              {/* TÊN BÀN HIỆN RÕ Ở DƯỚI QR ĐÚNG YÊU CẦU */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 w-full text-center">
                <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {getTableDisplayName(viewingTable)}
                </div>
              </div>
            </div>

            <p className="text-xs font-mono text-slate-500 break-all px-3 bg-slate-50 py-1.5 rounded-xl border border-slate-200/80">
              {getFullMenuUrl(viewingTable.qr_token)}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => handleCopyLink(viewingTable.qr_token)}
                className="w-full"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy link</span>
              </Button>

              <Button
                variant="default"
                onClick={() => handleDownloadQrPng(viewingTable)}
                className="w-full"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải ảnh QR (In)</span>
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
