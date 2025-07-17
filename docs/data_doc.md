# NFL Historical Data Sources

This document outlines free sources for historical NFL data, focusing on player and team stats. Sources were selected for reliability, ease of access, and no-cost options to support bootstrapping efforts. Data includes player performance (e.g., passing yards, touchdowns), team stats (e.g., wins, points), and play-by-play details. Reliability is assessed based on data accuracy, update frequency, and community trust. Extraction methods prioritize free tools/APIs to avoid paid services.

Sources are listed in order of recommendation (most reliable and comprehensive first).

## 1. Pro-Football-Reference (PFR)

- **Source**: https://www.pro-football-reference.com/ (part of Sports-Reference network).
- **Reliability**: High – Official stats sourced from NFL, used by analysts and media. Data is accurate, comprehensive, and regularly updated (weekly during season, historical back to 1920). Trusted by fantasy communities and researchers.
- **Method of Extracting Data**:
  - Free web scraping using Python (e.g., BeautifulSoup or pandas.read_html for tables).
  - Alternative: Use community libraries like nflfastR (R) or sportsipy (Python) for programmatic access without scraping.
  - No official API, but CSV exports available on some pages (e.g., player stats). Avoid heavy scraping to comply with ToS.
- **Available Data**:
  - Player stats: Career/seasonal (passing, rushing, receiving, defense; e.g., yards, TDs, interceptions).
  - Team stats: Season records, schedules, standings, advanced metrics (e.g., DVOA).
  - Game logs, box scores, play-by-play (limited free).
  - Historical from 1920+; searchable by year, player, team.

## 2. nflfastR

- **Source**: https://github.com/guga31bb/nflfastR (open-source R package; data from NFL's official feeds).
- **Reliability**: High – Maintained by data scientists, sourced directly from NFL APIs. Play-by-play data accurate from 1999 onward; updated weekly. Used in academic research and fantasy tools.
- **Method of Extracting Data**:
  - Install via R: `install.packages("nflfastR")`.
  - Use functions like `load_pbp()` to download CSVs or data frames directly (no scraping needed).
  - Python wrapper available via nfl_data_py (pip install nfl-data-py).
  - Fully free and automated; data is pre-processed for analysis.
- **Available Data**:
  - Play-by-play: Every play since 1999 (e.g., passer, rusher, receiver stats; game situations).
  - Player stats: Derived from plays (e.g., EPA, success rates).
  - Team stats: Game outcomes, drives, advanced analytics.
  - Rosters, schedules, injuries (integrated).

## 3. NFL.com Official Data (via Scraping or Datasets)

- **Source**: https://www.nfl.com/stats/ and Kaggle datasets (e.g., https://www.kaggle.com/datasets/crawford/nfl-teams).
- **Reliability**: Very High – Direct from NFL. Official stats are authoritative, but historical depth varies (focus on recent seasons). Kaggle versions are community-curated and reliable for bulk downloads.
- **Method of Extracting Data**:
  - Scrape with Python/Selenium for dynamic pages (e.g., stats tables).
  - Download free CSVs from Kaggle (search "NFL historical stats").
  - Unofficial APIs like those in GitHub repos (e.g., nfl-api) for JSON pulls, but use cautiously.
- **Available Data**:
  - Player stats: Weekly/seasonal (e.g., QB ratings, rushing yards).
  - Team stats: Standings, scores, advanced metrics (e.g., points allowed).
  - Historical from ~2000+; includes fantasy-relevant data like targets and red-zone stats.

## 4. Sports-Reference API (Limited Free)

- **Source**: https://sports-reference.com/ (includes NFL data via Pro-Football-Reference integration).
- **Reliability**: High – Same as PFR; accurate and well-maintained. Free tier is limited but sufficient for bootstrapping.
- **Method of Extracting Data**:
  - Use Python library sportsreference (pip install sportsreference) for API-like access.
  - Free queries up to a limit; fallback to scraping if exceeded.
- **Available Data**:
  - Similar to PFR: Player bios, stats, team rosters, box scores.
  - Historical depth to 1920; includes college-to-pro transitions.

