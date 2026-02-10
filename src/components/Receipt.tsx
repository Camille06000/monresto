import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import type { Sale, SaleItem } from '../lib/types';

interface ReceiptProps {
  sale: Sale;
  items: SaleItem[];
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ sale, items }, ref) => {
  const { t } = useTranslation();
  const { currentRestaurant } = useStore();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div
      ref={ref}
      className="receipt-print bg-white text-black p-4 font-mono text-sm"
      style={{
        width: '80mm',
        minHeight: '100mm',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold uppercase">
          {currentRestaurant?.name || 'Restaurant'}
        </h1>
        {currentRestaurant?.address && (
          <p className="text-xs mt-1">{currentRestaurant.address}</p>
        )}
        {currentRestaurant?.phone && (
          <p className="text-xs">{t('receipt.tel')}: {currentRestaurant.phone}</p>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Date & Receipt number */}
      <div className="flex justify-between text-xs mb-2">
        <span>{formatDate(sale.created_at || sale.sale_date)}</span>
        <span>{formatTime(sale.created_at || sale.sale_date)}</span>
      </div>
      <p className="text-xs mb-2">
        {t('receipt.number')}: #{sale.id.slice(-8).toUpperCase()}
      </p>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Items */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left py-1">{t('receipt.item')}</th>
            <th className="text-center py-1">{t('receipt.qty')}</th>
            <th className="text-right py-1">{t('receipt.price')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="py-1 pr-1">
                {item.dish?.name || `Plat #${index + 1}`}
              </td>
              <td className="text-center py-1">{item.quantity}</td>
              <td className="text-right py-1">
                {formatPrice(item.total_price)} ฿
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Total */}
      <div className="flex justify-between font-bold text-base mt-2">
        <span>{t('receipt.total')}</span>
        <span>{formatPrice(sale.total_amount)} ฿</span>
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-3" />

      {/* Footer */}
      <div className="text-center text-xs">
        <p className="font-bold">{t('receipt.thanks')}</p>
        <p className="mt-1">{t('receipt.seeYouSoon')}</p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .receipt-print, .receipt-print * {
            visibility: visible;
          }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 5mm;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
});

Receipt.displayName = 'Receipt';

// Fonction utilitaire pour imprimer un ticket
export function printReceipt(sale: Sale, items: SaleItem[], restaurant?: { name: string; address?: string; phone?: string }) {
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) {
    alert('Veuillez autoriser les popups pour imprimer');
    return;
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 4px 0; text-align: left;">${item.dish?.name || 'Plat'}</td>
      <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
      <td style="padding: 4px 0; text-align: right;">${formatPrice(item.total_price)} ฿</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket - ${restaurant?.name || 'Restaurant'}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          padding: 5mm;
          background: white;
          color: black;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .header h1 {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .header p {
          font-size: 10px;
          margin: 2px 0;
        }
        .separator {
          border-top: 1px dashed #666;
          margin: 8px 0;
        }
        .info {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin-bottom: 5px;
        }
        .receipt-num {
          font-size: 10px;
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th {
          text-align: left;
          padding: 4px 0;
          border-bottom: 1px solid #999;
          font-size: 10px;
        }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3) { text-align: right; }
        td {
          border-bottom: 1px solid #eee;
        }
        .total {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: bold;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          font-size: 11px;
          margin-top: 15px;
        }
        .footer p {
          margin: 3px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${restaurant?.name || 'Restaurant'}</h1>
        ${restaurant?.address ? `<p>${restaurant.address}</p>` : ''}
        ${restaurant?.phone ? `<p>Tél: ${restaurant.phone}</p>` : ''}
      </div>

      <div class="separator"></div>

      <div class="info">
        <span>${formatDate(sale.created_at || sale.sale_date)}</span>
        <span>${formatTime(sale.created_at || sale.sale_date)}</span>
      </div>
      <p class="receipt-num">N°: #${sale.id.slice(-8).toUpperCase()}</p>

      <div class="separator"></div>

      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th>Qté</th>
            <th>Prix</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="separator"></div>

      <div class="total">
        <span>TOTAL</span>
        <span>${formatPrice(sale.total_amount)} ฿</span>
      </div>

      <div class="separator"></div>

      <div class="footer">
        <p><strong>Merci de votre visite !</strong></p>
        <p>À bientôt</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
