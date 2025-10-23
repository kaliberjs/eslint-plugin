# Problem
The `no-extra-label` rule is incorrectly flagging a valid use of a label with a `break` statement as an error.

# Attempts
1. I wrote a standard test with valid and invalid cases, but a valid case was flagged as an error.
2. I corrected the error messages, but the underlying issue with the valid case persisted.

# Possible Solution
The problem appears to be a bug in the `no-extra-label` rule in ESLint v7. The rule is not correctly identifying when a label is being used by a `break` statement. This may be a known issue that is resolved in a later version of ESLint.
