import { createRule } from '../../types.ts';
import { declaredVariablesOf } from '../../utils/compatUtils.ts';
import {
  type Ranged,
  rangeOf,
  type RuleNode,
} from '../../utils/ruleUtils.ts';

interface FunctionName {
  name: string;
}

// The three function nodes, with `id` readable across the union: an arrow declares none, and
// ESLint types a declaration's as non-null even though `export default function () {}` carries null.
type FunctionLike = Extract<
  RuleNode,
  { type: 'ArrowFunctionExpression' | 'FunctionDeclaration' | 'FunctionExpression' }
> & {
  id?: FunctionName | null;
};

type MemberExpressionNode = Extract<RuleNode, { type: 'MemberExpression' }>;

// Read off the union rather than a narrowed arm, so the null a default export carries stays in the type.
const declarationNameOf = (fn: FunctionLike): string => {
  return fn.id?.name ?? '';
};

const sameRange = (left: Ranged, right: Ranged): boolean => {
  return rangeOf(left)[0] === rangeOf(right)[0] && rangeOf(left)[1] === rangeOf(right)[1];
};

const isArgumentOf = (call: { arguments: Ranged[] }, node: Ranged): boolean => {
  return call.arguments.some((argument) => {
    return sameRange(argument, node);
  });
};

const bindingNameOf = (fn: FunctionLike): string => {
  let wrapped: Ranged = fn;
  let { parent } = fn;

  // `const Widget = memo(forwardRef(fn))`: climb the call wrappers the component is an argument
  // of, so the declarator names it. A callee stays put, because the variable holds its result.
  while (parent.type === 'CallExpression' && isArgumentOf(parent, wrapped)) {
    wrapped = parent;
    ({ parent } = parent);
  }

  // The variable's name, not the expression's own: `const Widget = function inner() {}` binds Widget.
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name;
  }

  return fn.type === 'FunctionDeclaration' ? declarationNameOf(fn) : '';
};

const spanOf = (node: Ranged): string => {
  const [start, end] = rangeOf(node);

  return `${String(start)}:${String(end)}`;
};

export const preferDestructuredProps = createRule('prefer-destructured-props', {
  meta: {
    type: 'suggestion',
    docs: {
      category: 'functions',
      language: 'universal',
      // Off by default: the uppercase-name heuristic only means "component" where a framework renders them.
      recommended: false,
      description: 'Requires props to be destructured in the signature rather than read member by member.',
    },
    messages: {
      destructure: 'Destructure the props in the signature instead of reading them member by member.',
    },
    schema: [],
  },
  create: (context) => {
    /**
     * Every member-access object in the file, keyed by range, mapped to whether that access could be a
     * destructure. Collected from the traversal, not through ancestors: the pre-8.38 ancestor reader only answers
     * for the node being visited, so a reference's parent is unreachable there, and this shape works on every major.
     */
    const memberObjects = new Map<string, boolean>();

    return {
      'MemberExpression': (node: MemberExpressionNode) => {
        // A computed read with a dynamic key cannot be destructured, so it counts as a whole-value use.
        memberObjects.set(spanOf(node.object), !node.computed || node.property.type === 'Literal');
      },

      // Exit, not enter: the members inside the function have all been visited by then.
      ':function:exit': (node: FunctionLike) => {
        if (!/^[A-Z]/.test(bindingNameOf(node))) {
          return;
        }

        const [firstParam] = node.params;

        if (firstParam?.type !== 'Identifier') {
          return;
        }

        const propsVariable = declaredVariablesOf(context, node).find((variable) => {
          return variable.name === firstParam.name;
        });

        /* v8 ignore next 3 -- a parameter always declares its own binding */
        if (!propsVariable) {
          return;
        }

        const { references } = propsVariable;

        // An unused parameter is `no-unused-vars`' finding, not this rule's.
        if (references.length === 0) {
          return;
        }

        // One whole-value use (a spread, an argument, a return, an alias) means the object itself is wanted.
        if (references.some((reference) => {
          return memberObjects.get(spanOf(reference.identifier)) !== true;
        })) {
          return;
        }

        context.report({
          messageId: 'destructure',
          node: firstParam,
        });
      },
    };
  },
});
