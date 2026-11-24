#!/usr/bin/env node
import { ejecutar } from './cli/main.js';

process.exitCode = await ejecutar(process.argv.slice(2));
