# treefmt-vscode README

`treefmt-vscode` is a VS Code extension that integrates the `treefmt` formatter into your development workflow. `treefmt` is a versatile formatting tool that supports multiple languages and formatters through a single configuration file.

## Features

- **Automatic Formatting**: Automatically format your files on save or through a command.
- **Supports Multiple Formatters**: Leverage the power of `treefmt` to format JavaScript, TypeScript, Python, Markdown, HTML, CSS, JSON, YAML, and more.
- **Configuration File**: Uses a `treefmt.toml` file to define your formatting rules.
- **Bundled or System `treefmt`**: Choose between using the bundled version of `treefmt` or the system-installed version.
- **Supports Multiple Versions**: Supports both the original Rust version and the new Go-based `treefmt2` version.

## Requirements

- Visual Studio Code version 1.60.0 or higher.
- `treefmt.toml` configuration file in the root of your project.

## Extension Settings

This extension contributes the following settings:

- `treefmt.useVersion`: Choose which version of `treefmt` to use (`treefmt` for the original version or `treefmt2` for the new version).

## Commands

This extension provides the following commands:

- `treefmt-vscode.runTreefmt`: Run `treefmt` on the current file.

## Usage

1. **Install the Extension**: Search for `treefmt-vscode` in the VS Code marketplace and install it.
1. **Create Configuration**: Create a `treefmt.toml` file in the root of your project and define your formatting rules.
1. **Run Formatter**: Use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS) and run `Treefmt: Run Treefmt` or set up auto-format on save.

## Example `treefmt.toml`

```toml
[formatter.prettier]
command = "prettier --write"
options = []
includes = ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"]

[formatter.black]
command = "black"
options = []
includes = ["**/*.py"]

[formatter.prettier-markdown]
command = "prettier --write"
options = []
includes = ["**/*.md"]

[formatter.prettier-html]
command = "prettier --write"
options = []
includes = ["**/*.html"]

[formatter.prettier-css]
command = "prettier --write"
options = []
includes = ["**/*.css", "**/*.scss", "**/*.sass"]

[formatter.prettier-json]
command = "prettier --write"
options = []
includes = ["**/*.json"]

[formatter.prettier-yaml]
command = "prettier --write"
options = []
includes = ["**/*.yaml", "**/*.yml"]
```

## Known Issues

- Ensure `treefmt.toml` is properly configured in the root of your project.
- For any issues related to `treefmt` itself, please refer to the [treefmt GitHub repository](https://github.com/numtide/treefmt).

## Release Notes

### 1.0.0

- Initial release of `treefmt-vscode`.
- Support for both `treefmt` and `treefmt2`.
- Configuration option to choose which version to use.
- Automatic formatting and command to run `treefmt`.

## License

GPL-3.0

**Enjoy using treefmt-vscode!**
