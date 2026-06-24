name: Bug Report
description: Report a bug or issue
title: "[BUG] "
labels: ["bug"]

body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting a bug! Please fill out the form below.

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Clear description of the bug
      placeholder: "Describe the issue..."
    validations:
      required: true

  - type: textarea
    id: reproduce
    attributes:
      label: Steps to Reproduce
      description: How to reproduce the issue
      placeholder: |
        1. Go to...
        2. Click on...
        3. See error...
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What should happen
      placeholder: "Expected behavior..."
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happens
      placeholder: "Actual behavior..."
    validations:
      required: true

  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - Windows
        - macOS
        - Linux
    validations:
      required: true

  - type: input
    id: node_version
    attributes:
      label: Node.js Version
      placeholder: "e.g., 18.0.0"

  - type: input
    id: python_version
    attributes:
      label: Python Version
      placeholder: "e.g., 3.10.0"

  - type: textarea
    id: additional
    attributes:
      label: Additional Information
      description: Any additional context
      placeholder: "Screenshots, error logs, etc..."
