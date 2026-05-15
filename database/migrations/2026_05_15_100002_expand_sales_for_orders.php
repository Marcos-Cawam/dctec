<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->string('payment_method', 32)->default('pix')->after('client_id');
            $table->decimal('down_payment', 12, 2)->default(0)->after('payment_method');
            $table->decimal('total', 12, 2)->default(0)->after('down_payment');
        });

        if (Schema::hasColumn('sales', 'amount')) {
            foreach (DB::table('sales')->get() as $row) {
                DB::table('sales')->where('id', $row->id)->update([
                    'total' => $row->amount,
                ]);
            }
        }

        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'title')) {
                $table->dropColumn('title');
            }
            if (Schema::hasColumn('sales', 'amount')) {
                $table->dropColumn('amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('title')->default('');
            $table->decimal('amount', 12, 2)->default(0);
        });

        foreach (DB::table('sales')->get() as $row) {
            DB::table('sales')->where('id', $row->id)->update([
                'amount' => $row->total ?? 0,
                'title' => 'Venda #'.$row->id,
            ]);
        }

        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['client_id']);
            $table->dropColumn(['client_id', 'payment_method', 'down_payment', 'total']);
        });
    }
};
