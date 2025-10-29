# Problem
The `import/export` rule test is failing with a fatal parsing error. This means the rule itself is throwing an error during the test, preventing `RuleTester` from verifying the output.

# Attempts
1. I wrote a standard test with valid and invalid cases, but it failed with a fatal parsing error.
2. I tried to update the error message to match what the parser might be outputting, but this did not resolve the issue.

# Possible Solution
The issue may be related to how the `eslint-plugin-import` rule interacts with the ESLint v7 parser used in this project. It might be necessary to mock the file system or provide a more complete context for the rule to run successfully.
