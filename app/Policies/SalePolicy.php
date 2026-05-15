<?php

namespace App\Policies;

use App\Models\Sale;
use App\Models\User;

class SalePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Sale $sale): bool
    {
        return $this->owns($user, $sale);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Sale $sale): bool
    {
        return $this->owns($user, $sale);
    }

    public function delete(User $user, Sale $sale): bool
    {
        return $this->owns($user, $sale);
    }

    private function owns(User $user, Sale $sale): bool
    {
        if ($user->id === $sale->user_id) {
            return true;
        }

        return $user->isAdministrator();
    }
}
