using EntityJs.Client.Objects;
using System.Linq;

namespace AdCrm.Models
{
    public partial class Payment : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.Sum,
                this.RoleID,
                this.ProjectID,
                this.Number,
                this.ID,
                this.Date,
                this.CreatorID,
                this.Comments,
                this.WalletID,
                //this.WorkID,
                this.IsAdvance,
                this.ContractorID,
                this.InvoiceID,
                WalletName = this.Wallet != null ? this.Wallet.Name : string.Empty,
                InvoiceNumber = this.Invoice != null ? this.Invoice.Number : string.Empty
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = false;
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
            BuildingEntities db = (BuildingEntities)e.Context;
            if (!this.InvoiceID.HasValue && this.Number.IsNotNullOrEmpty() && this.Project != null && this.RoleID == PaymentRolesEnum.FromCustomer)
            {
                this.Invoice = db.Invoices.FirstOrDefault(val => val.ProjectID == this.ProjectID && val.Number == this.Number);
            }
            else if (this.InvoiceID.HasValue && this.Number.IsNullOrEmpty())
            {
                Invoice invoice = this.Invoice ?? db.Invoices.Find(val => val.ID == this.InvoiceID).FirstOrDefault();
                if (invoice != null)
                    this.Number = invoice.Number;
            }
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            if (!this.InvoiceID.HasValue && this.Number.IsNotNullOrEmpty() && this.Project != null && this.RoleID == PaymentRolesEnum.FromCustomer)
            {
                this.Invoice = db.Invoices.FirstOrDefault(val => val.ProjectID == this.ProjectID && val.Number == this.Number);
            }
            else if (this.InvoiceID.HasValue && this.Number.IsNullOrEmpty())
            {
                Invoice invoice = this.Invoice ?? db.Invoices.Find(val => val.ID == this.InvoiceID).FirstOrDefault();
                if (invoice != null)
                    this.Number = invoice.Number;
            }
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}