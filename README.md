# Treefmt VS Code Extension

<p align="center">

<a href="https://github.com/isbecker/treefmt-vscode/actions/workflows/release.yml">
  <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/isbecker/treefmt-vscode/release.yml">
</a>
<a href="https://github.com/isbecker/treefmt-vscode/releases">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/isbecker/treefmt-vscode">
</a>
<a href="https://marketplace.visualstudio.com/items?itemName=ibecker.treefmt-vscode">
  <img alt="VS Code Marketplace Downloads" src="https://img.shields.io/visual-studio-marketplace/d/ibecker.treefmt-vscode">
</a>
<a href="https://marketplace.visualstudio.com/items?itemName=ibecker.treefmt-vscode">
  <img alt="VS Code Marketplace Installs" src="https://img.shields.io/visual-studio-marketplace/i/ibecker.treefmt-vscode">
</a>

</p>

This VS Code extension provides integration with [treefmt](https://github.com/numtide/treefmt), a multi-language code formatter. It allows you to format your code based on the configuration defined in your `treefmt.toml` file.

## Features

- Automatically formats your code based on `treefmt.toml` configuration.
- Supports a wide range of languages through various formatters.
- No additional configuration needed within the extension.
- Can be set as the default formatter in VS Code.

## Installation

You can install it directly from the Visual Studio [Marketplace](https://marketplace.visualstudio.com/items?itemName=ibecker.treefmt-vscode).

Alternatively, open the Extensions view (Ctrl+Shift+X), search for `treefmt`, and click Install.

Or, you can install it from the command line:

```bash
code --install-extension ibecker.treefmt-vscode
```

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
