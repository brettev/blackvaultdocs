<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;

final class FecDataLoader
{
    private const STATE_NAMES = [
        'AL' => 'Alabama', 'AK' => 'Alaska', 'AZ' => 'Arizona', 'AR' => 'Arkansas',
        'CA' => 'California', 'CO' => 'Colorado', 'CT' => 'Connecticut', 'DE' => 'Delaware',
        'FL' => 'Florida', 'GA' => 'Georgia', 'HI' => 'Hawaii', 'ID' => 'Idaho',
        'IL' => 'Illinois', 'IN' => 'Indiana', 'IA' => 'Iowa', 'KS' => 'Kansas',
        'KY' => 'Kentucky', 'LA' => 'Louisiana', 'ME' => 'Maine', 'MD' => 'Maryland',
        'MA' => 'Massachusetts', 'MI' => 'Michigan', 'MN' => 'Minnesota', 'MS' => 'Mississippi',
        'MO' => 'Missouri', 'MT' => 'Montana', 'NE' => 'Nebraska', 'NV' => 'Nevada',
        'NH' => 'New Hampshire', 'NJ' => 'New Jersey', 'NM' => 'New Mexico', 'NY' => 'New York',
        'NC' => 'North Carolina', 'ND' => 'North Dakota', 'OH' => 'Ohio', 'OK' => 'Oklahoma',
        'OR' => 'Oregon', 'PA' => 'Pennsylvania', 'RI' => 'Rhode Island', 'SC' => 'South Carolina',
        'SD' => 'South Dakota', 'TN' => 'Tennessee', 'TX' => 'Texas', 'UT' => 'Utah',
        'VT' => 'Vermont', 'VA' => 'Virginia', 'WA' => 'Washington', 'WV' => 'West Virginia',
        'WI' => 'Wisconsin', 'WY' => 'Wyoming', 'DC' => 'District of Columbia',
        'PR' => 'Puerto Rico', 'GU' => 'Guam', 'VI' => 'Virgin Islands', 'AS' => 'American Samoa',
        'MP' => 'Northern Mariana Islands',
    ];

    private const PARTY_NAMES = [
        'DEM' => 'Democratic', 'REP' => 'Republican', 'LIB' => 'Libertarian',
        'GRE' => 'Green', 'IND' => 'Independent', 'CON' => 'Constitution',
        'OTH' => 'Other', 'NNE' => 'None', 'UNK' => 'Unknown',
    ];

    public function __construct(private readonly Connection $conn)
    {
    }

    public function loadCandidates(string $filePath, int $cycle): int
    {
        $rows = 0;
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return 0;
        }

        $this->conn->executeStatement('DELETE FROM fec_candidate WHERE cycle = ?', [$cycle]);

        $this->conn->beginTransaction();
        try {
            while (($line = fgets($handle)) !== false) {
                $cols = explode('|', rtrim($line, "\r\n"));
                if (\count($cols) < 15) {
                    continue;
                }

                $this->conn->executeStatement(
                    'INSERT INTO fec_candidate (cand_id, cycle, name, party, election_year, state, office, district, incumbent_challenger, status, committee_id, city, state_addr, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE name=VALUES(name), party=VALUES(party), election_year=VALUES(election_year),
                       state=VALUES(state), office=VALUES(office), district=VALUES(district),
                       incumbent_challenger=VALUES(incumbent_challenger), status=VALUES(status),
                       committee_id=VALUES(committee_id), city=VALUES(city), state_addr=VALUES(state_addr), updated_at=NOW()',
                    [
                        $cols[0],
                        $cycle,
                        $cols[1],
                        $cols[2] ?? null,
                        (int) ($cols[3] ?? 0),
                        $cols[4] ?? null,
                        $cols[5] ?? null,
                        $cols[6] ?? null,
                        $cols[7] ?? null,
                        $cols[8] ?? null,
                        $cols[9] ?? null,
                        $cols[12] ?? null,
                        $cols[13] ?? null,
                    ]
                );
                $rows++;
            }
            $this->conn->commit();
        } catch (\Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
        fclose($handle);

        return $rows;
    }

