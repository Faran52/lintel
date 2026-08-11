import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import {
  chmod,
  mkdir,
  open,
  readFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { env } from 'node:process';

import { type Artifact, buildArtifacts } from '../../artifacts';
import { SETUP_TESTS_CANDIDATES } from '../../artifacts/banned-patterns/checkerArtifact';
import { mergeGitignore } from '../../artifacts/gitignore/mergeGitignore';
import { emitPackageJson, parsePackageJson } from '../../artifacts/package-json/emitPackageJson';
import { mergePnpmWorkspace } from '../../artifacts/pnpm-workspace/mergePnpmWorkspace';
import { emitReadme } from '../../artifacts/readme/emitReadme';
import { fillSlots } from '../../artifacts/template/template';
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
import { repairScaffoldedOutput } from '../repair/repair';
import { rewriteScaffoldedSource } from '../rewrite/rewrite';
import { ASSETS_ROOT, contentOf } from '../shipped-assets/shippedAssets';
import {
  entryExists,
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
  const path = join(options.cwd, relative);

  await mkdir(dirname(path), { recursive: true });

  try {
    const file = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
      0o666,
    );

    try {
      await file.writeFile(text, 'utf8');
    }
    finally {
      await file.close();
    }
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ELOOP') {
      throw new Error(`Refusing to write ${relative}: target is a symbolic link`);
    }

    throw error;
  }

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

    if (artifact.preserve === true && await entryExists(join(options.cwd, artifact.target))) {
      continue;
    }

    // Only a merge needs the current file, so only a merge pays to read it.
    const current = 'merge' in artifact.content
      ? await readIfPresent(join(options.cwd, artifact.target))
      : null;

    await write(options, artifact.target, await contentOf(artifact.content, current));

    if (artifact.executable === true) {
      // Husky and Claude Code invoke these directly, and npm does not preserve the mode bit for every consumer.
      await chmod(join(options.cwd, artifact.target), 0o755);
    }
  }
};

const stageScaffold = async (options: PipelineOptions): Promise<void> => {
  const spec = targetFor(options.answers.target).scaffold(options.name, options.answers);
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
  await rewriteScaffoldedSource(options.cwd, options.answers.target, options.onWrite);

  // Not paired with anything: these are defects in the generator's output, not lintel's, so they gate on fresh alone.
  if (isFresh(options)) {
    await repairScaffoldedOutput(
      options.cwd,
      options.answers.target,
      options.onWrite,
      options.onNotice,
    );
  }

  // `coverage/` and `*.tsbuildinfo` are this tool's output, so no generator ignores them; merged rather than written to
  // keep the scaffolder's own list (e.g. `.next/`).
  const ignorePath = join(options.cwd, '.gitignore');

  await write(options, '.gitignore', mergeGitignore(await readIfPresent(ignorePath)));

  // Merged, not overwritten: discarding it breaks an install that already wrote into it, and skipping it leaves
  // `create-next-app`'s build opt-out in place.
  if (options.answers.packageManager === 'pnpm') {
    const workspacePath = join(options.cwd, 'pnpm-workspace.yaml');

    await write(
      options,
      'pnpm-workspace.yaml',
      mergePnpmWorkspace(await readIfPresent(workspacePath), options.answers),
    );
  }
};

// Source no scaffolder wrote that the target can't run without; fresh output only, whatever the testing answer.
const writeStarterFiles = async (options: PipelineOptions): Promise<void> => {
  const { starterFiles } = targetFor(options.answers.target);

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
  const { starterTests } = targetFor(options.answers.target);

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

  // Read off the record rather than named here, so an eighth target is still one entry.
  const { birthTemplate } = targetFor(options.answers.target);

  if (birthTemplate !== undefined && isFresh(options)) {
    const template = await readFile(join(ASSETS_ROOT, birthTemplate.source), 'utf8');
    const filled = fillSlots(template, { PROJECT_NAME: options.name }, birthTemplate.target);

    await write(options, birthTemplate.target, filled);
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
