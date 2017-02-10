using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class Wallet : IEntity
    {
        public static string PersonalName = "Личный";
        public int PaymentsCount
        {
            get
            {
                return this.Payments.Count();
            }
        }

        public int ExpensesCount
        {
            get
            {
                return this.Expenses.Count();
            }
        }

        public object ToJson()
        {
            User user = HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser();
            string name = user.RoleID == (int)RolesEnum.Employee && this.EmployeeID == user.EmployeeID ? Wallet.PersonalName : this.Name;

            return new
            {
                this.ID,
                Name = name,
                //this.InvoicesCount,
                //this.PaymentsCount,
                //this.ExpensesCount,
                this.EmployeeID,
                this.Deleted,
                this.CreateDate,
                this.ChangeDate,
                this.CreatorID,
                this.ChangerID,
                Balance = user.RoleID == (int)RolesEnum.Employee ? 0 : this.Balance,
                this.TypeID,
                this.OrderNumber,
                this.InitialBalance
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = e.Action == EntityJs.Client.Events.ActionsEnum.Delete || e.Action != EntityJs.Client.Events.ActionsEnum.Select && this.TypeID == WalletTypesEnum.EmployeeWallet;
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            if (user.RoleID == (int)RolesEnum.Employee)
            {
                e.Cancel = e.Action != EntityJs.Client.Events.ActionsEnum.Select;// || this.EmployeeID != user.EmployeeID && !this.EmployeeWallets.Any(val => val.EmployeeID == user.EmployeeID && val.Available);
            }
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
            if (e.Values.ContainsKey("Balance"))
            {
                e.Values.Remove("Balance");
            }
        }

        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}