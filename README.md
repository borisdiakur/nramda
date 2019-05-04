# nramda

Node.js REPL with [Ramda](https://ramdajs.com/)

[![Build Status](https://travis-ci.org/borisdiakur/nramda.svg?branch=master)](https://travis-ci.org/borisdiakur/nramda)
[![Coverage Status](https://coveralls.io/repos/borisdiakur/nramda/badge.svg?branch=master)](https://coveralls.io/r/borisdiakur/nramda?branch=master)
[![npm version](https://badge.fury.io/js/nramda.svg)](http://badge.fury.io/js/nramda)

## Why?
Sometimes we use the Node.js REPL interface to experiment with code.
Wouldn’t it be great to have that interface with Ramda required by default?

## Installation

```shell
$ npm install -g nramda
```

## Usage

```shell
$ nr
λ >
```

Ramda is now attached to the REPL context as `R`, so just use it:

```shell
λ > R.add(2, 5);
7
λ >
```

### Strict mode

It is possible to enable strict mode in Node.js >= 4.x:

```shell
$ nr --use_strict
λ >
```

## Notes

### History persistence

**nramda** stores its session history under `~/.nr_repl_history`.

Enjoy! 🐑
