<?php

namespace App\Http\Requests;

use App\Models\Sale;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('sale'));
    }

    protected function prepareForValidation(): void
    {
        $clientId = $this->input('client_id');
        if ($clientId === '' || $clientId === null) {
            $this->merge(['client_id' => null]);
        }

        $installments = $this->input('installments');
        if (! is_array($installments)) {
            $this->merge(['installments' => []]);
        }
    }

    public function rules(): array
    {
        $sale = $this->route('sale');
        $userId = $sale instanceof Sale ? $sale->user_id : $this->user()->id;

        return [
            'client_id' => [
                'nullable',
                'integer',
                Rule::exists('clients', 'id')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'payment_method' => ['required', Rule::in(array_keys(Sale::PAYMENT_METHODS))],
            'down_payment' => ['required', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'installments' => ['nullable', 'array'],
            'installments.*.due_date' => ['required', 'date'],
            'installments.*.amount' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $items = $this->input('items', []);
            $total = 0.0;
            foreach ($items as $row) {
                $qty = (int) ($row['quantity'] ?? 0);
                $unit = round((float) ($row['unit_price'] ?? 0), 2);
                $line = round($qty * $unit, 2);
                $total = round($total + $line, 2);
            }

            $down = round((float) $this->input('down_payment', 0), 2);
            if ($down > $total + 0.0001) {
                $validator->errors()->add('down_payment', 'A entrada não pode ser maior que o total da venda.');
            }

            $installments = $this->input('installments', []);
            if ($installments === []) {
                if ($down > 0.0001) {
                    $validator->errors()->add('installments', 'Informe parcelas ou deixe a entrada em zero para pagamento sem parcelamento.');
                }

                return;
            }

            $sumInst = 0.0;
            foreach ($installments as $row) {
                $sumInst = round($sumInst + round((float) ($row['amount'] ?? 0), 2), 2);
            }

            $expected = round($total - $down, 2);
            $diff = abs(round($sumInst - $expected, 2));
            if ($diff > 0.02) {
                $validator->errors()->add(
                    'installments',
                    'A soma das parcelas mais a entrada deve ser igual ao total da venda. Esperado nas parcelas: '.number_format($expected, 2, ',', '.').'.'
                );
            }
        });
    }
}
