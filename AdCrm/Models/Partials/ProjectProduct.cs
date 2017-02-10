using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace Building.Models
{
    public partial class ProjectProduct : IEntity, ICreateEdit
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
                this.DispatchID,
                this.ProductID,
                this.Creator,
                this.Changer,
                this.CreateDate,
                this.ChangeDate,
                this.Comments,
                this.Price,
                this.ProductName,
                this.ProductCount
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;

            e.Cancel = false;
            if (e.Action != EntityJs.Client.Events.ActionsEnum.Select)
            {
                e.Values.Remove("CreatorID");
                if (user.RoleID != (int)RolesEnum.Admin && this.DispatchID > 0)
                {
                    ProjectDispatchOrder disp = this.ProjectDispatchOrder ?? db.ProjectDispatchOrders.Find(val => val.ID == this.DispatchID).FirstOrDefault();
                    e.Cancel = disp == null || user.ID != disp.CreatorID;
                }
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
            List<ProductDispatch> products = this.ProductDispatches.ToList();
            foreach (ProductDispatch p in products)
            {
                p.ProjectProductID = null;
                p.Deleted = true;
            }
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