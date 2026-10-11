# Security Policy

## Scope

This mod runs inside your Claude Code session with the reach listed in the README's "What it can reach" section. Anything that goes beyond that is a security bug, for example:

- a network call
- a file read or write
- starting a process
- sending anything to the model
- parsing prompt, tool or file content

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting: open the **Security** tab of this repository and choose **Report a vulnerability**. Don't open a public issue for a security problem.

You can expect an acknowledgement within 7 days.

## Supported versions

Only the latest tagged release gets fixes.

## Verifying a release

Each release is a git tag. The mod is a few small source files, so you can read the whole thing before installing. That is the recommended practice for any mod.
