using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class Statbook
    {
        public object ToJson()
        {
            return new
            {
                this.Comments,
                this.Deleted,
                this.ID,
                this.Name,
                this.NeedDescription,
                this.OrderNumber,
                this.DescriptionCaption,
                this.TypeID,
                this.SysName,
                this.Color
            };
        }

        //public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        //{
        //    e.Cancel = e.Action != EntityJs.Client.Events.ActionsEnum.Select;
        //}

        //public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        //{
        //}

        //public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        //{
        //}

        //public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        //{
        //}

        //public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        //{
        //}

        //public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        //{
        //}

        //public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        //{
        //}

        //public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        //{
        //}

        //public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        //{
        //}
    }
}