    public function loadCandidateSummary(string $csvPath, int $cycle): int
    {
        $rows = 0;
        $handle = fopen($csvPath, 'r');
        if (!$handle) {
            return 0;
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return 0;
        }
        $headerMap = array_flip(array_map('strtolower', $header));

        while (($row = fgetcsv($handle)) !== false) {
            $get = fn(string $col) => $row[$headerMap[$col] ?? -1] ?? null;
            $candId = $get('cand_id');
            if (!$candId) {
                continue;
            }

            $this->conn->executeStatement(
                'UPDATE fec_candidate SET
                    total_receipts = ?, total_disbursements = ?, cash_on_hand = ?,
                    individual_contributions = ?, pac_contributions = ?,
                    debts_owed = ?, party_contributions = ?, updated_at = NOW()
                 WHERE cand_id = ? AND cycle = ?',
                [
                    (float) ($get('total_receipt') ?: $get('total_receipts') ?: 0),
                    (float) ($get('total_disbursement') ?: $get('total_disbursements') ?: 0),
                    (float) ($get('cash_on_hand_cop') ?: $get('cash_on_hand') ?: $get('coh_cop') ?: 0),
                    (float) ($get('individual_contribution') ?: $get('individual_contributions') ?: 0),
                    (float) ($get('other_committee_contribution') ?: $get('other_political_committee_contributions') ?: 0),
                    (float) ($get('debt_owed_by_committee') ?: $get('debts_owed_by') ?: 0),
                    (float) ($get('party_committee_contribution') ?: $get('political_party_contributions') ?: 0),
                    $candId,
                    $cycle,
                ]
            );
            $rows++;
        }
        fclose($handle);

        return $rows;
    }

    public function loadCommittees(string $filePath, int $cycle): int
    {
        $rows = 0;
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return 0;
        }

        $this->conn->executeStatement('DELETE FROM fec_committee WHERE cycle = ?', [$cycle]);

        $this->conn->beginTransaction();
        try {
            while (($line = fgets($handle)) !== false) {
                $cols = explode('|', rtrim($line, "\r\n"));
                if (\count($cols) < 15) {
                    continue;
                }

                $designation = $cols[8] ?? '';
                $type = $cols[9] ?? '';
                $isSuperPac = ($type === 'O' && $designation === 'U') ? 1 : 0;

                $this->conn->executeStatement(
                    'INSERT INTO fec_committee (cmte_id, cycle, name, treasurer, city, state, zip_code, designation, type, party, filing_freq, org_type, connected_org, candidate_id, is_super_pac, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE name=VALUES(name), treasurer=VALUES(treasurer), city=VALUES(city),
                       state=VALUES(state), zip_code=VALUES(zip_code), designation=VALUES(designation), type=VALUES(type),
                       party=VALUES(party), filing_freq=VALUES(filing_freq), org_type=VALUES(org_type),
                       connected_org=VALUES(connected_org), candidate_id=VALUES(candidate_id),
                       is_super_pac=VALUES(is_super_pac), updated_at=NOW()',
                    [
                        $cols[0],
                        $cycle,
                        $cols[1],
                        $cols[2] ?? null,
                        $cols[5] ?? null,
                        $cols[6] ?? null,
                        $cols[7] ?? null,
                        $designation,
                        $type,
                        $cols[10] ?? null,
                        $cols[11] ?? null,
                        $cols[12] ?? null,
                        $cols[13] ?? null,
                        $cols[14] ?? null,
                        $isSuperPac,
                    ]
                );
                $rows++;
            }
            $this->conn->commit();
        } catch (\Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
        fclose($handle);

        return $rows;
    }

