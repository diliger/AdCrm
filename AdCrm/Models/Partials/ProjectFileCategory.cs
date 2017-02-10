using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ProjectFileCategory : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.ID,
                this.Name,
                this.SysName,
                this.Deleted,
                this.OrderNumber
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            e.Cancel = e.Action == EntityJs.Client.Events.ActionsEnum.Delete||user.RoleID > (int)RolesEnum.Boss;
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
            if (this.SysName.IsNullOrEmpty())
            {
                this.SysName = Guid.NewGuid().ToString();
            }
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            if (this.SysName.IsNullOrEmpty())
            {
                this.SysName = Guid.NewGuid().ToString();
            }
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}