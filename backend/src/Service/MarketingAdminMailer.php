<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class MarketingAdminMailer
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly string $adminNotifyEmail,
        private readonly string $fromAddress,
        private readonly string $siteDisplayName,
    ) {
    }

    /**
     * @param array{
     *   first_name?: string|null,
     *   last_name?: string|null,
     *   email: string,
     *   phone?: string|null,
     *   message?: string|null,
     *   source?: string|null
     * } $lead
     */
    public function notifyNewLead(array $lead): void
    {
        $fn = $lead['first_name'] ?? '';
        $ln = $lead['last_name'] ?? '';
        $phone = $lead['phone'] ?? null;
        $message = $lead['message'] ?? null;
        $source = $lead['source'] ?? null;

        $body = sprintf(
            "New %s lead\n\nName: %s %s\nEmail: %s\nPhone: %s\nSource: %s\n\nMessage:\n%s\n",
            $this->siteDisplayName,
            $fn,
            $ln,
            $lead['email'],
            $phone !== null && $phone !== '' ? $phone : '—',
            $source !== null && $source !== '' ? $source : '—',
            $message !== null && $message !== '' ? $message : '—',
        );

        $this->mailer->send(
            (new Email())
                ->from(Address::create($this->fromAddress))
                ->replyTo($lead['email'])
                ->to($this->adminNotifyEmail)
                ->subject(sprintf('[%s] New lead: %s', $this->siteDisplayName, $lead['email']))
                ->text($body),
        );
    }
}