## 5. Kaggle NFL Datasets

- **Source**: https://www.kaggle.com/search?q=nfl+historical (various community datasets).
- **Reliability**: Medium-High – Depends on uploader (e.g., official scrapes from NFL/PFR are reliable). Check update dates and ratings. Not real-time but great for historical bulk data.
- **Method of Extracting Data**:
  - Download CSVs directly from Kaggle (free account required).
  - Import into Python/R with pandas/read.csv for analysis.
- **Available Data**:
  - Comprehensive sets: Player stats (e.g., 100+ years of passing/rushing), team performance, weather impacts, injuries.
  - Examples: "NFL Play-by-Play 2009-2018" or "NFL Team Stats 2002-2023".

## 6. Daily Fantasy Sports (DFS) and Best Ball Data Sources

This section focuses on free sources for DFS data, with an emphasis on Best Ball competitions (e.g., on DraftKings, FanDuel, Underdog). Data includes ADP (Average Draft Position), projections, contest results, and historical picks. Sources prioritize free access for bootstrapping.

### 6.1 FantasyData (Limited Free Tier)

- **Source**: https://fantasydata.com/ (provides NFL stats, projections, and DFS tools).
- **Reliability**: High – Sourced from official NFL feeds; used by DFS players. Free tier offers basic stats and news; premium for advanced (but free elements are reliable and updated daily during season).
- **Method of Extracting Data**:
  - Free web scraping of public pages (e.g., leaderboards, player news) using Python (BeautifulSoup/Selenium).
  - Download free CSVs from articles or use community scripts; avoid heavy automation to comply with ToS.
- **Available Data**:
  - Player projections (e.g., fantasy points, matchups) for DFS/Best Ball.
  - Historical stats, injury reports, odds.
  - Best Ball-relevant: ADP trends, weekly leaders; historical from recent seasons.

### 6.2 BestBallData

- **Source**: https://bestballdata.com/ (community-driven site for Best Ball analytics).
- **Reliability**: Medium-High – Aggregates from DraftKings/Underdog; updated seasonally. Community-verified, but not official; good for trends.
- **Method of Extracting Data**:
  - Download free CSVs or use their public API endpoints (limited free queries).
  - Scrape tables with Python (pandas.read_html).
- **Available Data**:
  - Best Ball ADP, ownership rates, historical draft picks (e.g., from DraftKings Millionaire contests).
  - Projections, win rates; focuses on NFL Best Ball from 2018+.

### 6.3 FantasyPros

- **Source**: https://www.fantasypros.com/nfl/ (free fantasy tools section).
- **Reliability**: High – Consensus data from experts; updated weekly. Trusted for DFS/Best Ball prep.
- **Method of Extracting Data**:
  - Free scraping of ADP/projection tables or download CSVs from reports.
  - Use Python libraries like sportsipy for integration.
- **Available Data**:
  - Consensus ADP for Best Ball (DraftKings/FanDuel formats).
  - Player rankings, projections (e.g., points, value); historical trends.

### 6.4 Kaggle DFS/Best Ball Datasets

- **Source**: https://www.kaggle.com/search?q=best+ball+or+dfs+nfl (community datasets).
- **Reliability**: Medium – User-uploaded, but many are scraped from DraftKings/Underdog. Check ratings for accuracy; historical focus.
- **Method of Extracting Data**:
  - Direct CSV downloads (free).
- **Available Data**:
  - Historical Best Ball drafts (picks, rooms), ADP, contest results (e.g., "DraftKings Best Ball 2023 Data").

## Additional Notes

- **Free Focus**: All sources are 100% free; avoid paid APIs like FantasyData or Sportradar for now.
- **Ethical/Legal**: Respect robots.txt and ToS when scraping. Use for personal/analytics purposes only.
- **Enhancing Your App**: Integrate via scripts to pull data into DuckDB/Polars (as in your backend). For real-time, combine with unofficial DraftKings APIs.
- **Updates**: Check sources periodically; nflfastR updates seasonally.

Last updated: [Current Date]. Research based on web searches and community resources.
