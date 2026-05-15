<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Http\Requests\UpdateSaleRequest;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SaleController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Sale::class);

        $user = $request->user();

        $query = Sale::query()
            ->with(['client', 'user'])
            ->latest();

        if (! $user->isAdministrator()) {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->integer('client_id'));
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->string('payment_method')->toString());
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date('date_to'));
        }

        if ($request->filled('search')) {
            $raw = $request->string('search')->trim()->toString();
            $like = '%'.$raw.'%';
            $query->where(function ($q) use ($raw, $like) {
                $q->whereHas('client', fn ($c) => $c->where('name', 'like', $like));
                if (ctype_digit($raw)) {
                    $q->orWhere('id', (int) $raw);
                }
            });
        }

        $sales = $query->paginate(12)->withQueryString();

        $clientOptions = Client::query()
            ->when(! $user->isAdministrator(), fn ($q) => $q->where('user_id', $user->id))
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'filters' => [
                'client_id' => $request->input('client_id'),
                'payment_method' => $request->input('payment_method'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
                'search' => $request->input('search'),
            ],
            'paymentMethods' => Sale::PAYMENT_METHODS,
            'clients' => $clientOptions,
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Sale::class);

        $uid = $request->user()->id;

        return Inertia::render('Sales/Create', [
            'clients' => Client::query()->where('user_id', $uid)->orderBy('name')->get(),
            'products' => Product::query()->where('user_id', $uid)->orderBy('name')->get(),
            'paymentMethods' => Sale::PAYMENT_METHODS,
        ]);
    }

    public function store(StoreSaleRequest $request): RedirectResponse
    {
        $this->authorize('create', Sale::class);

        $validated = $request->validated();
        $ownerId = $request->user()->id;

        DB::transaction(function () use ($validated, $ownerId) {
            $sale = Sale::query()->create([
                'user_id' => $ownerId,
                'client_id' => $validated['client_id'] ?? null,
                'payment_method' => $validated['payment_method'],
                'down_payment' => round((float) $validated['down_payment'], 2),
                'total' => 0,
            ]);

            $this->syncItemsAndTotal($sale, $validated['items'], $ownerId);
            $sale->save();

            $this->syncInstallments($sale, $validated['installments'] ?? []);
        });

        return redirect()->route('sales.index');
    }

    public function edit(Sale $sale): Response
    {
        $this->authorize('update', $sale);

        $ownerId = $sale->user_id;

        $sale->load(['items.product', 'installments', 'client', 'user']);

        return Inertia::render('Sales/Edit', [
            'sale' => [
                'id' => $sale->id,
                'client_id' => $sale->client_id,
                'payment_method' => $sale->payment_method,
                'down_payment' => (string) $sale->down_payment,
                'total' => (string) $sale->total,
                'items' => $sale->items->map(fn ($i) => [
                    'product_id' => $i->product_id,
                    'quantity' => $i->quantity,
                    'unit_price' => (string) $i->unit_price,
                ])->all(),
                'installments' => $sale->installments->map(fn ($i) => [
                    'due_date' => $i->due_date->format('Y-m-d'),
                    'amount' => (string) $i->amount,
                ])->all(),
            ],
            'clients' => Client::query()->where('user_id', $ownerId)->orderBy('name')->get(),
            'products' => Product::query()->where('user_id', $ownerId)->orderBy('name')->get(),
            'paymentMethods' => Sale::PAYMENT_METHODS,
        ]);
    }

    public function update(UpdateSaleRequest $request, Sale $sale): RedirectResponse
    {
        $this->authorize('update', $sale);

        $validated = $request->validated();
        $ownerId = $sale->user_id;

        DB::transaction(function () use ($sale, $validated, $ownerId) {
            $sale->fill([
                'client_id' => $validated['client_id'] ?? null,
                'payment_method' => $validated['payment_method'],
                'down_payment' => round((float) $validated['down_payment'], 2),
            ]);

            $this->syncItemsAndTotal($sale, $validated['items'], $ownerId);
            $sale->save();

            $sale->installments()->delete();
            $this->syncInstallments($sale, $validated['installments'] ?? []);
        });

        return redirect()->route('sales.index');
    }

    public function destroy(Sale $sale): RedirectResponse
    {
        $this->authorize('delete', $sale);

        $sale->delete();

        return redirect()->route('sales.index');
    }

    public function pdf(Sale $sale): SymfonyResponse
    {
        $this->authorize('view', $sale);

        $sale->load(['client', 'user', 'items', 'installments']);

        return Pdf::loadView('sales.pdf', ['sale' => $sale])
            ->download('venda-'.$sale->id.'.pdf');
    }

    /**
     * @param  array<int, array{product_id: int, quantity: int, unit_price: float|string}>  $items
     */
    private function syncItemsAndTotal(Sale $sale, array $items, int $ownerId): void
    {
        $sale->items()->delete();

        $total = 0.0;
        foreach ($items as $row) {
            $product = Product::query()
                ->where('user_id', $ownerId)
                ->findOrFail((int) $row['product_id']);

            $qty = (int) $row['quantity'];
            $unit = round((float) $row['unit_price'], 2);
            $line = round($qty * $unit, 2);
            $total = round($total + $line, 2);

            $sale->items()->create([
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => $qty,
                'unit_price' => $unit,
                'line_total' => $line,
            ]);
        }

        $sale->total = $total;
    }

    /**
     * @param  array<int, array{due_date: string, amount: float|string}>  $installments
     */
    private function syncInstallments(Sale $sale, array $installments): void
    {
        foreach ($installments as $index => $row) {
            $sale->installments()->create([
                'sequence' => $index + 1,
                'due_date' => $row['due_date'],
                'amount' => round((float) $row['amount'], 2),
            ]);
        }
    }
}
