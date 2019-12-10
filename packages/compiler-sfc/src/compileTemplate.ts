import {
  CompilerOptions,
  CodegenResult,
  CompilerError
} from '@vue/compiler-core'
import { RawSourceMap } from 'source-map'

const consolidate = require('consolidate')

export interface TemplateCompileResults {
  code: string
  source: string
  tips: (string | CompilerError)[]
  errors: (string | CompilerError)[]
  map?: RawSourceMap
}

export interface TemplateCompiler {
  compile(template: string, options: CompilerOptions): CodegenResult
}

export interface TemplateCompileOptions {
  source: string
  filename: string
  compiler: TemplateCompiler
  compilerOptions?: CompilerOptions
  preprocessLang?: string
  preprocessOptions?: any
  isProduction?: boolean
  prettify?: boolean
}

function preprocess(
  { source, filename, preprocessOptions }: TemplateCompileOptions,
  preprocessor: any
): string {
  // Consolidate exposes a callback based API, but the callback is in fact
  // called synchronously for most templating engines. In our case, we have to
  // expose a synchronous API so that it is usable in Jest transforms (which
  // have to be sync because they are applied via Node.js require hooks)
  let res: any, err
  preprocessor.render(
    source,
    { filename, ...preprocessOptions },
    (_err: Error | null, _res: string) => {
      if (_err) err = _err
      res = _res
    }
  )

  if (err) throw err
  return res
}

export function compileTemplate(
  options: TemplateCompileOptions
): TemplateCompileResults {
  const { preprocessLang } = options
  const preprocessor = preprocessLang && consolidate[preprocessLang]
  if (preprocessor) {
    return doCompileTemplate({
      ...options,
      source: preprocess(options, preprocessor)
    })
  } else if (preprocessLang) {
    return {
      code: `export default function render() {}`,
      source: options.source,
      tips: [
        `Component ${
          options.filename
        } uses lang ${preprocessLang} for template. Please install the language preprocessor.`
      ],
      errors: [
        `Component ${
          options.filename
        } uses lang ${preprocessLang} for template, however it is not installed.`
      ]
    }
  } else {
    return doCompileTemplate(options)
  }
}

function doCompileTemplate({
  source,
  compiler,
  compilerOptions = {},
  prettify = true,
  isProduction = process.env.NODE_ENV === 'production',
  filename
}: TemplateCompileOptions): TemplateCompileResults {
  const tips = []
  const errors: CompilerError[] = []
  let { code, map } = compiler.compile(source, {
    ...compilerOptions,
    mode: 'module',
    onError: e => errors.push(e)
  })
  if (!isProduction && prettify) {
    try {
      code = require('prettier').format(code, { semi: false, parser: 'babel' })
    } catch (e) {
      tips.push(
        `Failed to prettify component ${filename} template source after compilation.`
      )
    }
  }
  return { code, source, tips, errors, map }
}
