#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
python_bin="${PYTHON:-python3}"
: "${APPIMAGETOOL:?Définir APPIMAGETOOL vers appimagetool (voir admin/README.md)}"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/vaso-admin-appimage.XXXXXX")"
trap 'rm -rf -- "$build_dir"' EXIT
output_dir="$repo_dir/dist-admin"
mkdir -p "$output_dir"
"$python_bin" -m PyInstaller --noconfirm --clean --onedir --name vaso-admin \
  --distpath "$build_dir/dist" --workpath "$build_dir/work" --specpath "$build_dir" \
  --hidden-import PIL.ImageTk --hidden-import PIL._tkinter_finder "$repo_dir/admin/vaso_admin.py"
app_dir="$build_dir/VASO-Admin.AppDir"
mkdir -p "$app_dir/usr/bin"
cp -a "$build_dir/dist/vaso-admin/." "$app_dir/usr/bin/"
cp "$repo_dir/admin/linux/vaso-admin.desktop" "$repo_dir/admin/linux/vaso-admin.svg" "$app_dir/"
cat > "$app_dir/AppRun" <<'APPRUN'
#!/bin/sh
app_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$app_dir/usr/bin/vaso-admin" "$@"
APPRUN
chmod +x "$app_dir/AppRun"
runtime_args=()
if [[ -n "${APPIMAGE_RUNTIME:-}" ]]; then
  runtime_args=(--runtime-file "$APPIMAGE_RUNTIME")
fi
ARCH="$(uname -m)" APPIMAGE_EXTRACT_AND_RUN=1 "$APPIMAGETOOL" "${runtime_args[@]}" "$app_dir" "$output_dir/VASO-Admin-$(uname -m).AppImage"
chmod +x "$output_dir/VASO-Admin-$(uname -m).AppImage"
printf 'AppImage : %s\n' "$output_dir/VASO-Admin-$(uname -m).AppImage"
