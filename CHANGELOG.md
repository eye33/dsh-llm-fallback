# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2025-07-28

### Added

- Initial release
- Model-level automatic fallback via DSH Settings UI
- Configurable failure code filter (`fallbackOn`)
- Configurable failure threshold per model (`maxFailuresPerModel`)
- Cyclic fallback chain (loops back to first after last)
- TypeScript type definitions
