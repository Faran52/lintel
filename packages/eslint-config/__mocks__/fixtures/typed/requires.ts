// A module. This is what the rule is for, and it stays reported.
export const lodash = require('lodash');

// A bundler asset. No ESM form of this typechecks, so the rule has to permit it.
export const icon = require('./logo.png');
