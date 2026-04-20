<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Read-only public API that backs the static frontend. Everything is served
 * via Doctrine DBAL (no ORM) to keep query cost predictable — these endpoints
 * are fronted by CloudFront so traffic fan-out is the main concern.
 */
#[Route('/api/public')]
final class PublicController extends AbstractController
{
    public function __construct(private readonly Connection $conn)
    {
    }

    #[Route('/stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $documents = (int) $this->conn->fetchOne('SELECT COUNT(*) FROM documents');
        $topics = (int) $this->conn->fetchOne('SELECT COUNT(*) FROM topics');
        $agencies = (int) $this->conn->fetchOne('SELECT COUNT(*) FROM agencies');
        $lastScrape = $this->conn->fetchAssociative(
            'SELECT source, status, rows_added, rows_seen, started_at, finished_at
             FROM scrape_log ORDER BY id DESC LIMIT 1',
        ) ?: null;

        return new JsonResponse([
            'total_documents' => $documents,
            'total_topics' => $topics,
            'total_agencies' => $agencies,
            'last_scrape' => $lastScrape ?: null,
        ]);
    }

    #[Route('/documents', methods: ['GET'])]
    public function listDocuments(Request $request): JsonResponse
    {
        $limit = min(200, max(1, (int) $request->query->get('limit', 50)));
        $page = max(1, (int) $request->query->get('page', 1));
        $offset = ($page - 1) * $limit;
        $topic = (string) $request->query->get('topic', '');
        $agency = (string) $request->query->get('agency', '');
        $source = (string) $request->query->get('source', '');

        $where = [];
        $params = [];
        if ($topic !== '') {
            $where[] = 'topic_slug = :topic';
            $params['topic'] = $topic;
        }
        if ($agency !== '') {
            $where[] = 'agency_slug = :agency';
            $params['agency'] = $agency;
        }
        if ($source !== '') {
            $where[] = 'source = :source';
            $params['source'] = $source;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $total = (int) $this->conn->fetchOne(
            "SELECT COUNT(*) FROM documents $whereSql",
            $params,
        );

        $rows = $this->conn->fetchAllAssociative(
            "SELECT slug, title, summary, source, source_url, pdf_url, topic_slug,
                    agency_slug, classification, released_at, scraped_at
             FROM documents
             $whereSql
             ORDER BY scraped_at DESC, slug ASC
             LIMIT $limit OFFSET $offset",
            $params,
        );

        return new JsonResponse([
            'data' => $rows,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => (int) ceil($total / max($limit, 1)),
        ]);
    }

    #[Route('/documents/{slug}', methods: ['GET'], requirements: ['slug' => '[A-Za-z0-9_-]+'])]
    public function getDocument(string $slug): JsonResponse
    {
        $doc = $this->conn->fetchAssociative(
            'SELECT slug, title, summary, source, external_id, source_url, pdf_url,
                    file_size_bytes, page_count, classification, released_at,
                    topic_slug, agency_slug, scraped_at
             FROM documents WHERE slug = :s',
            ['s' => $slug],
        );
        if (!$doc) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }
        $topic = $doc['topic_slug']
            ? $this->conn->fetchAssociative('SELECT slug, name, description FROM topics WHERE slug = :s', ['s' => $doc['topic_slug']])
            : null;
        $agency = $doc['agency_slug']
            ? $this->conn->fetchAssociative('SELECT slug, name FROM agencies WHERE slug = :s', ['s' => $doc['agency_slug']])
            : null;
        return new JsonResponse([
            'document' => $doc,
            'topic' => $topic ?: null,
            'agency' => $agency ?: null,
        ]);
    }

    #[Route('/topics', methods: ['GET'])]
    public function listTopics(Request $request): JsonResponse
    {
        $limit = min(200, max(1, (int) $request->query->get('limit', 100)));
        $page = max(1, (int) $request->query->get('page', 1));
        $offset = ($page - 1) * $limit;

        $total = (int) $this->conn->fetchOne('SELECT COUNT(*) FROM topics');
        $rows = $this->conn->fetchAllAssociative(
            "SELECT slug, name, description, agency_slug, doc_count, updated_at
             FROM topics
             ORDER BY doc_count DESC, name ASC
             LIMIT $limit OFFSET $offset",
        );
        return new JsonResponse([
            'data' => $rows,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => (int) ceil($total / max($limit, 1)),
        ]);
    }

    #[Route('/topics/{slug}', methods: ['GET'], requirements: ['slug' => '[A-Za-z0-9_-]+'])]
    public function getTopic(string $slug): JsonResponse
    {
        $topic = $this->conn->fetchAssociative(
            'SELECT slug, name, description, agency_slug, doc_count FROM topics WHERE slug = :s',
            ['s' => $slug],
        );
        if (!$topic) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }
        $docs = $this->conn->fetchAllAssociative(
            'SELECT slug, title, source, pdf_url, released_at
             FROM documents WHERE topic_slug = :s
             ORDER BY title ASC LIMIT 200',
            ['s' => $slug],
        );
        return new JsonResponse(['topic' => $topic, 'documents' => $docs]);
    }

    #[Route('/agencies', methods: ['GET'])]
    public function listAgencies(): JsonResponse
    {
        $rows = $this->conn->fetchAllAssociative(
            'SELECT slug, name, description, doc_count FROM agencies ORDER BY doc_count DESC, name ASC',
        );
        return new JsonResponse(['data' => $rows]);
    }

    #[Route('/agencies/{slug}', methods: ['GET'], requirements: ['slug' => '[A-Za-z0-9_-]+'])]
    public function getAgency(string $slug): JsonResponse
    {
        $agency = $this->conn->fetchAssociative(
            'SELECT slug, name, description, doc_count FROM agencies WHERE slug = :s',
            ['s' => $slug],
        );
        if (!$agency) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }
        $topics = $this->conn->fetchAllAssociative(
            'SELECT slug, name, doc_count FROM topics WHERE agency_slug = :s
             ORDER BY doc_count DESC, name ASC LIMIT 200',
            ['s' => $slug],
        );
        return new JsonResponse(['agency' => $agency, 'topics' => $topics]);
    }
}
