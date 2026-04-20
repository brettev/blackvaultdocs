<?php

declare(strict_types=1);

namespace App\Command;

use App\Ingestion\ScrapeLogger;
use App\Ingestion\ScraperRegistry;
use App\Ingestion\Sink\DbSink;
use App\Ingestion\Sink\JsonlSink;
use App\Ingestion\Sink\SinkInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Run a paced scrape of a BlackVaultDocs source.
 *
 * Two output modes:
 *   - DB (default): `app:bvd:scrape --source=archives-gov`
 *     Upserts directly into MySQL, tracks progress in `scrape_log`.
 *   - JSONL: `app:bvd:scrape --source=<key> --output=/tmp/foo.jsonl`
 *     Captures scraped records to a file for later `app:bvd:import`.
 *     Used for sources that must be scraped off-server (e.g. Cloudflare-
 *     gated vault.fbi.gov with a Playwright-based scraper).
 */
#[AsCommand(
    name: 'app:bvd:scrape',
    description: 'Run a paced scrape of a BlackVaultDocs source (archives.gov, DOJ OIG, etc.)',
)]
final class ScrapeCommand extends Command
{
    public function __construct(
        private readonly ScraperRegistry $registry,
        private readonly DbSink $dbSink,
        private readonly ScrapeLogger $log,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('source', 's', InputOption::VALUE_OPTIONAL, 'Source key (archives-gov, oig-doj, …)', 'archives-gov')
            ->addOption('max-topics', null, InputOption::VALUE_OPTIONAL, 'Limit topic pages (0 = all)', 0)
            ->addOption('max-docs', null, InputOption::VALUE_OPTIONAL, 'Limit docs per topic (0 = all)', 0)
            ->addOption('delay-ms', null, InputOption::VALUE_OPTIONAL, 'Delay between HTTP requests (ms)', 2000)
            ->addOption('output', 'o', InputOption::VALUE_OPTIONAL, 'Write records to this JSONL file instead of the DB')
            ->addOption('list', null, InputOption::VALUE_NONE, 'List available sources and exit');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if ($input->getOption('list')) {
            $io->title('Available sources');
            foreach ($this->registry->keys() as $k) {
                $io->writeln("  - $k");
            }
            return Command::SUCCESS;
        }

        $sourceKey = (string) $input->getOption('source');
        if (!$this->registry->has($sourceKey)) {
            $io->error(sprintf(
                "Unknown --source '%s'. Known: %s",
                $sourceKey,
                implode(', ', $this->registry->keys()),
            ));
            return Command::FAILURE;
        }

        $scraper = $this->registry->get($sourceKey);
        $maxTopics = (int) $input->getOption('max-topics');
        $maxDocs = (int) $input->getOption('max-docs');
        $delayMs = max(250, (int) $input->getOption('delay-ms'));
        $outputPath = $input->getOption('output');

        $io->title(sprintf('BVD Scrape — %s', $sourceKey));
        $io->text(sprintf('max-topics=%d  max-docs=%d  delay-ms=%d', $maxTopics, $maxDocs, $delayMs));

        $sink = $this->buildSink($outputPath, $io);
        $isDb = $sink instanceof DbSink;
        $logId = $isDb ? $this->log->start($sourceKey, 'scrape') : null;

        $options = [
            'max_topics' => $maxTopics,
            'max_docs_per_topic' => $maxDocs,
            'delay_ms' => $delayMs,
            'progress' => $logId !== null
                ? function (string $topicSlug, int $added, int $seen) use ($logId): void {
                    $this->log->tick($logId, $added, $seen);
                }
                : null,
        ];

        try {
            $result = $scraper->run($sink, $options);
            $sink->finish();
            if ($logId !== null) {
                $this->log->finish($logId, 'completed', (int) $result['docs_added'], (int) $result['docs_seen']);
            }
        } catch (\Throwable $e) {
            if ($logId !== null) {
                $this->log->finish($logId, 'failed', 0, 0, $e->getMessage());
            }
            throw $e;
        }

        if ($outputPath !== null && $sink instanceof JsonlSink) {
            $stats = $sink->stats();
            $io->success(sprintf(
                'Wrote %s. agencies=%d topics=%d documents=%d',
                $outputPath,
                $stats['agencies'] ?? 0,
                $stats['topics'] ?? 0,
                $stats['documents'] ?? 0,
            ));
        } else {
            $io->success(sprintf(
                'Done. topics=%d docs_seen=%d docs_added=%d',
                (int) $result['topics'],
                (int) $result['docs_seen'],
                (int) $result['docs_added'],
            ));
        }

        return Command::SUCCESS;
    }

    private function buildSink(?string $outputPath, SymfonyStyle $io): SinkInterface
    {
        if ($outputPath === null || $outputPath === '') {
            $io->text('sink=db (writing directly to MySQL)');
            return $this->dbSink;
        }
        $io->text("sink=jsonl output=$outputPath");
        return new JsonlSink($outputPath);
    }
}
