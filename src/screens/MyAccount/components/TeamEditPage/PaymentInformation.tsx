import { Card, CardContent } from '../../../../components/ui/card';
import { CreditCard } from 'lucide-react';
import { PaymentInfo, PaymentHistoryEntry, EditPaymentForm } from './types';
import { getPaymentStatusColor, formatPaymentMethod } from './utils';
import { PaymentHistory } from './PaymentHistory';
import { ProcessPaymentForm } from './ProcessPaymentForm';

interface PaymentInformationProps {
  paymentInfo: PaymentInfo;
  paymentHistory: PaymentHistoryEntry[];
  editingNoteId: number | null;
  editingPayment: EditPaymentForm;
  depositAmount: string;
  paymentMethod: string;
  paymentNotes: string;
  processingPayment: boolean;
  onEditPayment: (entry: PaymentHistoryEntry) => void;
  onUpdateEditingPayment: (payment: EditPaymentForm) => void;
  onSavePaymentEdit: () => void;
  onCancelEdit: () => void;
  onDeletePayment: (entry: PaymentHistoryEntry) => void;
  onDepositAmountChange: (amount: string) => void;
  onPaymentMethodChange: (method: string) => void;
  onPaymentNotesChange: (notes: string) => void;
  onProcessPayment: () => void;
}

export function PaymentInformation({
  paymentInfo,
  paymentHistory,
  editingNoteId,
  editingPayment,
  depositAmount,
  paymentMethod,
  paymentNotes,
  processingPayment,
  onEditPayment,
  onUpdateEditingPayment,
  onSavePaymentEdit,
  onCancelEdit,
  onDeletePayment,
  onDepositAmountChange,
  onPaymentMethodChange,
  onPaymentNotesChange,
  onProcessPayment
}: PaymentInformationProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#6F6F6F] flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </h3>
          <span className={`px-3 py-1 text-sm rounded-full ${getPaymentStatusColor(paymentInfo.status)}`}>
            {paymentInfo.status.charAt(0).toUpperCase() + paymentInfo.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-[#6F6F6F] mb-1">Amount Due</div>
            <div className="text-2xl font-bold text-[#6F6F6F]">
              ${(paymentInfo.amount_due * 1.13).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${paymentInfo.amount_due.toFixed(2)} + HST (${(paymentInfo.amount_due * 0.13).toFixed(2)})
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-[#6F6F6F] mb-1">Amount Paid</div>
            <div className="text-2xl font-bold text-green-600">
              ${paymentInfo.amount_paid.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-[#6F6F6F] mb-1">Amount Owing</div>
            <div className={`text-2xl font-bold ${
              ((paymentInfo.amount_due * 1.13) - paymentInfo.amount_paid) > 0 ? 'text-orange-600' : 'text-green-600'
            }`}>
              ${((paymentInfo.amount_due * 1.13) - paymentInfo.amount_paid).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm text-[#6F6F6F]">
          {paymentInfo.due_date && (
            <div>
              <span className="font-medium">Due Date:</span> {new Date(paymentInfo.due_date).toLocaleDateString()}
            </div>
          )}
          {paymentInfo.payment_method && (
            <div>
              <span className="font-medium">Payment Method:</span> {formatPaymentMethod(paymentInfo.payment_method)}
            </div>
          )}
        </div>

        <PaymentHistory
          paymentHistory={paymentHistory}
          editingNoteId={editingNoteId}
          editingPayment={editingPayment}
          onEditPayment={onEditPayment}
          onUpdateEditingPayment={onUpdateEditingPayment}
          onSavePaymentEdit={onSavePaymentEdit}
          onCancelEdit={onCancelEdit}
          onDeletePayment={onDeletePayment}
        />

        <ProcessPaymentForm
          paymentInfo={paymentInfo}
          depositAmount={depositAmount}
          paymentMethod={paymentMethod}
          paymentNotes={paymentNotes}
          processingPayment={processingPayment}
          onDepositAmountChange={onDepositAmountChange}
          onPaymentMethodChange={onPaymentMethodChange}
          onPaymentNotesChange={onPaymentNotesChange}
          onProcessPayment={onProcessPayment}
        />
      </CardContent>
    </Card>
  );
}