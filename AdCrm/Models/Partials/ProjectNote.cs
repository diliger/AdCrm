using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ProjectNote : IEntity
    {
        public bool Frozen
        {
            get
            {
                return (DateTime.Now - Date).Days >= BuildingEntities.FrozenAfter;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.Text,
                this.ID,
                this.UserID,
                this.ProjectID,
                this.Date,
                this.Frozen,
                UserName = this.User != null ? this.User.FullName : string.Empty
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;

            e.Cancel = user.RoleID != (int)RolesEnum.Admin && Frozen && (e.Action == EntityJs.Client.Events.ActionsEnum.Edit || e.Action == EntityJs.Client.Events.ActionsEnum.Delete);
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;

            this.UserID = user.ID;
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