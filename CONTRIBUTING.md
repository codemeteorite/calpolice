# Contributing to CalPolice

Thank you for your interest in contributing! We welcome all contributions, from bug reports and feature requests to code improvements and documentation updates.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Commit and push to your fork
6. Submit a pull request

## Development Setup

```bash
# Install dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..
cd calpolice-ai && pip install -r requirements.txt && cd ..
```

## Running Tests

```bash
# Backend
cd server && npm test

# Frontend
cd client && npm run lint
```

## Code Style

- Follow existing code conventions
- Use meaningful variable and function names
- Write clear commit messages
- Add comments for complex logic

## Reporting Bugs

When reporting bugs, please include:
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node version, Python version)

## Feature Requests

Describe the feature, use case, and expected behavior. Feel free to open an issue for discussion before starting work.

## Pull Request Process

1. Update README.md if needed
2. Add tests for new features
3. Ensure all tests pass
4. Write a clear PR description
5. Wait for review and address feedback

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
