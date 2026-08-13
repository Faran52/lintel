import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { env } from 'node:process';

import { type Artifact, buildArtifacts } from '../../artifacts';
import { SETUP_TESTS_CANDIDATES } from '../../artifacts/banned-patterns/checkerArtifact';
import { emitManifest } from '../../artifacts/manifest/emitManifest';
import { emitPackageJson, parsePackageJson } from '../../artifacts/package-json/emitPackageJson';
import { emitReadme } from '../../artifacts/readme/emitReadme';
import { hasTests } from '../../model/answers/answers';
import { CONFIG_PATH, emitLintelConfig } from '../../model/config/lintelConfig';
import { type Stage, STAGES } from '../../model/stages/stages';
import {
  type ScaffoldKind,
  type ScaffoldSpec,
  targetFor,
} from '../../model/targets';
import { nextStep, runFixPass } from '../fix-pass/fixPass';
import { git } from '../git/git';
import { applyArtifact, writeProjectFile } from '../project-files/projectFiles';
import { repairScaffoldedOutput } from '../repair/repair';
import { rewriteScaffoldedSource } from '../rewrite/rewrite';
import { ASSETS_ROOT } from '../shipped-assets/shippedAssets';
import {
  exists,
  firstPresent,
  readIfPresent,
} from '../utils/fsUtils';

import type { Answers, PackageManager } from '../../model/answers/answers';

export interface PipelineOptions {
  name: string;
  cwd: string;
  answers: Answers;
  skip: Stage[];
  // Treat the directory as freshly generated output even though this run did not scaffold it.
  fresh?: boolean;
  // Reports every path written, so the CLI and the tests see the same list.
  onWrite?: (path: string) => void;
  // Reports what happened that was not a file write: the fix pass, or the next step.
  onNotice?: (message: string) => void;
}

// A tuple so the first element is guaranteed a command: no unreachable `undefined` guard, no `?? []` fallback.
type CommandLine = [string, ...string[]];

type StageRunner = (
  options: PipelineOptions,
  artifacts: Artifact[],
  stage: Stage,
) => Promise<void> | void;

// `create` and `dlx` are the same intent under four different spellings; getting this wrong reads as a package manager
// trying to install a package called `vite my-app`.
const SCAFFOLD_COMMANDS: Record<PackageManager, Record<ScaffoldKind, CommandLine>> = {
  pnpm: { create: ['pnpm', 'create'], dlx: ['pnpm', 'dlx'] },
  npm: { create: ['npm', 'create'], dlx: ['npx', '--yes'] },
  yarn: { create: ['yarn', 'create'], dlx: ['yarn', 'dlx'] },
  bun: { create: ['bun', 'create'], dlx: ['bunx'] },
};

const run = async (command: string, args: string[], cwd: string): Promise<void> => {
  await new Promise<void>((settle, fail) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
      // Angular's CLI otherwise prompts for analytics with no flag to decline; unanswered it blocks the scaffold.
      env: { ...env, NG_CLI_ANALYTICS: 'false' },
    });

    child.on('error', fail);
    child.on('close', (code) => {
      if (code === 0) {
        settle();
        return;
      }

      fail(new Error(`${command} ${args.join(' ')} exited with ${String(code)}`));
    });
  });
};

export const scaffoldCommand = (
  packageManager: PackageManager,
  spec: ScaffoldSpec,
): CommandLine => {
  return [...SCAFFOLD_COMMANDS[packageManager][spec.kind], ...spec.args];
};

const write = async (options: PipelineOptions, relative: string, text: string): Promise<void> => {
  await writeProjectFile(options.cwd, relative, text);

  options.onWrite?.(relative);
};

// Every artifact this stage owns. Stage 2 is this and nothing else.
const writeArtifacts = async (
  options: PipelineOptions,
  artifacts: Artifact[],
  stage: Stage,
): Promise<void> => {
  for (const artifact of artifacts) {
    if (artifact.stage !== stage) {
      continue;
    }

    if (await applyArtifact(options.cwd, artifact)) {
      options.onWrite?.(artifact.target);
    }
  }
};

const stageScaffold = async (options: PipelineOptions): Promise<void> => {
  const spec = targetFor(options.answers).scaffold(options.name, options.answers);
  const [command, ...args] = scaffoldCommand(options.answers.packageManager, spec);

  // The scaffolder creates `<name>/` itself, so this runs one directory above `options.cwd`, the project directory.
  const parent = dirname(options.cwd);

  await mkdir(parent, { recursive: true });
  await run(command, args, parent);
};

// Whether this directory is scaffolder output: true when stage 1 ran, or forced by `--fresh`.
const isFresh = (options: PipelineOptions): boolean => {
  return options.fresh === true || !options.skip.includes('scaffold');
};

