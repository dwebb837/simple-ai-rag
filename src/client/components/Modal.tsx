import { Dialog } from '@headlessui/react';
import { useEffect, useRef } from 'react';

export default function Modal({
    isOpen,
    onClose,
    children
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Trap focus in modal
    useEffect(() => {
        if (isOpen) closeButtonRef.current?.focus();
    }, [isOpen]);

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="fixed inset-0 z-50 overflow-y-auto"
        >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            {/* Focus trap container */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                    {/* Close button */}
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        aria-label="Close"
                    >
                        ×
                    </button>

                    {children}
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}