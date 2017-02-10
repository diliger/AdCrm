using EntityJs.Client.Objects;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AdCrm.Models
{
    public partial class Invoice : IEntity, ICreateEdit
    {

        public decimal PaidAmount
        {
            get
            {
                return this.Payments.Sum(val => val.Sum);
            }
        }

        public decimal LeftAmount
        {
            get
            {
                return this.Amount - PaidAmount;
            }
        }
        public object ToJson()
        {
            decimal paidAmount = PaidAmount;
            return new
            {
                this.Amount,
                this.ProjectID,
                this.Number,
                this.ID,
                this.Date,
                this.Creator,
                this.DrawnDate,
                this.Nulled,
                this.Comments,
                this.ChangeDate,
                PaidAmount = paidAmount,
                LeftAmount = LeftAmount
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            if (user.RoleID == (int)RolesEnum.Client)
            {
                e.Cancel = e.Action != EntityJs.Client.Events.ActionsEnum.Select || this.Project == null || this.Project.ContractorID != user.ContractorID;
            }
            else
            {
                e.Cancel = user.RoleID > (int)RolesEnum.Manager;
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
            BuildingEntities db = (BuildingEntities)e.Context;
            List<Payment> payments = Payments.ToList();
            foreach (Payment p in payments)
            {
                db.DeleteObject(p);
            }
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            if (this.Number.IsNullOrEmpty())
                Number = (this.DrawnDate ?? this.Date ?? DateTime.Now).ToShortDateString();
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            if (this.Number.IsNullOrEmpty())
                Number = (this.DrawnDate ?? this.Date ?? DateTime.Now).ToShortDateString();
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}