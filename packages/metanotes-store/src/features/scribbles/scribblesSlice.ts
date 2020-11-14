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

import { createAsyncThunk, createEntityAdapter, createSlice, EntityState, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { StorageAPI } from '../../api';
import { Attributes, recomputeAttributes, Scribble, ScribbleID } from './scribble';


export interface ScribblesState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  titleToIdMap: {[key: string]: string[]};
  scribbles: EntityState<Scribble>;
}

export const scribblesAdapter = createEntityAdapter<Scribble>({
  selectId: (scribble) => scribble.id,
  sortComparer: (a, b) => a.id.localeCompare(b.id),
});

const initialState: ScribblesState = {
  status: 'idle',
  error: null,
  titleToIdMap: {},
  scribbles: scribblesAdapter.getInitialState(),
};

export const fetchStoreMetadata = createAsyncThunk<Scribble[], void, {extra: StorageAPI}>('scribbles/fetchStoreMetadata', async (_, { extra }) => {
  return await extra.getAllMetadata();
});

export const fetchScribble = createAsyncThunk<Scribble, Scribble, { extra: StorageAPI }>('scribbles/fetchScribble', async (payload, { extra }) => {
  return await extra.getScribble(payload.id);
});

export function updateTitleMapAdd(state: ScribblesState, scribbles: Scribble[]): void {
  for (const sc of scribbles) {
    const title = sc.attributes['title'];
    const id = sc.id;
    if (!title) {
      continue;
    }

    const existingIds = state.titleToIdMap[title];
    if (existingIds === undefined) {
      state.titleToIdMap[title] = [id];
      continue;
    }
    if (existingIds.find(i => i === id)) {
      continue;
    }
    existingIds.push(id);
  }
}

function updateTitleMapRemove(state: ScribblesState, scribbles: Scribble[]) {
  for (const sc of scribbles) {
    const title = sc.attributes['title'];
    const id = sc.id;
    if (!title) {
      continue;
    }

    const existingIds = state.titleToIdMap[title];
    state.titleToIdMap[title] = existingIds.filter(i => i !== id);
  }
}

