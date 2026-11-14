using System;
using UnityEngine;
using UnityEngine.UI;

namespace BusinessEmpire.Game.UI
{
    /// <summary>Палітра в стилі макета: темно-синій «фінансовий термінал» із золотими акцентами.</summary>
    public static class Theme
    {
        public static readonly Color Bg = Hex("0A1424", 0.94f);
        public static readonly Color Panel = Hex("10213A", 0.96f);
        public static readonly Color Panel2 = Hex("172E4D");
        public static readonly Color Row = Hex("1B3456");
        public static readonly Color Border = Hex("2D5283");
        public static readonly Color Gold = Hex("F5B941");
        public static readonly Color GoldDark = Hex("B9801A");
        public static readonly Color Text = Hex("E8EEF7");
        public static readonly Color Muted = Hex("8FA3BF");
        public static readonly Color Green = Hex("3DDC84");
        public static readonly Color Red = Hex("FF5A5F");
        public static readonly Color Blue = Hex("3FA7FF");
        public static readonly Color Dim = new Color(0, 0, 0, 0.55f);

        public static Color Hex(string hex, float a = 1f)
        {
            ColorUtility.TryParseHtmlString("#" + hex, out var c);
            c.a = a;
            return c;
        }
    }

    /// <summary>Будівник інтерфейсу uGUI з коду (без префабів): панелі, тексти, кнопки, списки.</summary>
    public static class UIKit
    {
        private static Font _font;
        private static Sprite _rounded, _circle;

        public static Font Font
        {
            get
            {
                if (_font != null) return _font;
                try { _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); } catch { /* старі версії */ }
                if (_font == null) { try { _font = Resources.GetBuiltinResource<Font>("Arial.ttf"); } catch { /* немає */ } }
                return _font;
            }
        }

        public static Sprite Rounded => _rounded != null ? _rounded : (_rounded = MakeRounded(64, 16));
        public static Sprite Circle => _circle != null ? _circle : (_circle = MakeRounded(64, 32));

