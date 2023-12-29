import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export const MODULE_CONFIG_FILE = 'module.json';

export const blue = chalk.blueBright;

export function assertFoundryDataPath() {
  if (!process.env.FOUNDRY_DATA_PATH) {
    console.log(`No '%s' defined in '%s'`, blue('FOUNDRY_DATA_PATH'), blue('.env'));
    process.exit(0);
  }
}

export function assertFoundryModulesPath(foundryModulesPath) {
  if (!fs.existsSync(foundryModulesPath)) {
    console.log(
      `The specified '%s' is invalid. Couldn't find the '%s' directory.`,
      blue('FOUNDRY_DATA_PATH'),
      blue('modules')
    );
    process.exit(0);
  }
}

export function assertModuleConfigPath(moduleConfigPath) {
  if (!fs.existsSync(moduleConfigPath)) {
    console.log(`The module config file '%s' is missing.`, blue(moduleConfigPath));
    process.exit(0);
  }
}

export function readModuleConfig() {
  const moduleConfigPath = path.resolve(process.cwd(), 'src', MODULE_CONFIG_FILE);
  assertModuleConfigPath(moduleConfigPath);

  return fs.readJSONSync(moduleConfigPath);
}

export function assertValidModuleName(name) {
  if (!name.match(/^[a-z](?:[\w\d]+)*(?:-[\w\d]+)*$/)) {
    console.log(`The module name '%s' is not valid. Pick another.`, blue(name));
    process.exit(0);
  }
}

export function getLinkDir() {
  assertFoundryDataPath();

  const foundryModulesPath = path.join(process.env.FOUNDRY_DATA_PATH, 'modules');
  assertFoundryModulesPath(foundryModulesPath);

  const moduleConfig = readModuleConfig();
  assertValidModuleName(moduleConfig.name);

  return path.resolve(path.join(foundryModulesPath, moduleConfig.name));
}

export function getSymlinkType() {
  return process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE)
    ? 'junction'
    : 'dir';
}

export function dirExists(dirPath) {
  try {
    const stats = fs.lstatSync(dirPath);
    return stats.isSymbolicLink() || stats.isFile() || stats.isDirectory();
  } catch {
    return false;
  }
}

export function ensureLinked(linkDir) {
  if (!dirExists(linkDir)) {
    console.log(`The directory '%s' is not linked.`, blue(linkDir));
    process.exit(0);
  }
}

export function ensureUnlinked(linkDir) {
  if (dirExists(linkDir)) {
    console.log(`The directory '%s' is already linked.`, blue(linkDir));
    process.exit(0);
  }
}

export function ensureDistDir(distDir) {
  if (!fs.pathExistsSync(distDir)) {
    console.log(`Creating directory '%s'...`, blue(distDir));
    fs.mkdirpSync(distDir);
  }
}

export function createSymlink(linkDir) {
  ensureUnlinked(linkDir);

  const distDir = path.resolve('./dist');
  ensureDistDir(distDir);

  console.log(`Linking '%s' to '%s'...`, blue(distDir), blue(linkDir));
  fs.symlinkSync(distDir, linkDir, getSymlinkType());
}

export function removeSymlink(linkDir) {
  ensureLinked(linkDir);

  console.log(`Unlinking '%s'...`, blue(linkDir));
  fs.unlinkSync(linkDir);
}
