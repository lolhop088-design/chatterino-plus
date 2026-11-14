using System.Collections.Generic;
using UnityEngine;

namespace BusinessEmpire.Game.World
{
    /// <summary>
    /// Спільні матеріали URP. Базові ассети створює скрипт збірки в Resources/Materials
    /// (щоб шейдери потрапили в APK); тут лише клонування під кольори з кешем.
    /// </summary>
    public static class MaterialLibrary
    {
        private static Material _lit, _unlit;
        private static readonly Dictionary<string, Material> Cache = new Dictionary<string, Material>();
        private static Mesh _cube, _capsule, _quad, _cylinder;

        private static Material BaseLit
        {
            get
            {
                if (_lit != null) return _lit;
                _lit = Resources.Load<Material>("Materials/BE_Lit");
                if (_lit == null) _lit = new Material(Shader.Find("Universal Render Pipeline/Simple Lit") ?? Shader.Find("Standard"));
                return _lit;
            }
        }

        private static Material BaseUnlit
        {
            get
            {
                if (_unlit != null) return _unlit;
                _unlit = Resources.Load<Material>("Materials/BE_Unlit");
                if (_unlit == null) _unlit = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Color"));
                return _unlit;
            }
        }

        public static Material Lit(Color c) => Get(c, false);
        public static Material Unlit(Color c) => Get(c, true);

        private static Material Get(Color c, bool unlit)
        {
            var key = (unlit ? "u" : "l") + ColorUtility.ToHtmlStringRGBA(c);
            if (Cache.TryGetValue(key, out var m) && m != null) return m;
            m = new Material(unlit ? BaseUnlit : BaseLit) { name = "BE_" + key, enableInstancing = true };
            SetColor(m, c);
            Cache[key] = m;
            return m;
        }

        /// <summary>Окремий (не кешований) матеріал, колір якого змінюється в часі (вікна вночі).</summary>
        public static Material UniqueUnlit(Color c)
        {
            var m = new Material(BaseUnlit) { enableInstancing = true };
            SetColor(m, c);
            return m;
        }

        public static void SetColor(Material m, Color c)
        {
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            if (m.HasProperty("_Color")) m.SetColor("_Color", c);
        }

        public static Mesh Cube => _cube != null ? _cube : (_cube = PrimitiveMesh(PrimitiveType.Cube));
        public static Mesh Capsule => _capsule != null ? _capsule : (_capsule = PrimitiveMesh(PrimitiveType.Capsule));
        public static Mesh Quad => _quad != null ? _quad : (_quad = PrimitiveMesh(PrimitiveType.Quad));
        public static Mesh Cylinder => _cylinder != null ? _cylinder : (_cylinder = PrimitiveMesh(PrimitiveType.Cylinder));

        private static Mesh PrimitiveMesh(PrimitiveType t)
        {
            var go = GameObject.CreatePrimitive(t);
            var mesh = go.GetComponent<MeshFilter>().sharedMesh;
            Object.Destroy(go);
            return mesh;
        }

        /// <summary>Кубічний блок (без колайдера) заданого кольору.</summary>
        public static GameObject Block(Transform parent, string name, Vector3 center, Vector3 size, Color color, bool unlit = false, bool shadows = true)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = center;
            go.transform.localScale = size;
            go.AddComponent<MeshFilter>().sharedMesh = Cube;
            var r = go.AddComponent<MeshRenderer>();
            r.sharedMaterial = unlit ? Unlit(color) : Lit(color);
            r.shadowCastingMode = shadows ? UnityEngine.Rendering.ShadowCastingMode.On : UnityEngine.Rendering.ShadowCastingMode.Off;
            return go;
        }
    }
}
