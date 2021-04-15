// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Database } from 'better-sqlite3';

/**
 * Updates the DB schema to the current verison, creating and altering the tables.
 */
export default function syncDBSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scribbles (
        scribble_id TEXT PRIMARY KEY NOT NULL,
        title       TEXT UNIQUE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS versions (
      scribble_id TEXT REFERENCES scribbles (scribble_id) ON DELETE CASCADE NOT NULL,
      version_id  TEXT UNIQUE NOT NULL,
      body        TEXT NOT NULL,
      meta        TEXT NOT NULL,
      is_draft    BOOLEAN GENERATED ALWAYS AS (ifnull(json_extract(meta, '$.mn-draft'), false) ) VIRTUAL,
      PRIMARY KEY (scribble_id, version_id)
    );

    CREATE INDEX IF NOT EXISTS is_draft ON versions (is_draft);
  `);
}
