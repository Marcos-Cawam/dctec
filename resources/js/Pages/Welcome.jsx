import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome({ canLogin, canRegister }) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Bem Vindo" />
            <div className="min-h-screen bg-white">
                <nav className="border-b border-gray-100 bg-white shadow-md">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-end gap-4 px-4 sm:px-6 lg:px-8">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                {canLogin && (
                                    <Link
                                        href={route('login')}
                                        className="text-sm font-medium text-gray-700 underline decoration-transparent underline-offset-4 transition hover:text-gray-900 hover:decoration-gray-400"
                                    >
                                        Login
                                    </Link>
                                )}
                                {canRegister && (
                                    <Link
                                        href={route('register')}
                                        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
                                    >
                                        Registrar-se
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </nav>
            </div>
        </>
    );
}
