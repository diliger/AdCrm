using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class IncidentUser : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.ID,
                this.CreatorID,
                this.Comments,
                this.IncidentID,
                this.UserID, 
                this.Done,
                this.Custom
            };
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            switch (e.Action)
            {
                case EntityJs.Client.Events.ActionsEnum.Insert:
                case EntityJs.Client.Events.ActionsEnum.Select: e.Cancel = !this.Custom; break;
                case EntityJs.Client.Events.ActionsEnum.Delete: e.Cancel = this.CreatorID != user.ID && user.RoleID > (int)RolesEnum.Boss; break;
                case EntityJs.Client.Events.ActionsEnum.Edit: e.Cancel = true; break;
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