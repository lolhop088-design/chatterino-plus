using System;
using System.Collections.Generic;
using BusinessEmpire.Core.Common;

namespace BusinessEmpire.Core.Finance
{
    public enum TxCategory
    {
        Sales, Purchases, Wages, Rent, Maintenance, PropertyPurchase, PropertySale, Deposit, DepositRefund,
        Equipment, EquipmentSale, Training, Severance, Other,
    }

    [Serializable]
    public class Transaction
    {
        public int Day;
        public TxCategory Category;
        public Money Amount;
        public string Memo;
    }

    /// <summary>Розрахунковий рахунок компанії. Кожен рух грошей проходить через нього.</summary>
    [Serializable]
    public class BankAccount
    {
        public Money Balance;
        public List<Transaction> History = new List<Transaction>();
        public const int MaxHistory = 300;

        public void Credit(Money amount, TxCategory cat, string memo, int day) => Post(amount, cat, memo, day);

        /// <summary>Списання лише за наявності коштів (закупівлі, покупки, найм).</summary>
        public bool TryDebit(Money amount, TxCategory cat, string memo, int day)
        {
            if (amount > Balance) return false;
            Post(-amount, cat, memo, day);
            return true;
        }

        /// <summary>Обов’язкові платежі (зарплата, оренда) списуються навіть у мінус.</summary>
        public void ForceDebit(Money amount, TxCategory cat, string memo, int day) => Post(-amount, cat, memo, day);

        private void Post(Money signed, TxCategory cat, string memo, int day)
        {
            if (signed == Money.Zero) return;
            Balance += signed;
            // Продажі йдуть щогодини — зливаємо їх в один запис за день, щоб історія лишалась читабельною.
            if (History.Count > 0)
            {
                var last = History[History.Count - 1];
                if (last.Day == day && last.Category == cat && last.Memo == memo) { last.Amount += signed; return; }
            }
            History.Add(new Transaction { Day = day, Category = cat, Amount = signed, Memo = memo });
            if (History.Count > MaxHistory) History.RemoveAt(0);
        }
    }
}
