using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ContractorNote : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.ContractorID,
                this.CreatorID,
                this.Date,
                this.Description,
                this.ID,
                this.TypeID,
                DateTime = this.Date.ToString("dd.MM.yyyy HH:mm:ss"),
                TypeName = this.Type != null ? this.Type.Name : "",
                CreatorName = this.UserCreator != null ? this.UserCreator.FullName : ""
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
            if (!e.Values.ContainsKey("Date") || e.Values["Date"].StringAndTrim().IsNullOrEmpty())
            {
                this.Date = DateTime.Now;
            }
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}