{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = with pkgs; [
    nim
    nimble
    pkg-config
    gtk4
    glib
    pango
    cairo
    graphene
    gdk-pixbuf
  ];

  shellHook = ''
    echo "Nix shell ready for owlkettle development"
    echo "Run: nimble runOwlDefault or nimble runOwlCustom"
  '';
}
