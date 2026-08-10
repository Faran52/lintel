import { ruleIdsFor, startsWith } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import angular from './angular';

describe('angular', () => {
  it('reports on a template', async () => {
    const code = '<div *ngIf="on">{{ label }}</div>\n<button (click)="go()"></button>\n';
    const ruleIds = await ruleIdsFor(angular(), code, 'src/app/home.component.html');

    // `not.toContain(null)` alone only proves the template parsed: a `null` id is a fatal parser
    // error. An empty template ruleset would pass that and fail this.
    expect(ruleIds).not.toContain(null);
    expect(ruleIds.some(startsWith('@angular-eslint/'))).toBe(true);
  });

  it('reports a component class that breaks an angular-eslint convention', async () => {
    const code = [
      "import { Component } from '@angular/core';",
      '',
      "@Component({ selector: 'app-home', template: '' })",
      'export class HomeComponent {',
      '  ngOnInit() {}',
      '}',
      '',
    ].join('\n');
    const ruleIds = await ruleIdsFor(angular(), code, 'src/app/home.component.ts');

    expect(ruleIds.some(startsWith('@angular-eslint/'))).toBe(true);
  });
});
