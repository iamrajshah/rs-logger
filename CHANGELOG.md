# Changelog

All notable changes to `rs-logger` are documented here. The project follows [Semantic Versioning](https://semver.org/).

## 1.1.0 - 2026-10-15

### Added

- Automated CI checks for supported Node.js versions.
- Focused tests for metadata, error serialization, circular values, and child loggers.
- Package exports, bundled TypeScript declarations, npm package-content controls, and richer discovery metadata.

### Changed

- Reworked the documentation around practical usage, configuration, custom transports, and graceful shutdown.
- Simplified the release workflow so validation runs before npm publication.

### Fixed

- Preserve the error type name when serializing `Error` and `TypeError` instances.
- Disable Watchman in Jest so tests behave consistently in CI and sandboxed environments.

## 1.0.3 - 2025-11-13

- Added readable development output and improved error stack handling.

## 1.0.2 - 2025-11-12

- Added the initial npm publishing workflow and package documentation.

## 1.0.1 - 2025-11-12

- Published the first public logger implementation.
