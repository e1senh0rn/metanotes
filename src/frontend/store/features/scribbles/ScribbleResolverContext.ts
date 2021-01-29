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

import { Dispatch } from '@reduxjs/toolkit';
import React from 'react';

import { Scribble } from './scribble';

export interface ResolverQuery {
  id?: string;
  title?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ScribbleResolver = (query: ResolverQuery, dispatch: Dispatch<any>, scribble?: Scribble) => React.FunctionComponent<unknown>;
export type ScribbleResolverContextType = {
  resolver: ScribbleResolver,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorBoundary: React.PureComponent<{ children: JSX.Element }, any>,
};

export const ScribbleResolverContext = React.createContext(null as unknown as ScribbleResolverContextType);
