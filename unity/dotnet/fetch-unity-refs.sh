#!/usr/bin/env bash
# Завантажує reference-збірки UnityEngine з NuGet для перевірки компіляції Unity-шару без Unity Editor.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .unityrefs && cd .unityrefs
[ -d mod ] || { curl -sSL -o mod.nupkg https://api.nuget.org/v3-flatcontainer/unityengine.modules/2021.3.33/unityengine.modules.2021.3.33.nupkg && unzip -q -o mod.nupkg -d mod; }
[ -d ui ] || { curl -sSL -o ui.nupkg https://api.nuget.org/v3-flatcontainer/unity3d.unityengine.ui/2020.3.21/unity3d.unityengine.ui.2020.3.21.nupkg && unzip -q -o ui.nupkg -d ui; }
# Архіви NuGet бувають без прав на читання — відновлюємо їх (інакше MSBuild: access denied).
chmod -R u+rwX,go+rX .
echo "Unity reference assemblies ready in $(pwd)"
