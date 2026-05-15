import Checkbox from '@/Components/Checkbox';
import ErrorToast from '@/Components/ErrorToast';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function parseMoney(v) {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
}

function itemsTotal(items) {
    return items.reduce((sum, row) => {
        const q = parseInt(row.quantity, 10) || 0;
        const p = parseMoney(row.unit_price);
        return Math.round((sum + q * p) * 100) / 100;
    }, 0);
}

function splitFinancedEqually(financed, count, existingDates) {
    const cents = Math.round(financed * 100);
    if (count <= 0 || cents < 0) {
        return [];
    }
    const base = Math.floor(cents / count);
    const extra = cents - base * count;
    return Array.from({ length: count }, (_, i) => ({
        due_date:
            existingDates[i] ||
            new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10),
        amount: String((base + (i < extra ? 1 : 0)) / 100),
    }));
}

export default function SalesEdit({ sale, clients, products, paymentMethods }) {
    const [useInstallments, setUseInstallments] = useState(
        Array.isArray(sale.installments) && sale.installments.length > 0,
    );

    const { data, setData, put, processing, errors, transform } = useForm({
        client_id: sale.client_id ?? '',
        payment_method: sale.payment_method,
        down_payment: sale.down_payment,
        items:
            sale.items?.length > 0
                ? sale.items.map((row) => ({
                      product_id: String(row.product_id),
                      quantity: String(row.quantity),
                      unit_price: String(row.unit_price),
                  }))
                : [{ product_id: '', quantity: '1', unit_price: '' }],
        installments: (sale.installments || []).map((row) => ({
            due_date: row.due_date,
            amount: String(row.amount),
        })),
    });

    const total = useMemo(() => itemsTotal(data.items), [data.items]);

    const financedPreview = useMemo(() => {
        const d = parseMoney(data.down_payment);
        return Math.round((total - d) * 100) / 100;
    }, [total, data.down_payment]);

    const entradaErrorMessage = useMemo(() => {
        if (!useInstallments) {
            return null;
        }
        const down = parseMoney(data.down_payment);
        if (down > total + 0.0001) {
            return 'O valor da entrada não pode ultrapassar o total da venda (soma dos itens).';
        }
        return null;
    }, [useInstallments, data.down_payment, total]);

    const serverDownPaymentError =
        typeof errors.down_payment === 'string'
            ? errors.down_payment
            : Array.isArray(errors.down_payment)
              ? errors.down_payment[0]
              : null;

    const toastMessage = entradaErrorMessage || serverDownPaymentError || null;

    const onProductLineChange = (index, productId) => {
        const next = [...data.items];
        const p = products.find((x) => String(x.id) === String(productId));
        next[index] = {
            ...next[index],
            product_id: productId,
            unit_price: p ? String(p.price) : '',
        };
        setData('items', next);
    };

    const addItem = () => {
        setData('items', [
            ...data.items,
            { product_id: '', quantity: '1', unit_price: '' },
        ]);
    };

    const removeItem = (index) => {
        if (data.items.length <= 1) {
            return;
        }
        setData(
            'items',
            data.items.filter((_, i) => i !== index),
        );
    };

    const redistribute = () => {
        const down = parseMoney(data.down_payment);
        const fin = Math.round((total - down) * 100) / 100;
        const n = data.installments.length;
        if (n <= 0 || fin < 0) {
            return;
        }
        const dates = data.installments.map((x) => x.due_date);
        setData('installments', splitFinancedEqually(fin, n, dates));
    };

    const setInstallmentCount = (n) => {
        const count = Math.max(0, parseInt(n, 10) || 0);
        const down = parseMoney(data.down_payment);
        const fin = Math.round((total - down) * 100) / 100;
        if (count === 0) {
            setData('installments', []);
            return;
        }
        const existing = data.installments.slice(0, count);
        const dates = existing.map((x) => x.due_date);
        while (dates.length < count) {
            const i = dates.length;
            dates.push(
                new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 10),
            );
        }
        setData('installments', splitFinancedEqually(fin, count, dates));
    };

    const updateInstallment = (index, field, value) => {
        const next = [...data.installments];
        next[index] = { ...next[index], [field]: value };
        setData('installments', next);
    };

    const submit = (e) => {
        e.preventDefault();
        if (
            useInstallments &&
            parseMoney(data.down_payment) > total + 0.0001
        ) {
            return;
        }
        transform((form) => {
            const items = form.items.map((row) => ({
                product_id: parseInt(row.product_id, 10),
                quantity: parseInt(row.quantity, 10),
                unit_price: parseMoney(row.unit_price),
            }));
            if (!useInstallments) {
                return {
                    ...form,
                    client_id: form.client_id === '' ? null : form.client_id,
                    items,
                    down_payment: 0,
                    installments: [],
                };
            }
            return {
                ...form,
                client_id: form.client_id === '' ? null : form.client_id,
                items,
                down_payment: parseMoney(form.down_payment),
                installments: form.installments.map((row) => ({
                    due_date: row.due_date,
                    amount: parseMoney(row.amount),
                })),
            };
        });
        put(route('sales.update', sale.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Editar venda #{sale.id}
                </h2>
            }
        >
            <Head title={`Editar venda #${sale.id}`} />

            <ErrorToast message={toastMessage} />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg dark:bg-gray-800">
                        {products.length === 0 ? (
                            <p className="text-gray-600 dark:text-gray-300">
                                Não há produtos cadastrados para este vendedor.
                            </p>
                        ) : (
                            <form onSubmit={submit} className="space-y-6">
                                <div>
                                    <InputLabel htmlFor="client_id" value="Cliente" />
                                    <select
                                        id="client_id"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                        value={data.client_id}
                                        onChange={(e) => setData('client_id', e.target.value)}
                                    >
                                        <option value="">— Sem cliente —</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.client_id} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="payment_method" value="Forma de pagamento" />
                                    <select
                                        id="payment_method"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                        value={data.payment_method}
                                        onChange={(e) => setData('payment_method', e.target.value)}
                                    >
                                        {Object.entries(paymentMethods).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.payment_method} className="mt-2" />
                                </div>

                                <div>
                                    <div className="mb-2 font-medium text-gray-800 dark:text-gray-200">
                                        Itens
                                    </div>
                                    {data.items.map((row, index) => (
                                        <div
                                            key={index}
                                            className="mb-3 flex flex-wrap items-end gap-2 rounded border border-gray-200 p-3 dark:border-gray-600"
                                        >
                                            <div className="min-w-[180px] flex-1">
                                                <InputLabel value="Produto" />
                                                <select
                                                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                                    value={row.product_id}
                                                    required
                                                    onChange={(e) =>
                                                        onProductLineChange(index, e.target.value)
                                                    }
                                                >
                                                    <option value="">Selecione</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-24">
                                                <InputLabel value="Qtd" />
                                                <TextInput
                                                    type="number"
                                                    min="1"
                                                    className="mt-1 block w-full"
                                                    value={row.quantity}
                                                    onChange={(e) => {
                                                        const next = [...data.items];
                                                        next[index].quantity = e.target.value;
                                                        setData('items', next);
                                                    }}
                                                    required
                                                />
                                            </div>
                                            <div className="w-32">
                                                <InputLabel value="Unitário" />
                                                <TextInput
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="mt-1 block w-full"
                                                    value={row.unit_price}
                                                    onChange={(e) => {
                                                        const next = [...data.items];
                                                        next[index].unit_price = e.target.value;
                                                        setData('items', next);
                                                    }}
                                                    required
                                                />
                                            </div>
                                            <SecondaryButton
                                                type="button"
                                                onClick={() => removeItem(index)}
                                            >
                                                Remover
                                            </SecondaryButton>
                                        </div>
                                    ))}
                                    <SecondaryButton type="button" onClick={addItem}>
                                        Adicionar item
                                    </SecondaryButton>
                                    <InputError message={errors.items} className="mt-2" />
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                        Total dos itens:{' '}
                                        <strong>
                                            {total.toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            })}
                                        </strong>
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="use_inst"
                                        name="use_inst"
                                        checked={useInstallments}
                                        onChange={(e) => {
                                            const on = e.target.checked;
                                            setUseInstallments(on);
                                            if (!on) {
                                                setData('installments', []);
                                                setData('down_payment', '0');
                                            } else {
                                                setInstallmentCount(
                                                    Math.max(1, sale.installments?.length || 2),
                                                );
                                            }
                                        }}
                                    />
                                    <label htmlFor="use_inst" className="text-sm text-gray-700 dark:text-gray-300">
                                        Parcelar (entrada + parcelas = total)
                                    </label>
                                </div>

                                {useInstallments && (
                                    <div className="space-y-4 rounded border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                                        <div>
                                            <InputLabel htmlFor="down_payment" value="Valor de entrada" />
                                            <TextInput
                                                id="down_payment"
                                                type="text"
                                                inputMode="decimal"
                                                className="mt-1 block w-full max-w-xs"
                                                value={data.down_payment}
                                                onChange={(e) => setData('down_payment', e.target.value)}
                                            />
                                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                Restante para parcelas:{' '}
                                                <strong>
                                                    {financedPreview.toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    })}
                                                </strong>
                                            </p>
                                            <InputError message={errors.down_payment} className="mt-2" />
                                        </div>
                                        <div className="flex flex-wrap items-end gap-2">
                                            <div>
                                                <InputLabel htmlFor="nparc" value="Quantidade de parcelas" />
                                                <TextInput
                                                    id="nparc"
                                                    type="number"
                                                    min="1"
                                                    className="mt-1 w-24"
                                                    value={data.installments.length || ''}
                                                    onChange={(e) => setInstallmentCount(e.target.value)}
                                                />
                                            </div>
                                            <SecondaryButton type="button" onClick={redistribute}>
                                                Recalcular parcelas iguais
                                            </SecondaryButton>
                                        </div>
                                        {data.installments.map((row, index) => (
                                            <div key={index} className="flex flex-wrap gap-2">
                                                <div>
                                                    <InputLabel value={`Parcela ${index + 1} — vencimento`} />
                                                    <TextInput
                                                        type="date"
                                                        className="mt-1"
                                                        value={row.due_date}
                                                        onChange={(e) =>
                                                            updateInstallment(index, 'due_date', e.target.value)
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <InputLabel value="Valor" />
                                                    <TextInput
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="mt-1 w-32"
                                                        value={row.amount}
                                                        onChange={(e) =>
                                                            updateInstallment(index, 'amount', e.target.value)
                                                        }
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <InputError message={errors.installments} className="mt-2" />
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <PrimaryButton
                                        disabled={
                                            processing ||
                                            products.length === 0 ||
                                            !!entradaErrorMessage
                                        }
                                    >
                                        Atualizar venda
                                    </PrimaryButton>
                                    <Link href={route('sales.index')}>
                                        <SecondaryButton type="button">Cancelar</SecondaryButton>
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