        private static Sprite MakeRounded(int size, int radius)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            var px = new Color32[size * size];
            for (var y = 0; y < size; y++)
            for (var x = 0; x < size; x++)
            {
                var cx = Mathf.Clamp(x + 0.5f, radius, size - radius);
                var cy = Mathf.Clamp(y + 0.5f, radius, size - radius);
                var d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(cx, cy));
                var a = Mathf.Clamp01(radius - d + 0.5f);
                px[y * size + x] = new Color32(255, 255, 255, (byte)(a * 255));
            }
            tex.SetPixels32(px);
            tex.Apply(false, true);
            var border = Mathf.Min(radius, size / 2 - 1);
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100, 0, SpriteMeshType.FullRect, new Vector4(border, border, border, border));
        }

        public static RectTransform Rect(string name, Transform parent)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.layer = 5;
            go.transform.SetParent(parent, false);
            return (RectTransform)go.transform;
        }

        public static Image Panel(Transform parent, Color color, string name = "Panel", bool rounded = true)
        {
            var rt = Rect(name, parent);
            var img = rt.gameObject.AddComponent<Image>();
            img.color = color;
            if (rounded) { img.sprite = Rounded; img.type = Image.Type.Sliced; }
            return img;
        }

        public static Text Label(Transform parent, string text, int size = 26, Color? color = null, TextAnchor anchor = TextAnchor.MiddleLeft, FontStyle style = FontStyle.Normal)
        {
            var rt = Rect("Text", parent);
            var t = rt.gameObject.AddComponent<Text>();
            t.font = Font;
            t.text = text;
            t.fontSize = size;
            t.color = color ?? Theme.Text;
            t.alignment = anchor;
            t.fontStyle = style;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            t.supportRichText = true;
            return t;
        }

        public static Button Button(Transform parent, string text, Action onClick, Color? bg = null, Color? fg = null, int size = 24, bool enabled = true)
        {
            var img = Panel(parent, bg ?? Theme.Panel2, "Button");
            var b = img.gameObject.AddComponent<Button>();
            var cb = b.colors;
            cb.highlightedColor = new Color(1.1f, 1.1f, 1.1f);
            cb.pressedColor = new Color(0.75f, 0.75f, 0.75f);
            cb.disabledColor = new Color(0.55f, 0.55f, 0.55f, 0.6f);
            b.colors = cb;
            var t = Label(img.transform, text, size, fg ?? Theme.Text, TextAnchor.MiddleCenter, FontStyle.Bold);
            Stretch(t.rectTransform, 10, 4, 10, 4);
            if (onClick != null) b.onClick.AddListener(() => onClick());
            b.interactable = enabled;
            return b;
        }

        public static Button GoldButton(Transform parent, string text, Action onClick, int size = 24, bool enabled = true)
            => Button(parent, text, onClick, Theme.Gold, Hex0("1A1205"), size, enabled);

        private static Color Hex0(string h) => Theme.Hex(h);

        public static void Stretch(RectTransform rt, float left = 0, float top = 0, float right = 0, float bottom = 0)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(left, bottom);
            rt.offsetMax = new Vector2(-right, -top);
        }

        /// <summary>Прив’язка до кута/краю: anchor 0..1, позиція й розмір у пікселях макета.</summary>
        public static void Place(RectTransform rt, Vector2 anchor, Vector2 pivot, Vector2 pos, Vector2 size)
        {
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot = pivot;
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
        }

        public static VerticalLayoutGroup VLayout(Component c, float spacing = 8, int pad = 0)
        {
            var l = c.gameObject.AddComponent<VerticalLayoutGroup>();
            l.spacing = spacing;
            l.padding = new RectOffset(pad, pad, pad, pad);
            l.childControlWidth = true; l.childControlHeight = true;
            l.childForceExpandWidth = true; l.childForceExpandHeight = false;
            return l;
        }

        public static HorizontalLayoutGroup HLayout(Component c, float spacing = 8, int pad = 0)
        {
            var l = c.gameObject.AddComponent<HorizontalLayoutGroup>();
            l.spacing = spacing;
            l.padding = new RectOffset(pad, pad, pad, pad);
            l.childControlWidth = true; l.childControlHeight = true;
            l.childForceExpandWidth = false; l.childForceExpandHeight = true;
            l.childAlignment = TextAnchor.MiddleLeft;
            return l;
        }

        public static LayoutElement Size(Component c, float width = -1, float height = -1, float flexWidth = -1, float flexHeight = -1)
        {
            var le = c.GetComponent<LayoutElement>();
            if (le == null) le = c.gameObject.AddComponent<LayoutElement>(); // не «??»: Unity-null не є C#-null
            if (width >= 0) le.preferredWidth = width;
            if (height >= 0) { le.preferredHeight = height; le.minHeight = height; }
            if (flexWidth >= 0) le.flexibleWidth = flexWidth;
            if (flexHeight >= 0) le.flexibleHeight = flexHeight;
            return le;
        }

        /// <summary>Рядок з горизонтальною розкладкою фіксованої висоти.</summary>
        public static RectTransform Row(Transform parent, float height, float spacing = 10, Color? bg = null)
        {
            RectTransform rt;
            if (bg.HasValue) rt = Panel(parent, bg.Value, "Row").rectTransform;
            else rt = Rect("Row", parent);
            var l = HLayout(rt, spacing, bg.HasValue ? 10 : 0);
            l.padding = new RectOffset(bg.HasValue ? 16 : 0, bg.HasValue ? 12 : 0, 4, 4);
            Size(rt, -1, height);
            return rt;
        }

        /// <summary>Вертикальний список із прокруткою пальцем. Повертає контейнер для елементів.</summary>
        public static RectTransform Scroll(Transform parent, out ScrollRect scroll)
        {
            var root = Rect("Scroll", parent);
            scroll = root.gameObject.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 40;
            var viewport = Rect("Viewport", root);
            Stretch(viewport);
            viewport.gameObject.AddComponent<RectMask2D>();
            var vpImg = viewport.gameObject.AddComponent<Image>();
            vpImg.color = new Color(0, 0, 0, 0.001f);
            var content = Rect("Content", viewport);
            content.anchorMin = new Vector2(0, 1);
            content.anchorMax = new Vector2(1, 1);
            content.pivot = new Vector2(0.5f, 1);
            content.offsetMin = content.offsetMax = Vector2.zero;
            var vl = VLayout(content, 8, 0);
            vl.padding = new RectOffset(4, 14, 4, 24);
            var fit = content.gameObject.AddComponent<ContentSizeFitter>();
            fit.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scroll.viewport = viewport;
            scroll.content = content;
            return content;
        }

        public static InputField Input(Transform parent, string value, string placeholder, int size = 28)
        {
            var bg = Panel(parent, Theme.Row, "Input");
            var field = bg.gameObject.AddComponent<InputField>();
            var text = Label(bg.transform, "", size);
            text.supportRichText = false;
            Stretch(text.rectTransform, 16, 6, 16, 6);
            var ph = Label(bg.transform, placeholder, size, Theme.Muted, TextAnchor.MiddleLeft, FontStyle.Italic);
            Stretch(ph.rectTransform, 16, 6, 16, 6);
            field.textComponent = text;
            field.placeholder = ph;
            field.text = value;
            field.lineType = InputField.LineType.SingleLine;
            return field;
        }

        /// <summary>Горизонтальна смужка-індикатор 0..1.</summary>
        public static void Bar(Transform parent, float value01, Color color, float height = 10)
        {
            var bg = Panel(parent, Theme.Row, "Bar");
            Size(bg, -1, height, 1);
            var fill = Panel(bg.transform, color, "Fill");
            fill.rectTransform.anchorMin = Vector2.zero;
            fill.rectTransform.anchorMax = new Vector2(Mathf.Clamp01(value01), 1);
            fill.rectTransform.offsetMin = fill.rectTransform.offsetMax = Vector2.zero;
        }

        public static void Clear(Transform t)
        {
            for (var i = t.childCount - 1; i >= 0; i--)
            {
                var go = t.GetChild(i).gameObject;
                go.SetActive(false); // одразу прибрати з розкладки, знищення — в кінці кадру
                UnityEngine.Object.Destroy(go);
            }
        }

        public static string Colored(string text, Color c) => $"<color=#{ColorUtility.ToHtmlStringRGB(c)}>{text}</color>";
    }
}
