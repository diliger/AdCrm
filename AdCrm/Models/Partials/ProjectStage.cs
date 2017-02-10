using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ProjectStage : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.ID,
                this.ProjectID,
                this.StageID
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = e.Action != EntityJs.Client.Events.ActionsEnum.Select && Project != null && Project.Archived;
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