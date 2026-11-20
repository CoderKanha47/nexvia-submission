import { useState, useEffect, useRef } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { Price } from '../../lib/formatPrice';
import { usePayForCourseMutation } from '../../features/payments/api';

interface PayNextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transactionId: string) => void;
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    priceCents: number;
    currency: string;
  };
}

export default function PayNextModal({ isOpen, onClose, onSuccess, course }: PayNextModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);
  const [payForCourse] = usePayForCourseMutation();

  const [step, setStep] = useState<'payment' | 'processing' | 'success' | 'error' | 'auth_required'>('payment');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstFocusableRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = 'unset';
      setStep('payment');
      setError(null);
      setTransactionId('');
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && (step === 'payment' || step === 'error')) {
        onClose();
      }
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && (step === 'payment' || step === 'error')) {
      onClose();
    }
  };

  const handlePay = async () => {
    setError(null);
    setProcessing(true);
    setStep('processing');
    
    // Show spinner for ~1.5s
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const result = await payForCourse(course.id).unwrap();
      setTransactionId(result.transactionId);
      setStep('success');
      setTimeout(() => {
        onSuccess(result.transactionId);
        onClose();
      }, 1000);
    } catch (err) {
      const errorResponse = err as { data?: { error?: { message?: string; code?: string } } };
      if (errorResponse.data?.error?.code === 'CONFLICT') {
        // Already enrolled - treat as success
        setTransactionId('ALREADY_ENROLLED');
        setStep('success');
        setTimeout(() => {
          onSuccess('ALREADY_ENROLLED');
          onClose();
        }, 1000);
      } else if (errorResponse.data?.error?.code === 'UNAUTHORIZED' || errorResponse.data?.error?.code === 'TOKEN_EXPIRED') {
        // Session expired - show login prompt
        setStep('auth_required');
      } else {
        setStep('error');
        setError(errorResponse.data?.error?.message || 'Payment failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleAuthRequired = () => {
    onClose();
    // Redirect to login with current page as redirect target
    window.location.href = `/login?reason=session_expired&redirect=/courses/${course.id}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paynext-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-up"
        style={{ maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="28" height="28" rx="6" fill="currentColor" />
              <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-white font-bold text-lg">PayNext</span>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium bg-white/20 text-white rounded-full">TEST MODE</span>
        </div>

        <div className="p-6">
          <h2 id="paynext-title" className="text-xl font-semibold text-gray-900 mb-4">Checkout</h2>
          
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} className="w-16 h-16 object-cover rounded-lg" />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-2xl">▶</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{course.title}</h3>
              <Price amount={course.priceCents} currency={course.currency} className="text-lg" />
            </div>
          </div>

          {step === 'payment' && (
            <button
              ref={firstFocusableRef}
              type="button"
              onClick={handlePay}
              disabled={processing}
              className="w-full py-4 px-4 rounded-lg bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" aria-hidden="true" />
                  Processing...
                </>
              ) : (
                `Pay ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: course.currency, maximumFractionDigits: 0 }).format(course.priceCents / 100)}`
              )}
            </button>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600" aria-hidden="true" />
              <p className="mt-4 text-gray-600">Processing your payment...</p>
              <p className="text-sm text-gray-400">Please do not close this window</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-4">Transaction ID: <span className="font-mono text-indigo-600">{transactionId}</span></p>
              <button
                ref={lastFocusableRef}
                type="button"
                onClick={() => { onSuccess(transactionId); onClose(); }}
                className="w-full py-3 px-4 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
              >
                Start Learning
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Failed</h3>
              <p className="text-gray-600 text-center mb-6 px-4">{error || 'Something went wrong. Please try again.'}</p>
              <button
                ref={firstFocusableRef}
                type="button"
                onClick={() => { setStep('payment'); setError(null); }}
                className="w-full py-3 px-4 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {step === 'auth_required' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Expired</h3>
              <p className="text-gray-600 text-center mb-6 px-4">Your session has expired. Please log in again to complete the payment.</p>
              <button
                ref={firstFocusableRef}
                type="button"
                onClick={handleAuthRequired}
                className="w-full py-3 px-4 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
              >
                Log In Again
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Secured by PayNext (test mode, no real money is charged)
          </p>
        </div>
      </div>
    </div>
  );
}