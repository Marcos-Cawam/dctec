import DangerButton from '@/Components/DangerButton';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function SalesIndex({ sales, filters, paymentMethods, clients }) {
    const destroy = (id) => {
        if (confirm('Excluir esta venda?')) {
            router.delete(route('sales.destroy', id));
        }
    };

    const applyFilters = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const params = {};
        fd.forEach((v, k) => {
            if (v !== '') {
                params[k] = v;
            }
        });
        router.get(route('sales.index'), params, { preserveState: true });
    };

    const rows = sales.data ?? sales;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Vendas
                    </h2>
                    <PrimaryButton type="button" onClick={() => router.get(route('sales.create'))}>
                        Nova venda
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Vendas" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <form
                        onSubmit={applyFilters}
                        className="mb-6 grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:bg-gray-800"
                    >
                        <div>
                            <InputLabel value="Busca (ID ou nome do cliente)" />
                            <TextInput
                                name="search"
                                className="mt-1 block w-full"
                                defaultValue={filters.search ?? ''}
                                placeholder="Ex.: 12 ou Maria"
                            />
                        </div>
                        <div>
                            <InputLabel value="Cliente" />
                            <select
                                name="client_id"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                defaultValue={filters.client_id ?? ''}
                            >
                                <option value="">Todos</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <InputLabel value="Forma de pagamento" />
                            <select
                                name="payment_method"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                defaultValue={filters.payment_method ?? ''}
                            >
                                <option value="">Todas</option>
                                {Object.entries(paymentMethods).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <InputLabel value="De" />
                                <TextInput
                                    type="date"
                                    name="date_from"
                                    className="mt-1 block w-full"
                                    defaultValue={filters.date_from ?? ''}
                                />
                            </div>
                            <div>
                                <InputLabel value="Até" />
                                <TextInput
                                    type="date"
                                    name="date_to"
                                    className="mt-1 block w-full"
                                    defaultValue={filters.date_to ?? ''}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
                            <PrimaryButton type="submit">Filtrar</PrimaryButton>
                            <SecondaryButton
                                type="button"
                                onClick={() => router.get(route('sales.index'))}
                            >
                                Limpar
                            </SecondaryButton>
                        </div>
                    </form>

                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {rows.length === 0 && (
                                <li className="p-6 text-gray-500 dark:text-gray-400">
                                    Nenhuma venda encontrada.
                                </li>
                            )}
                            {rows.map((sale) => (
                                <li
                                    key={sale.id}
                                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                                >
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            Venda #{sale.id}
                                            {sale.client && (
                                                <span className="font-normal text-gray-600 dark:text-gray-400">
                                                    {' '}
                                                    — {sale.client.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {paymentMethods[sale.payment_method] ?? sale.payment_method} ·{' '}
                                            {Number(sale.total).toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            })}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                            Vendedor: {sale.user?.name}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={route('sales.pdf', sale.id)}
                                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 shadow-sm transition duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            PDF
                                        </a>
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => router.get(route('sales.edit', sale.id))}
                                        >
                                            Editar
                                        </SecondaryButton>
                                        <DangerButton type="button" onClick={() => destroy(sale.id)}>
                                            Excluir
                                        </DangerButton>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {sales.links && (
                            <div className="flex flex-wrap gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
                                {sales.links.map((link, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        className={`rounded px-3 py-1 text-sm ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                                        } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
