name: Feature Request
description: Suggest a new feature
title: "[FEATURE] "
labels: ["enhancement"]

body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature! Please provide details below.

  - type: textarea
    id: description
    attributes:
      label: Feature Description
      description: Describe the feature you'd like
      placeholder: "Describe the feature..."
    validations:
      required: true

  - type: textarea
    id: use_case
    attributes:
      label: Use Case
      description: Why do you need this feature?
      placeholder: "Explain the use case..."
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: How should this feature work?
      placeholder: "Describe the solution..."
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternative Solutions
      description: Other approaches you've considered
      placeholder: "Alternatives..."

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other information
      placeholder: "Screenshots, mockups, etc..."
