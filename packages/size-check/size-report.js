// @ts-check
import { brotliCompress, gzip } from 'node:zlib'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import prettyBytes from 'pretty-bytes'

run()

async function run() {
  const file = await readFile('dist/index.js')

  const gzipped = await promisify(gzip)(file)
  console.log(`gzip: ${prettyBytes(gzipped.length)}`)

  const brotli = await promisify(brotliCompress)(file)
  console.log(`brotli: ${prettyBytes(brotli.length)}`)

  await writeFile(
    path.resolve('../../temp/size/_baseline.json'),
    JSON.stringify({
      size: file.length,
      gzip: gzipped.length,
      brotli: brotli.length
    })
  )
}
