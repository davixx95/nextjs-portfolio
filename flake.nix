{
  description = "Next.js Portfolio Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    devenv.url = "github:cachix/devenv";
  };

  outputs = inputs @ {
    flake-parts,
    devenv,
    nixpkgs,
    ...
  }:
    flake-parts.lib.mkFlake {inherit inputs;} {
      imports = [
        devenv.flakeModule
      ];

      systems = nixpkgs.lib.systems.flakeExposed;

      perSystem = {
        config,
        self',
        inputs',
        pkgs,
        system,
        ...
      }: {
        devenv.shells.default = {
          name = "portfolio-dev";

          packages = with pkgs; [
            prettier
            eslint
          ];

          languages.javascript = {
            enable = true;
            package = pkgs.nodejs_22;
          };

          # workerd (wrangler dev) can't find a CA bundle on NixOS without this,
          # so outbound fetch() from local Workers fails TLS verification.
          env.NODE_EXTRA_CA_CERTS = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
        };
      };
    };
}
