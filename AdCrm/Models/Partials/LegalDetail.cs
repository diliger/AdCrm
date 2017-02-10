using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class LegalDetail : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.BankAccount,
                this.BankBik,
                this.BankLoroAccount,
                this.BankName,
                this.Boss,
                this.ContractorID,
                this.FullName,
                this.ID,
                this.Inn,
                this.Kpp,
                this.LegalAddress,
                this.Name,
                this.Ogrn,
                this.RealAddress,
                this.Certificate,
                this.Accountant,
                this.Phone,
                this.Fax
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
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}