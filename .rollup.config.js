import 'dotenv/config';

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import styles from 'rollup-plugin-styles';
import { terser } from 'rollup-plugin-terser';
import watch from 'rollup-plugin-watch';
import outputManifest from './rollup/plugin-manifest.js';
import {
  assertPackageJsonProperties,
  blue,
  buildManifest,
  getReleaseData,
  readPackageJson,
} from './rollup/utils.js';

export default async () => {
  const packageJson = await readPackageJson();
  assertPackageJsonProperties(packageJson);

  const releaseData = await getReleaseData(packageJson);
  const { outputFileName, outputStyle, sourcemap, showReleaseLog } =
    releaseData.isReleaseBuild
      ? {
          outputFileName: '[name]-[hash:12]',
          outputStyle: 'compressed',
          sourcemap: false,
          showReleaseLog: true,
        }
      : {
          outputFileName: '[name]',
          outputStyle: 'expanded',
          sourcemap: true,
          showReleaseLog: false,
        };

  if (showReleaseLog) {
    console.log(`Building release '${blue(releaseData.version)}'...`);
  }

  return {
    input: {
      module: 'src/main.js',
    },
    output: {
      entryFileNames: `${outputFileName}.js`,
      assetFileNames: `${outputFileName}.[ext]`,
      dir: './dist/',
      format: 'iife',
      sourcemap,
    },
    plugins: [
      watch({ dir: 'src', namedExports: false }),
      nodeResolve({
        resolveOnly: ['deepmerge'],
      }),
      commonjs(),
      json({
        preferConst: true,
        namedExports: false,
      }),
      styles({
        mode: 'extract',
        sass: {
          outputStyle,
        },
      }),
      copy({
        targets: [
          {
            src: ['src/data/*.json', '!**/manifest.json'],
            dest: 'dist/data',
          },
          {
            src: 'src/templates/*.hbs',
            dest: 'dist/templates',
          },
          {
            src: 'LICENSE',
            dest: 'dist',
          },
        ],
      }),
      outputManifest({
        fileName: 'module.json',
        generate: () => chunks => {
          const mainModuleName = chunks.find(
            chunk => chunk.type === 'chunk' && chunk.name === 'module'
          ).fileName;

          const stylesName = chunks.find(
            chunk => chunk.type === 'asset' && chunk.name === 'module.css'
          ).fileName;

          return buildManifest({
            releaseData,
            scripts: [mainModuleName],
            styles: [stylesName],
          });
        },
      }),
      releaseData.isReleaseBuild && terser(),
    ],
  };
};