    public function loadCommitteeSummary(string $csvPath, int $cycle): int
    {
        $rows = 0;
        $handle = fopen($csvPath, 'r');
        if (!$handle) {
            return 0;
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return 0;
        }
        $headerMap = array_flip(array_map('strtolower', $header));

        while (($row = fgetcsv($handle)) !== false) {
            $get = fn(string $col) => $row[$headerMap[$col] ?? -1] ?? null;
            $cmteId = $get('cmte_id') ?: $get('committee_id') ?: null;
            if (!$cmteId) {
                continue;
            }

            $this->conn->executeStatement(
                'UPDATE fec_committee SET
                    total_receipts = ?, total_disbursements = ?, cash_on_hand = ?,
                    debts_owed = ?, ind_contributions = ?, contrib_to_committees = ?,
                    ind_expenditures = ?, updated_at = NOW()
                 WHERE cmte_id = ? AND cycle = ?',
                [
                    (float) ($get('ttl_receipts') ?: $get('total_receipts') ?: 0),
                    (float) ($get('ttl_disb') ?: $get('total_disbursements') ?: 0),
                    (float) ($get('coh_cop') ?: $get('cash_on_hand') ?: 0),
                    (float) ($get('debts_owed_by_cmte') ?: $get('debts_owed_by') ?: 0),
                    (float) ($get('indv_contb') ?: $get('indv_contrib') ?: $get('individual_contributions') ?: 0),
                    (float) ($get('tranf_to_other_auth_cmte') ?: $get('contributions_to_committees') ?: 0),
                    (float) ($get('indt_exp') ?: $get('independent_expenditures') ?: 0),
                    $cmteId,
                    $cycle,
                ]
            );
            $rows++;
        }
        fclose($handle);

        return $rows;
    }

