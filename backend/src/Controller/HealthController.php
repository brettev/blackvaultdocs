<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class HealthController
{
    #[Route('/', name: 'root', methods: ['GET'])]
    public function root(): JsonResponse
    {
        return new JsonResponse([
            'service' => 'blackvaultdocs-api',
            'status' => 'ok',
            'docs' => 'https://blackvaultdocs.com',
        ]);
    }

    #[Route('/health', name: 'health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return new JsonResponse(['status' => 'ok']);
    }
}
