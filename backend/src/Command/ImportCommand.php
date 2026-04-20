<?php

declare(strict_types=1);

namespace App\Command;

use App\Ingestion\Dto\ScrapedAgency;
use App\Ingestion\Dto\ScrapedDocument;
use App\Ingestion\Dto\ScrapedTopic;
use App\Ingestion\ScrapeLogger;
use App\Ingestion\Sink\DbSink;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Replays a JSONL file produced by a local scraper run into the production DB.
 *
 * Intended workflow for sources that can't be crawled from AWS (e.g.
 * Cloudflare-gated vault.fbi.gov, paid/proxied datasets):
 *
 *     # on your laptop
 *     php bin/console app:bvd:scrape --source=fbi-vault --output=/tmp/fbi.jsonl
 *     scp /tmp/fbi.jsonl sshnewbe:/tmp/
 *
 *     # on the server
 *     php bin/console app:bvd:import --from-jsonl=/tmp/fbi.jsonl
 *
 * JSONL format (one object per line):
 *   {"type":"agency",  "slug":"...", "name":"...", "description":"..."}
 *   {"type":"topic",   "slug":"...", "name":"...", "description":"...", "agency_slug":"..."}
 *   {"type":"document","slug":"...", "source":"...", "external_id":"...", "title":"...", ...}
 *
 * Idempotent: safe to re-run the same file.
 */
#[AsCommand(
    name: 'app:bvd:import',
    description: 'Import a JSONL capture produced by a local scrape into MySQL.',
)]
final class ImportCommand extends Command
{
    public function __construct(
        private readonly DbSink $dbSink,
        private readonly ScrapeLogger $log,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('from-jsonl', null, InputOption::VALUE_REQUIRED, 'Path to newline-delimited JSON capture')
            ->addOption('source', null, InputOption::VALUE_OPTIONAL, 'Override `source` label written to scrape_log (defaults to the first document\'s source)')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Parse the file but do not write anything');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $path = (string) $input->getOption('from-jsonl');
        $dryRun = (bool) $input->getOption('dry-run');
        $sourceOverride = $input->getOption('source');

        if ($path === '' || !is_readable($path)) {
            $io->error("Cannot read --from-jsonl file: '$path'");
            return Command::FAILURE;
        }

        $fh = fopen($path, 'rb');
        if ($fh === false) {
            $io->error("Failed to open $path");
            return Command::FAILURE;
        }

        $io->title('BVD Import — ' . $path . ($dryRun ? '  [DRY RUN]' : ''));

        $logId = null;
        $detectedSource = null;
        $agencies = 0;
        $topics = 0;
        $docsSeen = 0;
        $docsAdded = 0;
        $lineNum = 0;
        $badLines = 0;

        try {
            while (($line = fgets($fh)) !== false) {
                $lineNum++;
                $line = trim($line);
                if ($line === '') {
                    continue;
                }

                try {
                    /** @var array $row */
                    $row = json_decode($line, true, 32, \JSON_THROW_ON_ERROR);
                } catch (\JsonException $e) {
                    $badLines++;
                    $io->warning("Line $lineNum: invalid JSON ({$e->getMessage()})");
                    continue;
                }

                $type = (string) ($row['type'] ?? '');

                if ($type === 'agency') {
                    if (!$dryRun) {
                        $this->dbSink->writeAgency(ScrapedAgency::fromArray($row));
                    }
                    $agencies++;
                    continue;
                }

                if ($type === 'topic') {
                    if (!$dryRun) {
                        $this->dbSink->writeTopic(ScrapedTopic::fromArray($row));
                    }
                    $topics++;
                    continue;
                }

                if ($type === 'document') {
                    $docsSeen++;
                    if ($detectedSource === null && isset($row['source'])) {
                        $detectedSource = (string) $row['source'];
                        // Start the scrape_log row once we know the source.
                        if (!$dryRun) {
                            $logSource = $sourceOverride !== null ? (string) $sourceOverride : $detectedSource;
                            $logId = $this->log->start($logSource, 'import-jsonl', $path);
                        }
                    }
                    if (!$dryRun) {
                        $docsAdded += $this->dbSink->writeDocument(ScrapedDocument::fromArray($row));
                    }
                    if ($docsSeen % 1000 === 0) {
                        $io->writeln("  …$docsSeen documents processed");
                        if ($logId !== null) {
                            $this->log->tick($logId, $docsAdded, $docsSeen);
                        }
                    }
                    continue;
                }

                $badLines++;
                $io->warning("Line $lineNum: unknown record type '$type'");
            }

            if (!$dryRun) {
                $this->dbSink->finish();
                if ($logId !== null) {
                    $this->log->finish($logId, 'completed', $docsAdded, $docsSeen);
                }
            }
        } catch (\Throwable $e) {
            if ($logId !== null && !$dryRun) {
                $this->log->finish($logId, 'failed', $docsAdded, $docsSeen, $e->getMessage());
            }
            throw $e;
        } finally {
            fclose($fh);
        }

        $io->success(sprintf(
            'Import complete. agencies=%d topics=%d docs_seen=%d docs_added=%d bad_lines=%d',
            $agencies, $topics, $docsSeen, $docsAdded, $badLines,
        ));
        return Command::SUCCESS;
    }
}
