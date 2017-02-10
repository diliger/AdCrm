using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class TaskType : IEntity
    {
        public object ToJson()
        {
            return new
            {
                this.Comments,
                this.Deleted,
                this.ID,
                this.Name,
                this.ShortName,
                this.SortNumber,
                this.SysName,
                this.Code,
                this.Report,
                this.Duration
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
            this.SysName = this.Name.ReplaceRegex("[^A-Za-zА-Яа-я0-9]", "").ToLower();
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            this.SysName = this.Name.ReplaceRegex("[^A-Za-zА-Яа-я0-9]", "").ToLower();
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}