using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class Transfer : EntityJs.Client.Objects.IEntity
    {

        public bool Frozen
        {
            get
            {
                return (DateTime.Now - CreateDate).Days >= BuildingEntities.FrozenAfter;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.ID,
                this.WalletFromID,
                this.WalletToID,
                this.Date,
                this.AmountSent,
                this.AmountReceived,
                this.Ratio,
                this.Frozen,
                this.CreateDate,
                this.ChangeDate,
                this.Comments,
                WalletFromName = this.WalletFrom != null ? this.WalletFrom.Name : string.Empty,
                WalletToName = this.WalletTo != null ? this.WalletTo.Name : string.Empty
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = false;
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            Employee emp = db.CurrentEmployee;

            e.Cancel = user.RoleID != (int)RolesEnum.Admin && Frozen && (e.Action == EntityJs.Client.Events.ActionsEnum.Edit || e.Action == EntityJs.Client.Events.ActionsEnum.Delete);

            if (!e.Cancel && user.RoleID == (int)RolesEnum.Employee)
            {
                e.Cancel = this.WalletFromID != emp.WalletID && this.WalletToID != emp.WalletID || this.WalletFromID != emp.WalletID && e.Action != EntityJs.Client.Events.ActionsEnum.Select;
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