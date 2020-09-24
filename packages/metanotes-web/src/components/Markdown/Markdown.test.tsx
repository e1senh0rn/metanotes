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
import { render } from '@testing-library/react';

import Markdown from '.';
import MarkdownStacktrace from './MarkdownStacktraceContext';

test('renders the markdown content', () => {
  const { getByText } = render(
    <MarkdownStacktrace.Provider value={{ parentHasId: () => false, parentId: () => '' }}>
      <Markdown id="123" doc="hello world" />
    </MarkdownStacktrace.Provider>
  );
  const md = getByText(/hello world/i);
  expect(md).toBeInTheDocument();
});
