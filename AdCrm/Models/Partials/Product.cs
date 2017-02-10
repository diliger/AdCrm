using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace Building.Models
{
    public partial class Product : IEntity, ICreateEdit
    {
        public object ToJson()
        {
            return new
            {
                this.ID,
                this.Name,
                this.Count,
                this.SysName,
                this.OuterID,
                this.Description,
                this.Creator,
                this.Changer,
                this.CreateDate,
                this.ChangeDate,
                this.Price,
                this.PriceSell
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = e.Action > EntityJs.Client.Events.ActionsEnum.Edit;
            if (e.Action == EntityJs.Client.Events.ActionsEnum.Edit)
            {
                e.Values.Remove("Count");
                e.Values.Remove("OuterID");
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