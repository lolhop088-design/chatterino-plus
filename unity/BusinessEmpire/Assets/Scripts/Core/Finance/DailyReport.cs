using System;
using System.Collections.Generic;
using BusinessEmpire.Core.Common;

namespace BusinessEmpire.Core.Finance
{
    /// <summary>Підсумок дня по одному магазину (метод нарахування: собівартість — лише проданого).</summary>
    [Serializable]
    public class StoreDayReport
    {
        public string StoreId;
        public string StoreName;
        public Money Revenue;
        public Money CostOfGoods;
        public Money Wages;
        public Money Rent;
        public Money Maintenance;
        public Money Spoilage;
        public int Customers;
        public int LostCustomers;
        public int UnitsSold;
        public int UnitsMissed;
        public double Satisfaction;
        public double Reputation;

        public Money GrossProfit => Revenue - CostOfGoods;
        public Money OperatingProfit => Revenue - CostOfGoods - Wages - Rent - Maintenance - Spoilage;
    }

    /// <summary>Щоденний фінансовий звіт компанії: прибутки й збитки + рух грошей.</summary>
    [Serializable]
    public class DailyReport
    {
        public int Day;
        public DateTime Date;
        public List<StoreDayReport> Stores = new List<StoreDayReport>();
        public Money OtherExpenses;
        public Money CashIn;
        public Money CashOut;
        public Money OpeningBalance;
        public Money ClosingBalance;

        public Money Revenue { get { var m = Money.Zero; foreach (var s in Stores) m += s.Revenue; return m; } }
        public Money CostOfGoods { get { var m = Money.Zero; foreach (var s in Stores) m += s.CostOfGoods; return m; } }
        public Money Wages { get { var m = Money.Zero; foreach (var s in Stores) m += s.Wages; return m; } }
        public Money Rent { get { var m = Money.Zero; foreach (var s in Stores) m += s.Rent + s.Maintenance; return m; } }
        public Money Spoilage { get { var m = Money.Zero; foreach (var s in Stores) m += s.Spoilage; return m; } }
        public Money NetProfit { get { var m = -OtherExpenses; foreach (var s in Stores) m += s.OperatingProfit; return m; } }
        public int Customers { get { var c = 0; foreach (var s in Stores) c += s.Customers; return c; } }
        public int LostCustomers { get { var c = 0; foreach (var s in Stores) c += s.LostCustomers; return c; } }
    }
}
