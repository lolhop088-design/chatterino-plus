using System;
using System.Collections.Generic;

namespace BusinessEmpire.Core.Events
{
    /// <summary>
    /// Централізована шина подій. Події з симуляції ставляться в чергу й розсилаються
    /// пакетом після тіку (Dispatch), щоб UI не реагував посеред розрахунків.
    /// </summary>
    public class EventBus
    {
        private class Entry { public Delegate Original; public Action<object> Invoke; }
        private readonly Dictionary<Type, List<Entry>> _handlers = new Dictionary<Type, List<Entry>>();
        private readonly Queue<object> _queue = new Queue<object>();

        public void Subscribe<T>(Action<T> handler)
        {
            if (!_handlers.TryGetValue(typeof(T), out var list)) _handlers[typeof(T)] = list = new List<Entry>();
            list.Add(new Entry { Original = handler, Invoke = o => handler((T)o) });
        }

        public void Unsubscribe<T>(Action<T> handler)
        {
            if (_handlers.TryGetValue(typeof(T), out var list)) list.RemoveAll(e => e.Original.Equals(handler));
        }

        public void Publish<T>(T evt) => _queue.Enqueue(evt);

        public int Pending => _queue.Count;

        public void Dispatch()
        {
            var guard = 0;
            while (_queue.Count > 0 && guard++ < 10000)
            {
                var evt = _queue.Dequeue();
                if (!_handlers.TryGetValue(evt.GetType(), out var list)) continue;
                foreach (var h in list.ToArray()) h.Invoke(evt);
            }
        }
    }

    public enum Severity { Info, Good, Warning, Bad }

    public class NotificationEvent
    {
        public string Message;
        public Severity Severity;
        public NotificationEvent(string message, Severity severity = Severity.Info) { Message = message; Severity = severity; }
    }

    public class HourPassedEvent { public int Hour; }
    public class DayClosedEvent { public Finance.DailyReport Report; }
    public class StateChangedEvent { }
    public class BankruptcyEvent { public int Day; }
}
