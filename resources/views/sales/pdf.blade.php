<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Venda #{{ $sale->id }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f3f3f3; }
        .right { text-align: right; }
        .muted { color: #555; font-size: 10px; }
        .totals { margin-top: 16px; width: 280px; margin-left: auto; }
        .totals td { border: none; padding: 4px 0; }
    </style>
</head>
<body>
    <h1>Resumo da venda #{{ $sale->id }}</h1>
    <p class="muted">Emitido em {{ now()->format('d/m/Y H:i') }}</p>

    <p><strong>Vendedor:</strong> {{ $sale->user->name }} ({{ $sale->user->email }})</p>
    <p><strong>Cliente:</strong> {{ $sale->client?->name ?? '—' }}</p>
    <p><strong>Forma de pagamento:</strong> {{ $sale->paymentMethodLabel() }}</p>
    <p><strong>Data da venda:</strong> {{ $sale->created_at->format('d/m/Y H:i') }}</p>

    <h2 style="font-size: 14px; margin-top: 20px;">Itens</h2>
    <table>
        <thead>
            <tr>
                <th>Produto</th>
                <th class="right">Qtd</th>
                <th class="right">Unitário</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($sale->items as $item)
                <tr>
                    <td>{{ $item->product_name }}</td>
                    <td class="right">{{ $item->quantity }}</td>
                    <td class="right">R$ {{ number_format($item->unit_price, 2, ',', '.') }}</td>
                    <td class="right">R$ {{ number_format($item->line_total, 2, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td><strong>Total da venda</strong></td>
            <td class="right"><strong>R$ {{ number_format($sale->total, 2, ',', '.') }}</strong></td>
        </tr>
        <tr>
            <td>Entrada</td>
            <td class="right">R$ {{ number_format($sale->down_payment, 2, ',', '.') }}</td>
        </tr>
    </table>

    @if ($sale->installments->isNotEmpty())
        <h2 style="font-size: 14px; margin-top: 24px;">Parcelas</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Vencimento</th>
                    <th class="right">Valor</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($sale->installments as $inst)
                    <tr>
                        <td>{{ $inst->sequence }}</td>
                        <td>{{ $inst->due_date->format('d/m/Y') }}</td>
                        <td class="right">R$ {{ number_format($inst->amount, 2, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
