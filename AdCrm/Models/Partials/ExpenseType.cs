using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ExpenseType : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.Deleted,
                this.ID,
                this.Name,
                this.OrderNumber,
                this.PeriodID,
                this.Comments,
                this.Price,
                this.UnitName,
                this.ForBalance,
                this.CategoryID,
                this.DefaultWalletID,
                this.WalletEditable,
                this.ManagerFee,
                this.ForSalary,
                WalletName = this.Wallet != null ? this.Wallet.Name : string.Empty
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = e.Action == EntityJs.Client.Events.ActionsEnum.Delete;
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
            if (e.Values.ContainsKey("PeriodID"))
            {
                e.Values.Remove("PeriodID");
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