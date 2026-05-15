import { useEffect, useState } from 'react';

export default function ErrorToast({ message }) {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setDismissed(false);
    }, [message]);

    if (!message || dismissed) {
        return null;
    }

    return (
        <div
            role="alert"
            className="fixed end-4 top-20 z-[100] max-w-sm rounded-lg border border-red-400 bg-red-600 p-4 text-sm text-white shadow-lg ring-1 ring-red-900/20 dark:border-red-500 dark:bg-red-700"
        >
            <div className="flex gap-3">
                <div className="shrink-0 pt-0.5">
                    <svg
                        className="h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <p className="min-w-0 flex-1 font-medium leading-snug">{message}</p>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="shrink-0 rounded p-0.5 text-white/90 hover:bg-white/10 hover:text-white"
                    aria-label="Fechar"
                >
                    <span className="text-lg leading-none">×</span>
                </button>
            </div>
        </div>
    );
}
