import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentInstructionsModal({ isOpen, onClose }: PaymentInstructionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full mx-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-[#6F6F6F]">Make a payment</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-[#6F6F6F] space-y-4">
            <p>
              Payments are accepted through e-transfer. Send transfers to{' '}
              <strong className="text-[#B20000] font-semibold">ofslpayments@gmail.com</strong>.
            </p>
            <p>
              Please include team name and league name in the notes.
            </p>
            <p>
              Once received, your payment amount will be updated in your account within 24 hours.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white px-6 py-2"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}