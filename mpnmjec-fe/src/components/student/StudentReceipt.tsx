import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Download, Printer, Loader2 } from 'lucide-react';
import { getReceiptDetails, downloadReceiptPdf } from '../../services/studentService';
import { toast } from 'sonner';

interface ReceiptData {
  studentName: string;
  rollNo: string;
  date: string;
  amountPaid: number;
  paymentMethod?: string;
  purpose?: string;
  transactionId?: string;
  receiptNumber?: string;
  status?: string;
}

export default function StudentReceipt() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await getReceiptDetails(id);
        setReceipt(res.data.receipt);
      } catch (error) {
        console.error('Failed to fetch receipt:', error);
        toast.error('Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-gray-500">Receipt not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <Card className="max-w-4xl mx-auto p-8 bg-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Receipt</h1>
          <p className="text-gray-600">Receipt No: {receipt.receiptNumber || id}</p>
        </div>

        <div className="border-t-4 border-blue-600 pt-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Student Name</p>
              <p className="font-bold text-gray-900">{receipt.studentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Roll No</p>
              <p className="font-bold text-gray-900">{receipt.rollNo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-bold text-gray-900">{receipt.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="font-bold text-green-600 text-xl">₹{receipt.amountPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-sm text-gray-600">Payment Mode</p>
            <p className="font-bold text-gray-900">{receipt.paymentMethod || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Purpose</p>
            <p className="font-bold text-gray-900">{receipt.purpose || 'Fee payment'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Transaction ID</p>
            <p className="font-bold text-gray-900">{receipt.transactionId || 'N/A'}</p>
          </div>
        </div>

        <div className="mt-12 mb-8 flex justify-between items-end">
          <div>
            <div className="h-16" />
            <p className="font-semibold text-gray-900">Student Copy</p>
          </div>
          <div className="text-right">
            <div className="h-16 border-b border-gray-400 w-48 mb-2" />
            <p className="font-semibold text-gray-900">Sign / Stamp</p>
          </div>
        </div>

        <div className="flex gap-3 print:hidden">
          <Button className="flex-1" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={async () => {
              if (!id) return;
              try {
                const res = await downloadReceiptPdf(id);
                const blob = new Blob([res.data], { type: (res.headers?.['content-type'] as string) || 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt_${receipt?.receiptNumber || id}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast.success('Receipt downloaded');
              } catch (error) {
                console.error('Failed to download receipt:', error);
                toast.error('Failed to download receipt');
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" />Download PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
