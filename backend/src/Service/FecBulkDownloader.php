<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

final class FecBulkDownloader
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $bulkBaseUrl,
        private readonly string $dataDir,
    ) {
    }

    /**
     * @return array<string, string> map of logical name => local file path
     */
    public function downloadCycleFiles(int $cycle): array
    {
        $suffix = substr((string) $cycle, 2);
        $cycleDir = "{$this->dataDir}/{$cycle}";
        @mkdir($cycleDir, 0755, true);

        $files = [
            'candidates'       => "cn{$suffix}.zip",
            'committees'       => "cm{$suffix}.zip",
            'ccl'              => "ccl{$suffix}.zip",
            'indiv'            => "indiv{$suffix}.zip",
            'pac2cand'         => "pas2{$suffix}.zip",
            'comm2comm'        => "oth{$suffix}.zip",
            'opexp'            => "oppexp{$suffix}.zip",
            'weball'           => "weball{$suffix}.zip",
            'cand_summary_csv' => "candidate_summary_{$cycle}.csv",
            'cmte_summary_csv' => "committee_summary_{$cycle}.csv",
            'indexp_csv'       => "{$cycle}_INDEPENDENT_EXPENDITURE_DOWNLOAD.csv",
        ];

        $result = [];
        foreach ($files as $key => $filename) {
            $url = "{$this->bulkBaseUrl}/{$cycle}/{$filename}";
            $localPath = "{$cycleDir}/{$filename}";

            if (file_exists($localPath) && (time() - filemtime($localPath)) < 3600) {
                $result[$key] = $localPath;
                continue;
            }

            $response = $this->httpClient->request('GET', $url);
            if ($response->getStatusCode() !== 200) {
                continue;
            }

            $fp = fopen($localPath, 'w');
            foreach ($this->httpClient->stream($response) as $chunk) {
                fwrite($fp, $chunk->getContent());
            }
            fclose($fp);
            $result[$key] = $localPath;
        }

        return $result;
    }

    /**
     * Download only lightweight files (candidates, committees, summaries, ind.exp.)
     * Skips individual contributions to save bandwidth/disk.
     */
    public function downloadLightFiles(int $cycle): array
    {
        $suffix = substr((string) $cycle, 2);
        $cycleDir = "{$this->dataDir}/{$cycle}";
        @mkdir($cycleDir, 0755, true);

        $files = [
            'candidates'       => "cn{$suffix}.zip",
            'committees'       => "cm{$suffix}.zip",
            'ccl'              => "ccl{$suffix}.zip",
            'cand_summary_csv' => "candidate_summary_{$cycle}.csv",
            'cmte_summary_csv' => "committee_summary_{$cycle}.csv",
            'indexp_csv'       => "{$cycle}_INDEPENDENT_EXPENDITURE_DOWNLOAD.csv",
        ];

        $result = [];
        foreach ($files as $key => $filename) {
            $url = "{$this->bulkBaseUrl}/{$cycle}/{$filename}";
            $localPath = "{$cycleDir}/{$filename}";

            if (file_exists($localPath) && (time() - filemtime($localPath)) < 3600) {
                $result[$key] = $localPath;
                continue;
            }

            $response = $this->httpClient->request('GET', $url);
            if ($response->getStatusCode() !== 200) {
                continue;
            }

            $fp = fopen($localPath, 'w');
            foreach ($this->httpClient->stream($response) as $chunk) {
                fwrite($fp, $chunk->getContent());
            }
            fclose($fp);
            $result[$key] = $localPath;
        }

        return $result;
    }

    public function downloadDeltaFiles(int $cycle): array
    {
        $suffix = substr((string) $cycle, 2);
        $cycleDir = "{$this->dataDir}/{$cycle}";
        @mkdir($cycleDir, 0755, true);

        $files = [
            'indiv_insert' => "indiv{$suffix}_insert.zip",
            'indiv_delete' => "indiv{$suffix}_delete.zip",
        ];

        $result = [];
        foreach ($files as $key => $filename) {
            $url = "{$this->bulkBaseUrl}/{$cycle}/{$filename}";
            $localPath = "{$cycleDir}/{$filename}";

            $response = $this->httpClient->request('GET', $url);
            if ($response->getStatusCode() !== 200) {
                continue;
            }

            $fp = fopen($localPath, 'w');
            foreach ($this->httpClient->stream($response) as $chunk) {
                fwrite($fp, $chunk->getContent());
            }
            fclose($fp);
            $result[$key] = $localPath;
        }

        return $result;
    }

    public function extractZip(string $zipPath): string
    {
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new \RuntimeException("Cannot open {$zipPath}");
        }

        $extractDir = $zipPath . '_extracted';
        @mkdir($extractDir, 0755, true);
        $zip->extractTo($extractDir);
        $zip->close();

        return $extractDir;
    }

    /**
     * Remove all files for a specific cycle to free disk space.
     */
    public function cleanupCycle(int $cycle): void
    {
        $cycleDir = "{$this->dataDir}/{$cycle}";
        if (!is_dir($cycleDir)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($cycleDir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $file) {
            $file->isDir() ? rmdir($file->getRealPath()) : unlink($file->getRealPath());
        }
        rmdir($cycleDir);
    }

    public function findTxtInDir(string $dir): ?string
    {
        $files = glob("{$dir}/*.txt") ?: [];
        return $files[0] ?? null;
    }

    public function findCsvInDir(string $dir): ?string
    {
        $files = glob("{$dir}/*.csv") ?: [];
        return $files[0] ?? null;
    }
}
