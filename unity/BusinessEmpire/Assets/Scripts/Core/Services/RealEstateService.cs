using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Finance;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.World;

namespace BusinessEmpire.Core.Services
{
    /// <summary>Оренда, купівля та звільнення комерційних приміщень.</summary>
    public class RealEstateService
    {
        public const int DepositDays = 14;
        private readonly GameSimulation _sim;
        public RealEstateService(GameSimulation sim) { _sim = sim; }

        private GameState S => _sim.State;

        public Money DailyRent(Premises p) => S.City.DailyRent(p, S.Macro);
        public Money PurchasePrice(Premises p) => S.City.MarketValue(p, S.Macro);
        public Money Deposit(Premises p) => DailyRent(p) * (long)DepositDays;

        public OpResult Rent(string premisesId)
        {
            var p = S.City.GetPremises(premisesId);
            if (p == null) return OpResult.Fail("Приміщення не знайдено.");
            if (p.Tenure != Tenure.Available) return OpResult.Fail("Приміщення недоступне.");
            var dep = Deposit(p);
            if (!S.Account.TryDebit(dep, TxCategory.Deposit, "Депозит за оренду " + p.Address, _sim.Day))
                return OpResult.Fail($"Потрібен депозит {dep.Format()}.");
            p.Tenure = Tenure.Rented;
            p.DepositPaid = dep;
            _sim.Notify($"Орендовано приміщення: {p.Address}. Оренда {DailyRent(p).Format()}/день.", Severity.Good);
            _sim.Changed();
            return OpResult.Success;
        }

        public OpResult Buy(string premisesId)
        {
            var p = S.City.GetPremises(premisesId);
            if (p == null) return OpResult.Fail("Приміщення не знайдено.");
            if (p.Tenure == Tenure.Owned || p.Tenure == Tenure.Competitor) return OpResult.Fail("Приміщення не продається.");
            var price = PurchasePrice(p);
            // Якщо вже орендуємо — депозит зараховується в ціну.
            var credit = p.Tenure == Tenure.Rented ? p.DepositPaid : Money.Zero;
            var toPay = price - credit;
            if (!S.Account.TryDebit(toPay, TxCategory.PropertyPurchase, "Купівля " + p.Address, _sim.Day))
                return OpResult.Fail($"Потрібно {toPay.Format()}.");
            p.Tenure = Tenure.Owned;
            p.DepositPaid = Money.Zero;
            p.PurchasePricePaid = price;
            _sim.Notify($"Куплено приміщення {p.Address} за {price.Format()}.", Severity.Good);
            _sim.Changed();
            return OpResult.Success;
        }

        /// <summary>Розірвати оренду (повернути депозит) або продати власне приміщення за 95% ринкової ціни.</summary>
        public OpResult Release(string premisesId)
        {
            var p = S.City.GetPremises(premisesId);
            if (p == null || !p.IsControlledByPlayer) return OpResult.Fail("Це не ваше приміщення.");
            if (p.StoreId != null) return OpResult.Fail("Спершу закрийте магазин.");
            if (p.Tenure == Tenure.Rented)
            {
                S.Account.Credit(p.DepositPaid, TxCategory.DepositRefund, "Повернення депозиту " + p.Address, _sim.Day);
                _sim.Notify($"Оренду {p.Address} розірвано, депозит повернуто.");
            }
            else
            {
                var v = PurchasePrice(p) * 0.95;
                S.Account.Credit(v, TxCategory.PropertySale, "Продаж " + p.Address, _sim.Day);
                _sim.Notify($"Приміщення {p.Address} продано за {v.Format()}.", Severity.Good);
            }
            p.Tenure = Tenure.Available;
            p.DepositPaid = Money.Zero;
            p.PurchasePricePaid = Money.Zero;
            _sim.Changed();
            return OpResult.Success;
        }
    }
}
