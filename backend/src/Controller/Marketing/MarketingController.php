<?php

declare(strict_types=1);

namespace App\Controller\Marketing;

use App\Service\MarketingAdminMailer;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/public/marketing')]
class MarketingController extends AbstractController
{
    public function __construct(
        private readonly Connection $conn,
        private readonly MarketingAdminMailer $marketingAdminMailer,
    ) {
    }

    #[Route('/newsletter/subscribe', methods: ['POST'])]
    #[Route('/{brand}/newsletter/subscribe', methods: ['POST'])]
    public function newsletterSubscribe(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $email = trim($data['email'] ?? '');

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Valid email required'], 400);
        }

        try {
            $this->conn->executeStatement(
                'INSERT INTO newsletter_subscriber (email, subscribed_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE subscribed_at = subscribed_at',
                [$email]
            );
        } catch (\Throwable) {
            return $this->json(['error' => 'Subscription failed'], 500);
        }

        return $this->json(['success' => true, 'message' => 'Subscribed successfully']);
    }

    #[Route('/leads', methods: ['POST'])]
    #[Route('/{brand}/leads', methods: ['POST'])]
    public function leadCapture(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $email = trim($data['email'] ?? '');
        $first = isset($data['first_name']) ? trim((string) $data['first_name']) : '';
        $last = isset($data['last_name']) ? trim((string) $data['last_name']) : '';
        $phone = isset($data['phone']) ? trim((string) $data['phone']) : null;
        if ($phone === '') {
            $phone = null;
        }
        $message = isset($data['message']) ? trim((string) $data['message']) : null;
        if ($message === '') {
            $message = null;
        }
        $source = isset($data['source']) ? trim((string) $data['source']) : null;
        if ($source === '') {
            $source = null;
        }

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Valid email required'], 400);
        }

        $payload = [
            'first_name' => $first !== '' ? $first : null,
            'last_name' => $last !== '' ? $last : null,
            'email' => $email,
            'phone' => $phone,
            'message' => $message,
            'source' => $source,
        ];

        try {
            $this->conn->executeStatement(
                'INSERT INTO marketing_lead (first_name, last_name, email, phone, message, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [
                    $payload['first_name'],
                    $payload['last_name'],
                    $email,
                    $phone,
                    $message,
                ]
            );
        } catch (\Throwable) {
            return $this->json(['error' => 'Lead capture failed'], 500);
        }

        try {
            $this->marketingAdminMailer->notifyNewLead($payload);
        } catch (\Throwable) {
        }

        return $this->json(['success' => true, 'message' => 'Lead captured successfully']);
    }
}
