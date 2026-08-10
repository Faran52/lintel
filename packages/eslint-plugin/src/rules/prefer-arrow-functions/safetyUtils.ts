// The half of the rule that says no: whether the body survives becoming an arrow and
// whether the position accepts one at all. `writeUtils.ts` is the other half.
import { adjacentPairs } from '../../utils/layoutUtils.ts';
import { FUNCTION_TYPES } from '../../utils/ruleUtils.ts';

import type {
  Ancestor,
  AncestorReader,
  RuleNode,
  SourceCode,
} from '../../utils/ruleUtils.ts';
import type { FunctionLike } from './writeUtils.ts';

/**
 * Parent positions where a bare arrow can stand in for a function expression: an allow-list, not a block-list,
 * since anything that keeps consuming after a block-bodied arrow (`.name`, an operator, `instanceof`, `**`, an
 * optional call, a class `extends`) breaks it, and an allow-list fails closed rather than open.
 */
const SAFE_FUNCTION_PARENTS = new Set([
  'ArrayExpression',
  'AssignmentExpression',
  'ExportDefaultDeclaration',
  'ExpressionStatement',
  'JSXExpressionContainer',
  'Property',
  'PropertyDefinition',
  'ReturnStatement',
  'SpreadElement',
  'VariableDeclarator',
]);

// Parent positions where a `const` can stand in for a function *declaration*: Annex B makes a sloppy-mode
// function declaration legal in an unbraced statement position (an `if`/`else` body, a label) `const` cannot take.
export const SAFE_DECLARATION_PARENTS = new Set([
  'BlockStatement',
  'ExportNamedDeclaration',
  'Program',
  'StaticBlock',
  'SwitchCase',
  'TSModuleBlock',
]);

export const isInsideFunctionBody = (sourceCode: AncestorReader, node: Ancestor): boolean => {
  return sourceCode.getAncestors(node).some((ancestor) => {
    return FUNCTION_TYPES.has(ancestor.type);
  });
};

// Whether the function sits in a parent that will not take an arrow: `void`, `typeof`,
// `as` and `satisfies` all take it as a bare operand, where an arrow needs parentheses.
export const sitsInUnsafePosition = (sourceCode: SourceCode, fn: FunctionLike): boolean => {
  const { parent } = fn;

  // An arrow cannot be constructed, so a `new` callee is out however punctuated; an argument to `new` is fine.
  if (parent.type === 'NewExpression') {
    return parent.callee === fn;
  }

  /**
   * IIFE: `(function(){})()` wraps the function, so the arrow inherits the parens and still parses, while
   * Crockford's `(function(){}())` wraps the call, leaving the arrow bare in callee position. The token right
   * after the function is `)` in the first spelling and `(` in the second.
   */
  if (parent.type === 'CallExpression') {
    // An argument is a safe position. Only the callee is at risk.
    return parent.callee === fn && sourceCode.getTokenAfter(fn)?.value !== ')';
  }

  return !SAFE_FUNCTION_PARENTS.has(parent.type);
};

const isAssertionFunction = (fn: FunctionLike): boolean => {
  const annotation = fn.returnType?.typeAnnotation;
  return annotation?.type === 'TSTypePredicate' && annotation.asserts === true;
};

// An explicit `this` parameter is a plain identifier in first position and nothing else:
// a parameter property is constructor-only syntax, and this rule never visits a `MethodDefinition`.
const hasThisParameter = (fn: FunctionLike): boolean => {
  const [first] = fn.params;

  return first?.type === 'Identifier' && first.name === 'this';
};

/**
 * Whether the parameter list binds the same name twice: a non-strict `function` may (comment-parser's
 * `parse(source, parse, _, _, tokenizers)`), where an arrow may not. Identifiers only is exhaustive: anything
 * else makes the list non-simple, and a non-simple list repeating a name is a SyntaxError before a rule sees it.
 */
const hasDuplicateParameters = (fn: FunctionLike): boolean => {
  const names = fn.params.flatMap((param) => {
    return param.type === 'Identifier' ? [param.name] : [];
  });

  return new Set(names).size !== names.length;
};

const containsToken = (sourceCode: SourceCode, node: RuleNode, type: string, value: string): boolean => {
  return sourceCode.getTokens(node).some((token) => {
    return token.type === type && token.value === value;
  });
};

/**
 * Whether the function reads the `arguments` object rather than a property access: `node.arguments.length` is
 * an `Identifier` token too, so only a `.`/`?.` token in front rules it out. Shorthand `{ arguments }` stays
 * unsafe by design, since a missed report costs less than a wrong one. Paired rather than indexed, so the token
 * in front is always real: a function node opens on `function`, `async` or `(`, never on `arguments`.
 */
const readsArgumentsObject = (sourceCode: SourceCode, fn: FunctionLike): boolean => {
  return [...adjacentPairs(sourceCode.getTokens(fn))].some(([before, token]) => {
    return token.type === 'Identifier'
      && token.value === 'arguments'
      && before.value !== '.'
      && before.value !== '?.';
  });
};

// `new.target` is three tokens, not one identifier, so it is matched as a sequence; an arrow has none to inherit.
const NEW_DOT_TARGET: [string, string][] = [
  ['Keyword', 'new'],
  ['Punctuator', '.'],
  ['Identifier', 'target'],
];

const containsNewDotTarget = (sourceCode: SourceCode, node: RuleNode): boolean => {
  const tokens = sourceCode.getTokens(node);

  return tokens.some((_, index) => {
    return NEW_DOT_TARGET.every(([type, value], offset) => {
      const token = tokens[index + offset];

      return token?.type === type && token.value === value;
    });
  });
};

export const isSafeToConvert = (
  sourceCode: SourceCode,
  fn: FunctionLike,
  containsThis: WeakSet<FunctionLike>,
): boolean => {
  if (fn.generator === true || isAssertionFunction(fn) || hasThisParameter(fn) || hasDuplicateParameters(fn)) {
    return false;
  }

  if (containsThis.has(fn)) {
    return false;
  }

  if (containsToken(sourceCode, fn, 'Keyword', 'super')) {
    return false;
  }

  if (readsArgumentsObject(sourceCode, fn)) {
    return false;
  }

  return !containsNewDotTarget(sourceCode, fn);
};
