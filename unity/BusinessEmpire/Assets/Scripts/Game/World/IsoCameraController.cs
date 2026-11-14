using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace BusinessEmpire.Game.World
{
    /// <summary>
    /// Ізометрична камера для сенсорного екрана:
    /// один палець — переміщення, два пальці — масштаб (щипок) і поворот, дотик — вибір будівлі.
    /// У редакторі: ЛКМ — переміщення, ПКМ — поворот, колесо — масштаб.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class IsoCameraController : MonoBehaviour
    {
        public Vector3 Target = Vector3.zero;
        public float Distance = 110f;
        public float Yaw = 45f;
        public float Pitch = 48f;
        public float MinDistance = 35f, MaxDistance = 230f;
        public Vector2 BoundsMin = new Vector2(-110, -110), BoundsMax = new Vector2(110, 110);

        /// <summary>Дотик (не перетягування) по світу: передає промінь для вибору об’єкта.</summary>
        public event Action<Ray> Tapped;

        private Camera _cam;
        private Vector3 _goalTarget;
        private float _goalDistance, _goalYaw;
        private bool _dragging;
        private Vector2 _pressPos;
        private float _pressTime;
        private Vector3 _lastWorld;
        private float _lastPinchDist, _lastPinchAngle;
        private bool _pinching;
        private bool _pressOverUi;

        private void Awake()
        {
            _cam = GetComponent<Camera>();
            _goalTarget = Target; _goalDistance = Distance; _goalYaw = Yaw;
        }

        public void FocusOn(Vector3 world, float distance = 60f)
        {
            _goalTarget = new Vector3(world.x, 0, world.z);
            _goalDistance = Mathf.Clamp(distance, MinDistance, MaxDistance);
        }

        public void Zoom(float factor) => _goalDistance = Mathf.Clamp(_goalDistance * factor, MinDistance, MaxDistance);
        public void Rotate(float degrees) => _goalYaw += degrees;

        private void Update()
        {
            if (Input.touchSupported && Input.touchCount > 0) HandleTouch();
            else HandleMouse();

            var k = 1f - Mathf.Exp(-12f * Time.unscaledDeltaTime);
            Target = Vector3.Lerp(Target, _goalTarget, k);
            Distance = Mathf.Lerp(Distance, _goalDistance, k);
            Yaw = Mathf.LerpAngle(Yaw, _goalYaw, k);
            Apply();
        }

        private void Apply()
        {
            var rot = Quaternion.Euler(Pitch, Yaw, 0);
            transform.position = Target - rot * Vector3.forward * Distance;
            transform.rotation = rot;
        }

        private static bool OverUi(int pointerId)
        {
            var es = EventSystem.current;
            return es != null && (pointerId < 0 ? es.IsPointerOverGameObject() : es.IsPointerOverGameObject(pointerId));
        }

        private bool GroundPoint(Vector2 screen, out Vector3 world)
        {
            var ray = _cam.ScreenPointToRay(screen);
            var plane = new Plane(Vector3.up, Vector3.zero);
            if (plane.Raycast(ray, out var d)) { world = ray.GetPoint(d); return true; }
            world = Vector3.zero;
            return false;
        }

        private void PanTo(Vector2 screen)
        {
            Apply(); // точка під пальцем рахується від поточної позиції камери
            if (!GroundPoint(screen, out var now)) return;
            var delta = _lastWorld - now;
            _goalTarget += new Vector3(delta.x, 0, delta.z);
            Target += new Vector3(delta.x, 0, delta.z);
            _goalTarget.x = Mathf.Clamp(_goalTarget.x, BoundsMin.x, BoundsMax.x);
            _goalTarget.z = Mathf.Clamp(_goalTarget.z, BoundsMin.y, BoundsMax.y);
            Apply();
            GroundPoint(screen, out _lastWorld);
        }

        private void HandleTouch()
        {
            if (Input.touchCount >= 2)
            {
                var a = Input.GetTouch(0); var b = Input.GetTouch(1);
                var dist = Vector2.Distance(a.position, b.position);
                var angle = Mathf.Atan2(b.position.y - a.position.y, b.position.x - a.position.x) * Mathf.Rad2Deg;
                if (!_pinching) { _pinching = true; _lastPinchDist = dist; _lastPinchAngle = angle; _dragging = false; return; }
                if (dist > 1f) _goalDistance = Mathf.Clamp(_goalDistance * (_lastPinchDist / dist), MinDistance, MaxDistance);
                _goalYaw -= Mathf.DeltaAngle(_lastPinchAngle, angle);
                _lastPinchDist = dist; _lastPinchAngle = angle;
                return;
            }
            var t = Input.GetTouch(0);
            if (_pinching) { _pinching = false; GroundPoint(t.position, out _lastWorld); _pressTime = -10; return; }
            switch (t.phase)
            {
                case TouchPhase.Began:
                    _pressOverUi = OverUi(t.fingerId);
                    _pressPos = t.position; _pressTime = Time.unscaledTime; _dragging = false;
                    GroundPoint(t.position, out _lastWorld);
                    break;
                case TouchPhase.Moved:
                    if (_pressOverUi) break;
                    if (!_dragging && (t.position - _pressPos).magnitude > Screen.dpi * 0.06f + 6) _dragging = true;
                    if (_dragging) PanTo(t.position);
                    break;
                case TouchPhase.Ended:
                    if (!_pressOverUi && !_dragging && Time.unscaledTime - _pressTime < 0.4f) Tapped?.Invoke(_cam.ScreenPointToRay(t.position));
                    _dragging = false;
                    break;
                case TouchPhase.Canceled:
                    _dragging = false;
                    break;
            }
        }

        private void HandleMouse()
        {
            var scroll = Input.mouseScrollDelta.y;
            if (Mathf.Abs(scroll) > 0.01f && !OverUi(-1)) Zoom(1f - scroll * 0.1f);
            if (Input.GetMouseButtonDown(0))
            {
                _pressOverUi = OverUi(-1);
                _pressPos = Input.mousePosition; _pressTime = Time.unscaledTime; _dragging = false;
                GroundPoint(Input.mousePosition, out _lastWorld);
            }
            else if (Input.GetMouseButton(0) && !_pressOverUi)
            {
                if (!_dragging && ((Vector2)Input.mousePosition - _pressPos).magnitude > 8) _dragging = true;
                if (_dragging) PanTo(Input.mousePosition);
            }
            else if (Input.GetMouseButtonUp(0))
            {
                if (!_pressOverUi && !_dragging) Tapped?.Invoke(_cam.ScreenPointToRay(Input.mousePosition));
                _dragging = false;
            }
            if (Input.GetMouseButton(1)) _goalYaw += Input.GetAxis("Mouse X") * 4f;
        }
    }
}
