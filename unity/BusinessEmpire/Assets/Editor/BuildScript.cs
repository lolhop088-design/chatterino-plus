using System;
using System.IO;
using BusinessEmpire.Game.Bootstrap;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace BusinessEmpire.EditorTools
{
    /// <summary>
    /// Готує проєкт і збирає APK без ручної роботи в редакторі:
    /// URP-ассет, базові матеріали (щоб шейдери потрапили в збірку), сцена Main з GameBootstrap,
    /// налаштування Android (IL2CPP, ARM64, landscape, постійний ключ підпису).
    /// Викликається з CI: -executeMethod BusinessEmpire.EditorTools.BuildScript.BuildAndroid
    /// </summary>
    public static class BuildScript
    {
        private const string ScenePath = "Assets/Scenes/Main.unity";
        private const string UrpPath = "Assets/Settings/BE_URP.asset";
        private const string UrpRendererPath = "Assets/Settings/BE_URP_Renderer.asset";

        [MenuItem("Business Empire/Prepare Project")]
        public static void Prepare()
        {
            EnsureUrp();
            EnsureMaterials();
            EnsureScene();
            ConfigurePlayer();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }

        [MenuItem("Business Empire/Build Android APK")]
        public static void BuildAndroid()
        {
            Prepare();
            var output = GetArg("-customBuildPath") ?? "Builds/Android/BusinessEmpireUltimate.apk";
            if (!output.EndsWith(".apk", StringComparison.OrdinalIgnoreCase)) output = Path.Combine(output, "BusinessEmpireUltimate.apk");
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(output)));
            EditorUserBuildSettings.buildAppBundle = false;
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.None,
            });
            Debug.Log($"[BuildScript] Result: {report.summary.result}, size {report.summary.totalSize / 1048576f:0.0} MB, errors {report.summary.totalErrors}");
            if (report.summary.result != BuildResult.Succeeded && Application.isBatchMode) EditorApplication.Exit(1);
        }

        private static string GetArg(string name)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length - 1; i++) if (args[i] == name) return args[i + 1];
            return null;
        }

        private static void EnsureUrp()
        {
            Directory.CreateDirectory("Assets/Settings");
            var urp = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(UrpPath);
            if (urp == null)
            {
                var rendererData = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(rendererData, UrpRendererPath);
                urp = UniversalRenderPipelineAsset.Create(rendererData);
                AssetDatabase.CreateAsset(urp, UrpPath);
            }
            // Мобільний профіль: без HDR і зайвих текстур глибини; MSAA ×2; тіні до 150 м.
            urp.supportsHDR = false;
            urp.msaaSampleCount = 2;
            urp.renderScale = 1f;
            urp.shadowDistance = 150f;
            urp.supportsCameraDepthTexture = false;
            urp.supportsCameraOpaqueTexture = false;
            EditorUtility.SetDirty(urp);
            GraphicsSettings.defaultRenderPipeline = urp;
            var current = QualitySettings.GetQualityLevel();
            for (var i = 0; i < QualitySettings.names.Length; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                QualitySettings.renderPipeline = urp;
            }
            QualitySettings.SetQualityLevel(current, false);
        }

        private static void EnsureMaterials()
        {
            Directory.CreateDirectory("Assets/Resources/Materials");
            CreateMaterial("Assets/Resources/Materials/BE_Lit.mat", "Universal Render Pipeline/Simple Lit");
            CreateMaterial("Assets/Resources/Materials/BE_Unlit.mat", "Universal Render Pipeline/Unlit");
        }

        private static void CreateMaterial(string path, string shaderName)
        {
            var shader = Shader.Find(shaderName);
            if (shader == null) throw new Exception("Shader not found: " + shaderName + " (чи встановлено URP?)");
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null)
            {
                mat = new Material(shader);
                AssetDatabase.CreateAsset(mat, path);
            }
            mat.shader = shader;
            mat.enableInstancing = true;
            EditorUtility.SetDirty(mat);
        }

        private static void EnsureScene()
        {
            Directory.CreateDirectory("Assets/Scenes");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            new GameObject("Bootstrap").AddComponent<GameBootstrap>();
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        private static void ConfigurePlayer()
        {
            int.TryParse(GetArg("-androidVersionCode") ?? "1", out var code);
            code = Math.Max(1, code);
            PlayerSettings.companyName = "BizImperia";
            PlayerSettings.productName = "Business Empire Ultimate";
            PlayerSettings.bundleVersion = "0.1." + code;
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.bizimperia.ultimate");
            PlayerSettings.Android.bundleVersionCode = code;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.SetManagedStrippingLevel(BuildTargetGroup.Android, ManagedStrippingLevel.Low);
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.OpenGLES3, GraphicsDeviceType.Vulkan });
            PlayerSettings.gpuSkinning = false;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.SplashScreen.showUnityLogo = false;

            // Постійний ключ — щоб нові APK ставились поверх старих.
            var keystore = Path.GetFullPath("Keystore/bizimperia.keystore");
            if (File.Exists(keystore))
            {
                PlayerSettings.Android.useCustomKeystore = true;
                PlayerSettings.Android.keystoreName = keystore;
                PlayerSettings.Android.keystorePass = "bizimperia";
                PlayerSettings.Android.keyaliasName = "bizimperia";
                PlayerSettings.Android.keyaliasPass = "bizimperia";
            }
        }
    }
}
