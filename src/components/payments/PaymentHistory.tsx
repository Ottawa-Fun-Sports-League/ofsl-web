import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { History, Save, X, Edit2, Trash2 } from 'lucide-react';
import { PaymentHistoryEntry, EditPaymentForm } from './types';
import { formatPaymentMethod } from './utils';

interface PaymentHistoryProps {
  paymentHistory: PaymentHistoryEntry[];
  editingNoteId: number | null;
  editingPayment: EditPaymentForm;
  onEditPayment: (entry: PaymentHistoryEntry) => void;
  onUpdateEditingPayment: (payment: EditPaymentForm) => void;
  onSavePaymentEdit: () => void;
  onCancelEdit: () => void;
  onDeletePayment: (entry: PaymentHistoryEntry) => void;
}

export function PaymentHistory({
  paymentHistory,
  editingNoteId,
  editingPayment,
  onEditPayment,
  onUpdateEditingPayment,
  onSavePaymentEdit,
  onCancelEdit,
  onDeletePayment
}: PaymentHistoryProps) {
  if (paymentHistory.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium text-[#6F6F6F] flex items-center gap-2">
          <History className="h-4 w-4" />
          Payment History
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">Date</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paymentHistory.map((entry) => (
              <tr key={entry.id}>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {editingNoteId === entry.id ? (
                    <Input
                      type="date"
                      value={editingPayment.date}
                      onChange={(e) => onUpdateEditingPayment({...editingPayment, date: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    new Date(entry.date).toLocaleDateString()
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {editingNoteId === entry.id ? (
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      value={editingPayment.amount}
                      onChange={(e) => onUpdateEditingPayment({...editingPayment, amount: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    entry.amount > 0 ? `$${entry.amount.toFixed(2)}` : '-'
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {editingNoteId === entry.id ? (
                    <select
                      value={editingPayment.payment_method || 'e_transfer'}
                      onChange={(e) => onUpdateEditingPayment({...editingPayment, payment_method: e.target.value || null})}
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                    >
                      <option value="e_transfer">E-Transfer</option>
                      <option value="stripe">Online</option>
                      <option value="cash">Cash</option>
                    </select>
                  ) : (
                    formatPaymentMethod(entry.payment_method)
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500 max-w-xs">
                  {editingNoteId === entry.id ? (
                    <textarea
                      value={editingPayment.notes}
                      onChange={(e) => onUpdateEditingPayment({...editingPayment, notes: e.target.value || ''})}
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                      rows={2}
                    />
                  ) : (
                    <span className="truncate block">{entry.notes}</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  {editingNoteId === entry.id ? (
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={onSavePaymentEdit}
                        className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-3 py-1 text-xs flex items-center gap-1"
                      >
                        <Save className="h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        onClick={onCancelEdit}
                        className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg px-3 py-1 text-xs flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onEditPayment(entry)}
                        className="bg-transparent hover:bg-blue-50 text-blue-500 hover:text-blue-600 rounded-lg p-1 h-7 w-7 flex items-center justify-center transition-colors"
                        title="Edit Payment"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => onDeletePayment(entry)}
                        className="bg-transparent hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg p-1 h-7 w-7 flex items-center justify-center transition-colors"
                        title="Delete Payment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}