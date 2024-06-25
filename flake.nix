{
  description = "VSCode extension for treefmt";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv.url = "github:cachix/devenv";
  };

  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };

  outputs = inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.devenv.flakeModule
      ];
      systems = [ "x86_64-linux" "i686-linux" "x86_64-darwin" "aarch64-linux" "aarch64-darwin" ];

      perSystem = { config, self', inputs', pkgs, system, lib, ... }: {
        packages.default = pkgs.git;

        devenv.shells.default = {
          name = "treefmt-vscode";

          dotenv = {
            enable = true;
            filename = ".env.local";
          };

          languages = {
            typescript = {
              enable = true;
            };
            javascript = {
              enable = true;
              npm.enable = true;
            };
          };

          pre-commit.hooks = {
            treefmt = {
              package = pkgs.treefmt2;
              enable = true;
              settings = {
                formatters = [
                  pkgs.nixpkgs-fmt
                  pkgs.biome
                  pkgs.mdformat
                  pkgs.taplo # TOML - primarily just for the treefmt config files
                  pkgs.typos
                ];
              };
            };
          };

          packages = [
            config.packages.default
            pkgs.just
            pkgs.direnv
          ];
        };
      };
    };
}
