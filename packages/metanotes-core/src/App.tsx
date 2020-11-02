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

import React from 'react';
import { useDispatch } from 'react-redux';
import { CssBaseline, LinearProgress } from '@material-ui/core';

import { useTypedSelector } from '@metanotes/store';
import { fetchStoreMetadata, Scribble, selectScribblesByTitlePrefix, useScribble } from '@metanotes/store/lib/features/scribbles';
import { ErrorBoundary } from './ScribbleResolver';
import { Route, Switch } from 'react-router-dom';


function App(): JSX.Element {
  const preloaderStatus = useTypedSelector(state => state.scribbles.status);

  const dispatch = useDispatch();
  const routeScribbles = useTypedSelector(state => selectScribblesByTitlePrefix(state, '$:core/routes/'));
  let rootEl = <LinearProgress />;

  switch (preloaderStatus) {
    case 'idle':
      dispatch(fetchStoreMetadata());
      break;
    case 'succeeded':
      rootEl = (
        <Switch>
          {routeScribbles.map(sc => <ScribbleRoute key={sc.id} scribble={sc} />)}
        </Switch>
      );
      break;
    default:
      // TODO: what's the generic type for these?
  }

  return (
    <>
      <CssBaseline />
      <ErrorBoundary>
        {rootEl}
      </ErrorBoundary>
    </>
  );
}

function ScribbleRoute({ scribble }: { scribble: Scribble }) {
  const RouteEl = useScribble(scribble.attributes['element']);
  return (
    <Route exact={scribble.attributes['exact'] === 'exact'} path={scribble.attributes['path']}>
      <RouteEl />
    </Route>
  );
}

export default React.memo(App);
