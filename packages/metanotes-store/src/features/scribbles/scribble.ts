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

import { Scribble as ScribbleProto } from '@metanotes/server-api/lib/api_pb';
import Ajv, { JSONSchemaType } from 'ajv';
import yaml from 'js-yaml';

export type ScribbleID = string;

export interface Attributes {
  'content-type': string;
  title?: string;
  tags?: string;

  list?: string;
  'list-before'?: ScribbleID;
  'list-after'?: ScribbleID;
  
  'mn-draft-of'?: ScribbleID;

  [x: string]: string | undefined;
}

export interface ComputedAttributes {
  tags: string[];
  list: string[];
}

export interface Scribble {
  id: ScribbleID;

  body?: string;
  attributes: Attributes;
  computedAttributes: ComputedAttributes;

  status: 'core' | 'syncedMetadataOnly' | 'pullingBody' | 'synced' | 'failed';
  error?: string;
}

export interface SyncedScribble extends Scribble {
  body: string;
  status: 'core' | 'synced';
}

export function isSyncedScribble(scribble: Scribble): scribble is SyncedScribble {
  return scribble.status === 'core' || scribble.status === 'synced';
}

export function fromProto(s: ScribbleProto, metadataOnly: boolean): Scribble {
  const attrs = {} as Attributes;

  s.getAttributesMap().forEach((v, k) => attrs[k] = v);
  const scribble: Scribble = {
    id: s.getId(),
    body: metadataOnly ? undefined : s.getBody(),
    attributes: attrs,
    computedAttributes: {
      tags: [],
      list: []
    },

    status: metadataOnly ? 'syncedMetadataOnly' : 'synced',
  };
  scribble.computedAttributes = recomputeAttributes(scribble);

  return scribble;
}

const ajv = new Ajv();
const TagSchemaDefinition: JSONSchemaType<string[]> = {
  // "$schema": "https://json-schema.org/draft/2019-09/schema",
  // "$id": "https://metanotes.org/schemas/v1/tag.schema.json",
  // "title": "Metanotes tag attribute",
  "type": "array",
  "items": {
    "type": "string",
  }
};
const TagSchema = ajv.compile(TagSchemaDefinition);

const ListSchemaDefinition: JSONSchemaType<string[]> = {
  // "$schema": "https://json-schema.org/draft/2019-09/schema",
  // "$id": "https://metanotes.org/schemas/v1/tag.schema.json",
  // "title": "Metanotes list attribute",
  "type": "array",
  "items": {
    "type": "string",
  }
};
const ListSchema = ajv.compile(ListSchemaDefinition);


export function recomputeAttributes(scribble: Scribble): ComputedAttributes {
  let tags = [] as string[];
  let list = [] as string[];

  const scribbleTags = scribble.attributes.tags;
  if (scribbleTags) {
    const tagsData = yaml.safeLoad(scribbleTags) as unknown;
    if (TagSchema(tagsData)) {
      tags = tagsData;
    } else {
      console.error(`scribble ${scribble.id} has incorrectly formatted tags field:`, tagsData);
    }
  }

  const scribbleList = scribble.attributes.list;
  if (scribbleList) {
    const listData = yaml.safeLoad(scribbleList) as unknown;
    if (ListSchema(listData)) {
      list = listData;
    } else {
      console.error(`scribble ${scribble.id} has incorrectly formatted list field:`, listData);
    }
  }

  return {
    tags,
    list,
  };
}
