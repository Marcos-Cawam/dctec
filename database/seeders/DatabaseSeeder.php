<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        Client::query()->create([
            'user_id' => $user->id,
            'name' => 'Cliente demonstração',
            'email' => 'cliente@example.com',
            'phone' => '(11) 99999-0000',
        ]);

        Product::query()->create([
            'user_id' => $user->id,
            'name' => 'Produto demonstração',
            'price' => 199.9,
        ]);

        Product::query()->create([
            'user_id' => $user->id,
            'name' => 'Serviço básico',
            'price' => 49.5,
        ]);
    }
}
