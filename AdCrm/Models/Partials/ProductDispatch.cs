using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace Building.Models
{
    public partial class ProductDispatch : IEntity, ICreateEdit
    {
        public string ProductName
        {
            get
            {
                return this.Product != null ? this.Product.Name : string.Empty;
            }
        }

        public int ProductCount
        {
            get
            {
                return this.Product != null ? this.Product.Count : 0;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.Count,
                this.ID,
                this.ProductID,
                this.Creator,
                this.Changer,
                this.CreateDate,
                this.ChangeDate,
                this.Deleted,
                this.Comments,
                this.Price,
                this.ProductName,
                this.ProductCount,
                this.ProjectProductID,
                this.ProjectDispatchID
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