const scribblesSlice = createSlice({
  name: 'scribbles',
  initialState,
  reducers: {
    setCoreScribbles(state, action: PayloadAction<Scribble[]>) {
      const scribbles = action.payload;
      for (const s of scribbles) {
        s.computedAttributes = recomputeAttributes(s);
      }
      scribblesAdapter.upsertMany(state.scribbles, action.payload);
      updateTitleMapAdd(state, action.payload);
    },
    createDraft(state, action: PayloadAction<{ id: ScribbleID, newId: ScribbleID }>) {
      const { id, newId } = action.payload;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const oldScribble = selectScribbleById({ scribbles: state }, id)!;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const newScribble = JSON.parse(JSON.stringify(oldScribble)) as Scribble;
      newScribble.id = newId;
      newScribble.attributes['mn-draft-of'] = id;
      newScribble.status = 'synced';
      newScribble.computedAttributes = recomputeAttributes(newScribble);
      scribblesAdapter.addOne(state.scribbles, newScribble);
    },
    createDraftScribble(state, action: PayloadAction<Scribble>) {
      // TODO: this doesn't create a "draft" per se. The API needs to be revisited and the surface reduced.
      const scribble = action.payload;
      scribble.computedAttributes = recomputeAttributes(scribble);
      scribblesAdapter.addOne(state.scribbles, scribble);
    },
    updateScribbleBody(state, action: PayloadAction<{ id: ScribbleID, body: string }>) {
      const { id, body } = action.payload;
      scribblesAdapter.updateOne(state.scribbles, {
        id,
        changes: {
          body,
        }
      });
    },
    updateScribbleAttributes(state, action: PayloadAction<{ id: ScribbleID, attributes: Partial<Attributes> }>) {
      const { id, attributes } = action.payload;
      const scribble = selectScribbleById({ scribbles: state }, id)!;
      const newScribble = JSON.parse(JSON.stringify(scribble)) as Scribble;
      newScribble.attributes = {
        ...newScribble.attributes,
        ...attributes,
      };
      const changes = {
        attributes: {
          ...scribble.attributes,
          ...attributes,
        },
        computedAttributes: recomputeAttributes(newScribble),
      };
      scribblesAdapter.updateOne(state.scribbles, {
        id,
        changes,
      });
    },
    removeScribbleAttributes(state, action: PayloadAction<{ id: ScribbleID, attributes: string[] }>) {
      const { id, attributes } = action.payload;
      const scribble = selectScribbleById({ scribbles: state }, id)!;
      const newScribble = JSON.parse(JSON.stringify(scribble)) as Scribble;
      for (const a of attributes) {
        delete newScribble.attributes[a];
      }
      
      const changes = {
        attributes: newScribble.attributes,
        computedAttributes: recomputeAttributes(newScribble),
      };
      scribblesAdapter.updateOne(state.scribbles, {
        id,
        changes,
      });
    },
    removeScribble(state, action: PayloadAction<ScribbleID>) {
      scribblesAdapter.removeOne(state.scribbles, action.payload);
    },
    commitDraft(state, action: PayloadAction<ScribbleID>) {
      const draftScribble = selectScribbleById({ scribbles: state }, action.payload)!;
      const originalScribbleId = draftScribble.attributes['mn-draft-of']!;
      const draftScribbleId = draftScribble.id;

      if (originalScribbleId === '') {
        delete draftScribble.attributes['mn-draft-of'];
        scribblesAdapter.updateOne(state.scribbles, {
          id: originalScribbleId,
          changes: draftScribble,
        });
      } else {
        const newScribble = JSON.parse(JSON.stringify(draftScribble)) as Scribble;
        newScribble.id = originalScribbleId;
        delete newScribble.attributes['mn-draft-of'];

        scribblesAdapter.updateOne(state.scribbles, {
          id: originalScribbleId,
          changes: newScribble,
        });
        scribblesAdapter.removeOne(state.scribbles, draftScribbleId);
      }
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchStoreMetadata.pending, (state) => {
      state.status = 'loading';
    });
    builder.addCase(fetchStoreMetadata.fulfilled, (state, action) => {
      state.status = 'succeeded';
      state.error = null;
      scribblesAdapter.upsertMany(state.scribbles, action.payload);
      updateTitleMapAdd(state, action.payload);
    });
    builder.addCase(fetchStoreMetadata.rejected, (state, action) => {
      state.status = 'failed';
      state.error = action.error.message ? action.error.message : null;
    });

    builder.addCase(fetchScribble.pending, (state, action) => {
      scribblesAdapter.updateOne(state.scribbles, {
        id: action.meta.arg.id,
        changes: { status: 'pullingBody' },
      });
    });
    builder.addCase(fetchScribble.fulfilled, (state, action) => {
      scribblesAdapter.updateOne(state.scribbles, {
        id: action.meta.arg.id,
        changes: {
          ...action.payload,
          status: 'synced',
          error: undefined,
        },
      });
      updateTitleMapRemove(state, [action.meta.arg]);
      updateTitleMapAdd(state, [action.payload]);
    });
    builder.addCase(fetchScribble.rejected, (state, action) => {
      scribblesAdapter.updateOne(state.scribbles, {
        id: action.meta.arg.id,
        changes: {
          status: 'failed',
          error: action.error.message,
        },
      });
    });
  },
});

export default scribblesSlice.reducer;

export const { setCoreScribbles, createDraft, updateScribbleBody, updateScribbleAttributes, removeScribbleAttributes, removeScribble, commitDraft, createDraftScribble } = scribblesSlice.actions;

export const {
  selectAll: selectAllScribbles,
  selectById: selectScribbleById,
  selectIds: selectScribbleIds
} = scribblesAdapter.getSelectors((state: RootState) => state.scribbles.scribbles);
