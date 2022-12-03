import { NodeTransform } from '../transform'
import { findDir } from '../utils'
import {
  createCallExpression,
  createFunctionExpression,
  createSimpleExpression,
  ExpressionNode,
  NodeTypes,
  PlainElementNode,
  SimpleExpressionNode
} from '../ast'
import { stringifyExpression } from './transformExpression'

const seen = new WeakSet()
const extractKeyValueRE = /(\w+)\s*:\s*"*(.*?)"*\s*[,}\n]/g

export const transformScope: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {
    const dir = findDir(node, 'scope')
    if (!dir || seen.has(node)) {
      return
    }
    seen.add(node)
    return () => {
      const codegenNode =
        node.codegenNode ||
        (context.currentNode as PlainElementNode).codegenNode
      if (codegenNode && codegenNode.type === NodeTypes.VNODE_CALL) {
        node.codegenNode = createCallExpression(
          createFunctionExpression(
            transformScopeExpression(dir.exp!),
            codegenNode
          )
        )
      }
    }
  }
}

export function transformScopeExpression(
  exp: string | ExpressionNode
): ExpressionNode[] {
  const params: SimpleExpressionNode[] = []
  const rExpString = stringifyExpression(exp)
  let match
  while ((match = extractKeyValueRE.exec(rExpString))) {
    params.push(createSimpleExpression(`${match[1]}=${match[2]}`))
  }
  return params
}

export const trackVScopeScopes: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {
    const vLet = findDir(node, 'scope')
    if (vLet) {
      const keys: string[] = []
      let match
      while ((match = extractKeyValueRE.exec(vLet.exp!.loc.source))) {
        keys.push(match[1])
      }
      if (!__BROWSER__ && context.prefixIdentifiers) {
        keys.forEach(context.addIdentifiers)
      }
      return () => {
        if (!__BROWSER__ && context.prefixIdentifiers) {
          keys.forEach(context.removeIdentifiers)
        }
      }
    }
  }
}
