# @linteljs/newline-destructuring

Enforce newlines in object destructuring, interfaces, and type literals when there are too many properties.

- Category: `layout`
- Applies to: JavaScript and TypeScript
- Fixable: yes (whitespace)
- In `recommended`: yes

More than two properties go one per line. A pattern containing a rest element drops that threshold
to one, because `...rest` at the end of a crowded line is the easiest thing in a file to miss.
Interfaces and type literals are held to the same shape, so the declaration of an object and the
destructuring of it read the same way.

## Examples of incorrect code for this rule

```ts
// incorrect: three properties on one line, over the default maxProperties of 2
const { alpha, bravo, charlie } = source;

// incorrect: a rest element drops the threshold to maxPropertiesWithRest, which is 1
const { delta, ...rest } = source;

// incorrect: interfaces and type literals count the same way
interface Wide { echo: string; foxtrot: number; golf: boolean }

// incorrect: split, but two properties still share a line
const { hotel, india,
  juliet } = source;

// incorrect: a blank line between properties
const {
  kilo,

  lima,
  mike
} = source;

// incorrect: one property spans lines while the rest sit on the opening line
const { november, oscar = { first: 1,
  second: 2 } } = source;
```

## Examples of correct code for this rule

```ts
// correct: two properties, at the default threshold
const { alpha, bravo } = source;

// correct: three properties, one per line
const {
  charlie,
  delta,
  echo
} = source;

// correct: a rest element counts towards the total, so any named property
// alongside it puts the pattern over maxPropertiesWithRest and it splits
const {
  foxtrot,
  ...rest
} = other;

// correct: an interface, one member per line
interface Wide {
  golf: string;
  hotel: number;
  india: boolean;
}

// correct: a doc comment above a member belongs to that member
interface Documented {
  /** How many times to retry. */
  juliet: string;
  /** Milliseconds between attempts. */
  kilo: number;
  /** Whether to give up on the first refusal. */
  lima: boolean;
}
```

An optional parameter stays optional, and its type annotation comes back with it:

```ts
// correct: the `?` and the `: Options` belong to the pattern and are preserved
declare function load({
  mike,
  november,
  oscar
}?: Options): void;
```

## Options

```jsonc
{
  "@linteljs/newline-destructuring": ["error", {
    "maxProperties": 2,
    "maxPropertiesWithRest": 1
  }]
}
```

- `maxProperties`: integer, `2` by default. More than this and the pattern, interface or type
  literal splits one member per line.
- `maxPropertiesWithRest`: integer, `1` by default. Applies instead of `maxProperties` when the
  pattern carries a rest element. The rest element counts towards the total, so at the default any
  named property beside it already puts the pattern over and it splits. Patterns only: neither an
  interface nor a type literal can hold a rest, so this never applies to them.

## What it declines to fix

- A property that itself spans lines while the others sit on the opening line is reported with no
  fix at all. The rebuild works property by property and has no way to express that shape, so it
  says what is wrong and leaves the decision to you.
- A comment between the last member and the closing brace is reported without a fix. The split
  rewrites that gap to move the brace down, which would take the comment with it.

## Notes

A doc comment above a member counts as part of that member, so the space it occupies is not read as
a blank line. That was a real bug: every documented interface reported forever, with no edit that
could satisfy the rule. A genuine blank line between two members is still reported, doc comments or
not.

A note written beside a member, as `meta?: string; // describes meta`, belongs to that member. It
does not count towards where the next one starts, and a split puts the newline after it rather than
in front of it. Both halves were wrong in 1.0.1: an interface already one member per line reported,
and the fix moved every note down onto the field below, so each described the wrong thing.

Rebuilt blocks keep the column they came from, indented one step further in.
