<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\ArchivesGovScraper;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:bvd:scrape',
    description: 'Run a paced scrape of a BlackVaultDocs source (archives.gov, etc.)',
)]
final class ScrapeCommand extends Command
{
    public function __construct(
        private readonly ArchivesGovScraper $archivesGov,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('source', 's', InputOption::VALUE_OPTIONAL, 'Source key (archives-gov)', 'archives-gov')
            ->addOption('max-topics', null, InputOption::VALUE_OPTIONAL, 'Limit number of topic pages processed (0 = all)', 0)
            ->addOption('max-docs', null, InputOption::VALUE_OPTIONAL, 'Limit docs per topic (0 = all)', 0)
            ->addOption('delay-ms', null, InputOption::VALUE_OPTIONAL, 'Delay between HTTP requests (ms)', 2000);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $source = (string) $input->getOption('source');
        $maxTopics = (int) $input->getOption('max-topics');
        $maxDocs = (int) $input->getOption('max-docs');
        $delayMs = max(250, (int) $input->getOption('delay-ms'));

        $io->title(sprintf('BVD Scrape — %s', $source));
        $io->text(sprintf('max-topics=%d  max-docs=%d  delay-ms=%d', $maxTopics, $maxDocs, $delayMs));

        $result = match ($source) {
            'archives-gov' => $this->archivesGov->run($maxTopics, $maxDocs, $delayMs),
            default => throw new \InvalidArgumentException("Unknown source: $source"),
        };

        $io->success(sprintf(
            'Done. topics=%d docs_seen=%d docs_added=%d',
            $result['topics'],
            $result['docs_seen'],
            $result['docs_added'],
        ));
        return Command::SUCCESS;
    }
}