// `tsconfig.json` is the artifact; the three files below are merges, and say why.
const stagePackage = async (
  options: PipelineOptions,
  artifacts: Artifact[],
  stage: Stage,
): Promise<void> => {
  const existing = await readIfPresent(join(options.cwd, 'package.json'));
  const parsed = existing === null ? { name: options.name } : parsePackageJson(existing);

  await write(options, 'package.json', emitPackageJson(parsed, options.answers));
  await write(options, CONFIG_PATH, emitLintelConfig(options.answers));
  await writeArtifacts(options, artifacts, stage);

  // Paired with the tsconfig above: rewrites the scaffolder's own source to compile under the flags it just set.
  await rewriteScaffoldedSource(options.cwd, options.answers, options.onWrite);

  // Not paired with anything: these are defects in the generator's output, not lintel's, so they gate on fresh alone.
  if (isFresh(options)) {
    await repairScaffoldedOutput(
      options.cwd,
      options.answers,
      options.onWrite,
      options.onNotice,
    );
  }
};

// Source no scaffolder wrote that the target can't run without; fresh output only, whatever the testing answer.
const writeStarterFiles = async (options: PipelineOptions): Promise<void> => {
  const { starterFiles } = targetFor(options.answers);

  if (starterFiles === undefined || !isFresh(options)) {
    return;
  }

  for (const file of starterFiles) {
    await write(options, file.target, await readFile(join(ASSETS_ROOT, file.source), 'utf8'));
  }
};

// Fresh output only, and skipped when the file it covers is absent, so a generator that rearranged its starter costs
// the example rather than a broken import.
const writeStarterTests = async (options: PipelineOptions): Promise<void> => {
  const { starterTests } = targetFor(options.answers);

  if (starterTests === undefined || !hasTests(options.answers) || !isFresh(options)) {
    return;
  }

  for (const test of starterTests) {
    if (await exists(join(options.cwd, test.covers))) {
      await write(options, test.target, await readFile(join(ASSETS_ROOT, test.source), 'utf8'));
    }
  }
};

// Uses `git rev-parse`, not `existsSync('.git')`: `--skip-scaffold` in a subdirectory of an existing repo has no `.git`
// of its own, and initialising one there would nest a repo inside somebody's working tree.
const ensureRepository = (options: PipelineOptions): void => {
  const inside = git(['rev-parse', '--is-inside-work-tree'], { cwd: options.cwd });

  // Said out loud, not degraded silently: without git there is no repository and no hooks, which
  // is a different project than the one this tool promises.
  if (inside.error !== undefined) {
    options.onNotice?.(`git unavailable, skipping repository setup: ${inside.error.message}`);

    return;
  }

  if (inside.status === 0) {
    return;
  }

  const created = git(['init', '--quiet'], { cwd: options.cwd });

  options.onNotice?.(created.status === 0
    ? 'git init: the husky hooks install on the next install'
    : 'no git repository here, so the husky hooks will not install until there is one');
};

const stageStandard = async (
  options: PipelineOptions,
  artifacts: Artifact[],
  stage: Stage,
): Promise<void> => {
  ensureRepository(options);

  await writeArtifacts(options, artifacts, stage);

  // Replaced rather than left: every scaffolder's README describes its own toolchain, which the stages above make it
  // contradict. See `emitReadme`.
  const readme = await readFile(join(ASSETS_ROOT, 'readme/template.md'), 'utf8');
  await write(options, 'README.md', emitReadme(readme, options.name, options.answers));

  /**
   * Birth only, and `null` for the eight targets that are not extensions. A manifest becomes the project's own file
   * immediately: its permissions, icons and store metadata are not this CLI's to keep rewriting.
   */
  const manifest = emitManifest(options.answers, options.name);

  if (manifest !== null && isFresh(options)) {
    await write(options, 'manifest.json', manifest);
  }

  await writeStarterFiles(options);
  await writeStarterTests(options);
};

// Installs the dependencies stage 3 declared; fatal on purpose, since every later step reads `node_modules`.
const stageInstall = async (options: PipelineOptions): Promise<void> => {
  options.onNotice?.(`installing with ${options.answers.packageManager}`);

  await run(options.answers.packageManager, ['install'], options.cwd);
};

// The fix pass is synchronous; every other stage awaits. `await` on a void return is a no-op.
const STAGE_RUNNERS: Record<Stage, StageRunner> = {
  scaffold: stageScaffold,
  lint: writeArtifacts,
  package: stagePackage,
  standard: stageStandard,
  install: stageInstall,
  fix: (options) => {
    runFixPass(options.cwd, options.answers, options.onNotice);
  },
};

export const runPipeline = async (options: PipelineOptions): Promise<void> => {
  const existingSetup = await firstPresent(options.cwd, SETUP_TESTS_CANDIDATES);
  const artifacts = buildArtifacts(options.answers, existingSetup);

  for (const stage of STAGES) {
    // Skipped with lint: `--skip lint` means somebody else's rules, and fixing against those is an unasked-for edit.
    if (stage === 'fix' && options.skip.includes('lint')) {
      continue;
    }

    if (!options.skip.includes(stage)) {
      await STAGE_RUNNERS[stage](options, artifacts, stage);
    }
  }

  // Declining the install leaves the project unfixed, so it says so, but only when fix was skipped outright, since fix
  // already reports the same thing if it ran.
  const declined = options.skip.includes('install') && options.skip.includes('fix');

  if (declined && !options.skip.includes('lint')) {
    options.onNotice?.(nextStep(options.answers));
  }
};