    public function loadIndividualContributions(string $filePath, int $cycle): int
    {
        $this->conn->executeStatement('DELETE FROM fec_individual_contribution WHERE cycle = ?', [$cycle]);

        $in = fopen($filePath, 'r');
        if (!$in) {
            return 0;
        }

        $rows = 0;
        $batch = [];
        $batchSize = 1000;
        $commitEvery = 50000;
        $sinceCommit = 0;

        $this->conn->beginTransaction();

        try {
            while (($line = fgets($in)) !== false) {
                $cols = explode('|', rtrim($line, "\r\n"));
                if (\count($cols) < 21) {
                    continue;
                }
                $subId = $cols[20] ?? '';
                if (!$subId || !is_numeric($subId)) {
                    continue;
                }
                $date = $this->parseFecDate($cols[13] ?? '');

                $batch[] = [
                    (int) $subId, $cycle, $cols[0], $cols[1] ?? '', $cols[2] ?? '', $cols[3] ?? '',
                    $cols[4] ?? '', $cols[5] ?? '', $cols[6] ?? '', $cols[7] ?? '',
                    $cols[8] ?? '', $cols[9] ?? '', $cols[10] ?? '', $cols[11] ?? '',
                    $cols[12] ?? '', $date, (float) ($cols[14] ?? 0), $cols[15] ?? '',
                    $cols[16] ?? '', (int) ($cols[17] ?? 0), $cols[18] ?? '', $cols[19] ?? '',
                ];

                if (\count($batch) >= $batchSize) {
                    $this->insertIndivBatch($batch);
                    $rows += \count($batch);
                    $sinceCommit += \count($batch);
                    $batch = [];

                    if ($sinceCommit >= $commitEvery) {
                        $this->conn->commit();
                        $this->conn->beginTransaction();
                        $sinceCommit = 0;
                    }
                }
            }
            if ($batch) {
                $this->insertIndivBatch($batch);
                $rows += \count($batch);
            }
            $this->conn->commit();
        } catch (\Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
        fclose($in);

        return $rows;
    }

    private function insertIndivBatch(array $batch): void
    {
        $placeholders = [];
        $params = [];
        foreach ($batch as $row) {
            $placeholders[] = '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
            foreach ($row as $val) {
                $params[] = $val;
            }
        }
        $this->conn->executeStatement(
            'INSERT IGNORE INTO fec_individual_contribution
             (sub_id, cycle, cmte_id, amndt_ind, rpt_tp, transaction_pgi, image_num,
              transaction_tp, entity_tp, name, city, state, zip_code, employer,
              occupation, transaction_dt, transaction_amt, other_id, tran_id,
              file_num, memo_cd, memo_text)
             VALUES ' . implode(',', $placeholders),
            $params
        );
    }

    public function loadIndependentExpenditures(string $csvPath, int $cycle): int
    {
        $rows = 0;
        $handle = fopen($csvPath, 'r');
        if (!$handle) {
            return 0;
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return 0;
        }
        $headerMap = array_flip(array_map('strtolower', array_map('trim', $header)));

        $this->conn->executeStatement('DELETE FROM fec_independent_expenditure WHERE cycle = ?', [$cycle]);

        $batch = [];
        while (($row = fgetcsv($handle)) !== false) {
            $get = fn(string $col) => trim($row[$headerMap[$col] ?? -1] ?? '');

            $batch[] = [
                $cycle,
                $get('can_id') ?: $get('cand_id') ?: null,
                $get('can_nam') ?: $get('cand_name') ?: null,
                $get('spe_id') ?: $get('spender_id') ?: null,
                $get('spe_nam') ?: $get('spender_name') ?: null,
                $get('ele_typ') ?: null,
                $get('can_off') ?: null,
                $get('can_off_sta') ?: null,
                $get('can_off_dis') ?: null,
                $get('can_par_aff') ?: null,
                (float) ($get('exp_amo') ?: $get('amount') ?: 0),
                $this->parseFecDate($get('exp_dat') ?: $get('date') ?: '') ?: null,
                $get('pur') ?: $get('purpose') ?: null,
                $get('pay') ?: $get('payee') ?: null,
                $get('sup_opp') ?: null,
                $get('tra_id') ?: null,
                (int) ($get('fil_num') ?: 0) ?: null,
                $get('amn_ind') ?: null,
                $get('ima_num') ?: null,
            ];

            if (\count($batch) >= 500) {
                $this->insertIndExpBatch($batch);
                $rows += \count($batch);
                $batch = [];
            }
        }
        if ($batch) {
            $this->insertIndExpBatch($batch);
            $rows += \count($batch);
        }
        fclose($handle);

        return $rows;
    }

    private function insertIndExpBatch(array $batch): void
    {
        $placeholders = [];
        $params = [];
        foreach ($batch as $row) {
            $placeholders[] = '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
            foreach ($row as $val) {
                $params[] = $val;
            }
        }
        $this->conn->executeStatement(
            'INSERT INTO fec_independent_expenditure
             (cycle, cand_id, cand_name, spender_id, spender_name, election_type, cand_office,
              cand_office_st, cand_office_district, cand_party, amount, date_received,
              purpose, payee, support_oppose, transaction_id, file_num, amndt_ind, image_num)
             VALUES ' . implode(',', $placeholders),
            $params
        );
    }

    /**
     * Rebuild all aggregate tables from loaded multi-cycle data.
     * Aggregates span ALL loaded cycles unless $cycleFilter is set.
     */
    public function rebuildAggregates(?int $cycleFilter = null): void
    {
        $now = date('Y-m-d H:i:s');
        $cycleWhere = $cycleFilter ? "AND cycle = {$cycleFilter}" : '';
        $candCycleWhere = $cycleFilter ? "WHERE cycle = {$cycleFilter}" : '';
        $indivCycleWhere = $cycleFilter
            ? "WHERE cycle = {$cycleFilter} AND name IS NOT NULL AND name != '' AND transaction_amt > 0"
            : "WHERE name IS NOT NULL AND name != '' AND transaction_amt > 0";

        // --- Donor aggregates (all-time) ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_donor');
        $this->conn->executeStatement("
            INSERT INTO agg_donor (name, slug, total, contributions, city, state, employer, occupation, first_cycle, last_cycle, cycles_active, updated_at)
            SELECT name,
                   LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(name), ' ', '-'), ',', ''), '.', ''), '''', '')),
                   SUM(transaction_amt), COUNT(*),
                   SUBSTRING_INDEX(GROUP_CONCAT(city ORDER BY transaction_amt DESC), ',', 1),
                   SUBSTRING_INDEX(GROUP_CONCAT(state ORDER BY transaction_amt DESC), ',', 1),
                   SUBSTRING_INDEX(GROUP_CONCAT(employer ORDER BY transaction_amt DESC), ',', 1),
                   SUBSTRING_INDEX(GROUP_CONCAT(occupation ORDER BY transaction_amt DESC), ',', 1),
                   MIN(cycle), MAX(cycle), COUNT(DISTINCT cycle),
                   '{$now}'
            FROM fec_individual_contribution
            {$indivCycleWhere}
            GROUP BY name
            HAVING SUM(transaction_amt) >= 1000
            ORDER BY SUM(transaction_amt) DESC
        ");

        // --- Donor per-cycle history ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_donor_history');
        $this->conn->executeStatement("
            INSERT INTO agg_donor_history (donor_slug, cycle, total, contributions, committees_supported, top_recipient, updated_at)
            SELECT d.slug, ic.cycle, SUM(ic.transaction_amt), COUNT(*), COUNT(DISTINCT ic.cmte_id),
                   SUBSTRING_INDEX(GROUP_CONCAT(ic.cmte_id ORDER BY ic.transaction_amt DESC), ',', 1),
                   '{$now}'
            FROM fec_individual_contribution ic
            JOIN agg_donor d ON d.name = ic.name
            WHERE ic.transaction_amt > 0
            GROUP BY d.slug, ic.cycle
        ");

        // --- Donor → committee linkage ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_donor_committee');
        $this->conn->executeStatement("
            INSERT INTO agg_donor_committee (donor_slug, cmte_id, amount)
            SELECT d.slug, ic.cmte_id, SUM(ic.transaction_amt)
            FROM fec_individual_contribution ic
            JOIN agg_donor d ON d.name = ic.name
            WHERE ic.transaction_amt > 0
            GROUP BY d.slug, ic.cmte_id
            HAVING SUM(ic.transaction_amt) >= 200
        ");

        // --- State candidate aggregates (use latest cycle per candidate) ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_state_candidate');
        $this->conn->executeStatement("
            INSERT INTO agg_state_candidate (code, candidates, total_raised, top_candidate, top_amount, dem_raised, rep_raised, other_raised, updated_at)
            SELECT c.state, COUNT(DISTINCT c.cand_id), SUM(c.total_receipts),
                   SUBSTRING_INDEX(GROUP_CONCAT(c.name ORDER BY c.total_receipts DESC), ',', 1),
                   MAX(c.total_receipts),
                   SUM(CASE WHEN c.party = 'DEM' THEN c.total_receipts ELSE 0 END),
                   SUM(CASE WHEN c.party = 'REP' THEN c.total_receipts ELSE 0 END),
                   SUM(CASE WHEN c.party NOT IN ('DEM','REP') THEN c.total_receipts ELSE 0 END),
                   '{$now}'
            FROM fec_candidate c
            INNER JOIN (
                SELECT cand_id, MAX(cycle) AS max_cycle FROM fec_candidate GROUP BY cand_id
            ) latest ON c.cand_id = latest.cand_id AND c.cycle = latest.max_cycle
            WHERE c.state IS NOT NULL AND c.state != '' AND LENGTH(c.state) = 2
            GROUP BY c.state
        ");

        // --- State donation aggregates ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_state_donation');
        $this->conn->executeStatement("
            INSERT INTO agg_state_donation (code, name, total_donated, contributions, donors, updated_at)
            SELECT state, state,
                   SUM(transaction_amt), COUNT(*), COUNT(DISTINCT name),
                   '{$now}'
            FROM fec_individual_contribution
            WHERE state IS NOT NULL AND state != '' AND LENGTH(state) = 2 AND transaction_amt > 0
            GROUP BY state
        ");
        foreach (self::STATE_NAMES as $code => $name) {
            $this->conn->executeStatement("UPDATE agg_state_donation SET name = ? WHERE code = ?", [$name, $code]);
        }

        // --- City aggregates ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_city');
        $this->conn->executeStatement("
            INSERT INTO agg_city (name, state, total, contributions, updated_at)
            SELECT city, state, SUM(transaction_amt), COUNT(*), '{$now}'
            FROM fec_individual_contribution
            WHERE city IS NOT NULL AND city != '' AND state IS NOT NULL AND LENGTH(state) = 2 AND transaction_amt > 0
            GROUP BY city, state
            HAVING SUM(transaction_amt) >= 10000
            ORDER BY SUM(transaction_amt) DESC
        ");

        // --- Party aggregates (latest cycle per candidate) ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_party');
        $this->conn->executeStatement("
            INSERT INTO agg_party (code, name, candidates, total_raised, top_candidate, updated_at)
            SELECT c.party, c.party, COUNT(DISTINCT c.cand_id), SUM(c.total_receipts),
                   SUBSTRING_INDEX(GROUP_CONCAT(c.name ORDER BY c.total_receipts DESC), ',', 1),
                   '{$now}'
            FROM fec_candidate c
            INNER JOIN (
                SELECT cand_id, MAX(cycle) AS max_cycle FROM fec_candidate GROUP BY cand_id
            ) latest ON c.cand_id = latest.cand_id AND c.cycle = latest.max_cycle
            WHERE c.party IS NOT NULL AND c.party != ''
            GROUP BY c.party
        ");
        foreach (self::PARTY_NAMES as $code => $name) {
            $this->conn->executeStatement("UPDATE agg_party SET name = ? WHERE code = ?", [$name, $code]);
        }

        // --- Industry aggregates ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_industry');
        $this->conn->executeStatement("
            INSERT INTO agg_industry (industry, total, contributions, donors, top_employer, updated_at)
            SELECT employer, SUM(transaction_amt), COUNT(*), COUNT(DISTINCT name),
                   employer, '{$now}'
            FROM fec_individual_contribution
            WHERE employer IS NOT NULL AND employer != '' AND transaction_amt > 0
            GROUP BY employer
            HAVING SUM(transaction_amt) >= 50000
            ORDER BY SUM(transaction_amt) DESC
        ");

        // --- Occupation aggregates ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_occupation');
        $this->conn->executeStatement("
            INSERT INTO agg_occupation (occupation, total, contributions, donors, updated_at)
            SELECT occupation, SUM(transaction_amt), COUNT(*), COUNT(DISTINCT name), '{$now}'
            FROM fec_individual_contribution
            WHERE occupation IS NOT NULL AND occupation != '' AND transaction_amt > 0
            GROUP BY occupation
            HAVING SUM(transaction_amt) >= 50000
            ORDER BY SUM(transaction_amt) DESC
        ");

        // --- ZIP code aggregates ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_zip_code');
        $this->conn->executeStatement("
            INSERT INTO agg_zip_code (zip5, total, contributions, donors, top_candidate, updated_at)
            SELECT LEFT(zip_code, 5), SUM(transaction_amt), COUNT(*), COUNT(DISTINCT name), '', '{$now}'
            FROM fec_individual_contribution
            WHERE zip_code IS NOT NULL AND LENGTH(zip_code) >= 5 AND transaction_amt > 0
            GROUP BY LEFT(zip_code, 5)
            HAVING SUM(transaction_amt) >= 5000
            ORDER BY SUM(transaction_amt) DESC
        ");

        // --- Candidate history (per-cycle fundraising) ---
        $this->conn->executeStatement('TRUNCATE TABLE agg_candidate_history');
        $this->conn->executeStatement("
            INSERT INTO agg_candidate_history (cand_id, cycle, name, party, office, state, total_receipts, total_disbursements, individual_contributions, pac_contributions, updated_at)
            SELECT cand_id, cycle, name, party, office, state, total_receipts, total_disbursements, individual_contributions, pac_contributions, '{$now}'
            FROM fec_candidate
            WHERE total_receipts > 0
        ");
    }

    private function parseFecDate(string $raw): ?string
    {
        $raw = trim($raw);
        if (\strlen($raw) === 8 && ctype_digit($raw)) {
            $m = substr($raw, 0, 2);
            $d = substr($raw, 2, 2);
            $y = substr($raw, 4, 4);
            if (checkdate((int) $m, (int) $d, (int) $y)) {
                return "{$y}-{$m}-{$d}";
            }
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            return $raw;
        }
        return null;
    }
}
