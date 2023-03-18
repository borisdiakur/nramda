# nramda

Node.js REPL with [Ramda](https://ramdajs.com/)

[![Coverage Status](https://coveralls.io/repos/borisdiakur/nramda/badge.svg?branch=main)](https://coveralls.io/r/borisdiakur/nramda?branch=main)

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

## Notes

### History persistence

**nramda** stores its session history under `~/.nr_repl_history`.

Enjoy! 🐑
