<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\User;

class ClientPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function update(User $user, Client $client): bool
    {
        return $this->owns($user, $client);
    }

    public function delete(User $user, Client $client): bool
    {
        return $this->owns($user, $client);
    }

    private function owns(User $user, Client $client): bool
    {
        return $user->id === $client->user_id || $user->isAdministrator();
    }
}
