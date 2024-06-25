# Treefmt VS Code Extension

This VS Code extension provides integration with [treefmt](https://github.com/numtide/treefmt), a multi-language code formatter. It allows you to format your code based on the configuration defined in your `treefmt.toml` file.

## Features

- Automatically formats your code based on `treefmt.toml` configuration.
- Supports a wide range of languages through various formatters.
- No additional configuration needed within the extension.
- Can be set as the default formatter in VS Code.

## Installation

### Stable Version

The stable version of this extension uses the current stable release of `treefmt`. You can install it directly from the Visual Studio [Marketplace](https://marketplace.visualstudio.com/items?itemName=ibecker.treefmt-vscode).

### Pre-release Version

If you want to use the new `treefmt` v2 (Go rewrite), you can install the pre-release version of this extension. This version includes the latest `treefmt` v2 release candidate.

To install the pre-release version:

1. Search for `treefmt-vscode` in the Extensions view (`Ctrl+Shift+X`).
1. Click the dropdown arrow next to the Install button.
1. Select `Install Pre-Release Version`.

You will be using the latest pre-release version of the extension, which includes the new `treefmt` v2.0.0-rc5.

## Usage

### Configuration

The extension uses the `treefmt.toml` file located in the root of your project directory.
You can create this file manually or use the `treefmt --init` command to generate a template.
If you try to format a file without a `treefmt.toml` file, the extension will display an message and offer
to run `treefmt --init` on your behalf.

### Setting as Default Formatter

To set this extension as the default formatter for your workspace:

1. Open VS Code settings (`Ctrl+,`).
1. Search for `default formatter`.
1. Set the default formatter to `Treefmt`.

Now, every time you format a file, `treefmt` will be used according to your `treefmt.toml` configuration.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the extension.

## License

This project is licensed under the GPLv3 License.
