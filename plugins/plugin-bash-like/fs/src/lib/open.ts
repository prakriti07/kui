/*
 * Copyright 2018-19 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Debug from 'debug'
import { basename, dirname } from 'path'

import {
  MultiModalResponse,
  MultiModalMode as Mode,
  findFile,
  expandHomeDir,
  i18n,
  Arguments,
  Registrar,
  KResponse,
  SupportedStringContent
} from '@kui-shell/core'

import File from './File'
import { FStat } from './fstat'
import { localFilepath } from './usage-helpers'

const strings = i18n('plugin-bash-like')
const debug = Debug('plugins/bash-like/cmds/open')

/** Important for alignment to the Editor view component */
function contentTypeOf(suffix: string): SupportedStringContent {
  switch (suffix) {
    case 'sh':
      return 'shell'
    case 'md':
      return 'text/markdown'
    case 'html':
      return 'text/html'
    case 'yaml':
    case 'json':
      return suffix
    default:
      return 'text/plain'
  }
}

/**
 * Decide how to display a given filepath
 *
 */
async function open({ argvNoOptions, REPL }: Arguments): Promise<KResponse> {
  const filepath = argvNoOptions[argvNoOptions.indexOf('open') + 1]
  debug('open', filepath)

  const fullpath = findFile(expandHomeDir(filepath))
  const suffix = filepath.substring(filepath.lastIndexOf('.') + 1)

  if (
    suffix === 'png' ||
    suffix === 'jpg' ||
    suffix === 'jpeg' ||
    suffix === 'tiff' ||
    suffix === 'tif' ||
    suffix === 'gif' ||
    suffix === 'icns' ||
    suffix === 'ico' ||
    suffix === 'webp' ||
    suffix === 'bpg' ||
    suffix === 'svg' ||
    suffix === 'mov' ||
    suffix === 'mp4' ||
    suffix === 'ogg' ||
    suffix === 'mp3'
  ) {
    // open binary/imag fields in a separate window
    window.open(fullpath, 'target=_blank')
    return true
  } else if (suffix === 'pkl' || suffix === 'sab') {
    throw new Error('Opening of binary files not supported')
  } else {
    // fetch the data:
    //   --with-data says give us the file contents
    //   --enoent-ok says don't fail if the file does not exist
    const stats = (await REPL.rexec<FStat>(`fstat ${REPL.encodeComponent(filepath)} --with-data --enoent-ok`)).content

    if (stats.isDirectory) {
      debug('trying to open a directory; delegating to ls')
      return REPL.qexec(`ls ${REPL.encodeComponent(filepath)}`)
    } else {
      const enclosingDirectory = dirname(filepath)

      const data: string | Element = stats.data
      const name = basename(filepath)
      const packageName = enclosingDirectory === '.' ? undefined : enclosingDirectory

      const mode: Mode =
        typeof data === 'string'
          ? {
              mode: 'view',
              label: strings('Edit'),
              contentType: contentTypeOf(suffix),
              content: data
            }
          : {
              mode: 'view',
              label: strings('View'),
              content: data
            }

      const response: MultiModalResponse<File> = {
        apiVersion: 'kui-shell/v1',
        kind: 'File',
        metadata: {
          name,
          namespace: packageName
        },
        modes: [mode],
        spec: {
          filepath,
          fullpath
        }
      }
      return response
    }
  }
}

const usage = {
  strict: 'open',
  command: 'open',
  title: strings('openUsageTitle'),
  header: strings('openUsageHeader'),
  optional: localFilepath
}

/**
 * Register command handlers
 *
 */
export default (registrar: Registrar) => {
  registrar.listen('/open', open, { usage })
}
